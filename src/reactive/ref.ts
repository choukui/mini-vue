import { Dep, createDep } from "./dep"
import { CollectionTypes } from './collectionHandlers'
import { trackEffects, triggerEffect, isTracking } from "./effect"
import { isReactive, reactive, toRaw } from "./reactive"
import { hasChange, isArray, isObject } from "../shared"
type BaseTypes = string | number | boolean
export interface RefUnwrapBailTypes {}

/******** TS类型声明 start *********/
export type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>

export type ShallowUnwrapRef<T> = {
  [K in keyof T]: T[K] extends Ref<infer V>
    ? V
    : T[K] extends Ref<infer V> | undefined // if `V` is `unknown` that means it does not extend `Ref` and is undefined
      ? unknown extends V
        ? undefined
        : V | undefined
      : T[K]
}

export type UnwrapRefSimple<T> = T extends
  | Function
  | CollectionTypes
  | BaseTypes
  | Ref
  | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
  ? T
  : T extends Array<any>
    ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
    : T extends object
      ? {
        [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
      }
      : T

type RefBase<T> = {
  dep?: Dep
  value: T
}

export type ToRef<T> = [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export type ToRefs<T = any> = {
  // #2687: somehow using ToRef<T[K]> here turns the resulting type into
  // a union of multiple Ref<*> types instead of a single Ref<* | *> type.
  [K in keyof T]: T[K] extends Ref ? T[K] : Ref<UnwrapRef<T[K]>>
}

export interface Ref<T = any> {
  value: T
  _shallow?: boolean
}

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void
) => {
  get: () => T
  set: (value: T) => void
}
/******** TS类型声明 end *********/


// 判断是否是ref
export function isRef(r: any): r is Ref {
  return Boolean(r && r.__v_isRef === true)
}

// 解包
export function unref<T>(ref:T | Ref<T>): T {
  return isRef(ref) ? ref.value : ref
}

// 浅渲染, 创建一个跟踪自身 .value 变化的 ref，但不会使其值也变成响应式的。
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}

// toRef 可以用来为源响应式对象上的某个 property 新创建一个 ref。然后，ref 可以被传递，它会保持对其源 property 的响应式连接。
export function toRef<T extends object, K extends keyof T>(object: T, key: K): ToRef<T[K]> {
  return isRef(object[key]) ? object[key] : (new ObjectRefImpl(object, key) as any)
}

// toRefs 将响应式对象转换为普通对象，其中结果对象的每个 property 都是指向原始对象相应 property 的 ref
export function toRefs<T extends object>(object: T): ToRefs<T> {
  const res: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    res[key] = toRef(object, key)
  }
  return res
}
//customRef 创建一个自定义的 ref，并对其依赖项跟踪和更新触发进行显式控制
export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}

class CustomRefImpl<T> {
  public dep?: Dep = undefined

  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  public readonly __v_isRef = true

  constructor(factory: CustomRefFactory<T>) {
    const { set, get } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    )

    this._set = set
    this._get = get
  }

  get value() {
    return this._get()
  }

  set value(newVal) {
    this._set(newVal)
  }
}

// 触发Ref依赖收集
export function triggerRefValue(ref: RefBase<any>) {
  if (ref.dep) {
    triggerEffect(ref.dep)
  }
}
// 收集Ref依赖
export function trackRefValue(ref: RefBase<any>) {
  /**
   * 判断是否可以收集依赖
   * eg: readonly(ref(1))
   * 因为readonly 不会 track 所以全局 activeReactive = undefined
   * 所有 ref 也就不用track
   * */
  if (isTracking()) {
    if (!ref.dep) { // 如果没有dep 初始化一个set
      ref.dep = createDep()
    }
    trackEffects(ref.dep)
  }
}

function cover<T extends unknown>(value: T) {
  // 对象转换reactive
  return isObject(value) ? reactive(value) : value
}

class RefImpl<T> {
  private _value: T // 实际存储的地方
  private _rawValue: T // 原始值
  public dep?: Dep = undefined // 存储依赖，Set结构
  public readonly __v_isRef = true // ref 标记
  /*
  * shallow true 浅渲染， false 深渲染
  *  */
  constructor(value: T, public readonly _shallow = false) {
    this._rawValue = this._shallow ? value : toRaw(value)
    // cover函数 如果是个对象调用reactive方法，不是的话。返回原值
    // 浅渲染直接返回原始值不做reactive转换
    this._value = this._shallow ? value : cover(value)
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value;
  }

  set value(newValue) {
    // 转换为原始数据再做比较
    newValue = this._shallow ? newValue : toRaw(newValue)
    // 值不同，再触发更新，新旧值相同不会触发更新
    if (hasChange(newValue, this._rawValue)) {
      // 必须先赋值再触发依赖更新，否则拿到的是旧值
      this._value = this._shallow ? newValue : cover(newValue);
      this._rawValue = newValue;
      // 派发依赖更新
      triggerRefValue(this)
    }
  }
}

// 这块实现比较巧妙，toRef本质上还是reactive对象。这里中间做了一层代理
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  constructor(private readonly _object: T, private readonly _key: K) {}
  get value () {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}
/*
* shallow true 浅渲染， false 深渲染
*  */
function createRef(rawValue: any, shallow = false) {
  // 如果已经是Ref了，直接返回就行了
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

// ref 实现
export function ref(value?:unknown) {
  return createRef(value)
}

// 解包ref
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set(target: any, key: string | symbol, value: any, receiver: any): boolean {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}

// 对普通对象里的ref值进行解包
// 在处理setup返回结果是用到了
export function proxyRefs<T extends object>(objectWithRefs: T): ShallowUnwrapRef<T> {
  // reactive不处理(reactive已经处理过ref解包), 只处理普通对象的ref键值
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
