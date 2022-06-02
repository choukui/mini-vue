import { def, isObject, toRawType } from "../shared";
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from "./baseHandlers";
import { mutableCollectionHandlers, readonlyCollectionHandlers, shallowCollectionHandlers } from "./collectionHandlers";
import { Ref, UnwrapRefSimple } from "./ref";

export enum ReactiveFlags {
  RAW = '__v_raw', // 标记原始数据
  IS_READONLY = '__v_isReadonly', // 标记只读数据
  IS_REACTIVE = '__v_isReactive',
  SKIP = '__v_skip'
}

export interface Target {
  [ReactiveFlags.RAW]?: any
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.SKIP]?: boolean
}

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>
// readonly
type Primitive = string | number | boolean | bigint | symbol | undefined | null
type Builtin = Primitive | Function | Date | Error | RegExp
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends WeakMap<infer K, infer V>
        ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : T extends WeakSet<infer U>
              ? WeakSet<DeepReadonly<U>>
              : T extends Promise<infer U>
                ? Promise<DeepReadonly<U>>
                : T extends {}
                  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                  : Readonly<T>

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

/*
* Object.isExtensible() 判断一个对象是否是可扩展的（是否可以在它上面添加新的属性）
* */
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

// 都是存储缓存用的
export const reactiveMap = new WeakMap<Target, any>()
export const shallowReactiveMap = new WeakMap<Target, any>()
export const readonlyMap = new WeakMap<Target, any>()
export const shallowReadonlyMap = new WeakMap<Target, any>()

function createReactiveObject(
  target: Target,
  isReadonly: boolean, // 是否只读
  baseHandlers: ProxyHandler<any>, // 处理普通对象数组的 proxy 的 handle
  collectionHandlers: ProxyHandler<any>, // 处理普Map WeakMap Set WeakMap 的 proxy 的 handle
  proxyMap: WeakMap<Target, any> // 缓存
) {
  // 不是对象直接返回原目标
  if (!isObject(target)) {
    return target
  }
  // 如果是个响应式直接返回响应式对象， readonly() 创建的响应式对象除外
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }
  // 先从缓存中查找
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return  existingProxy
  }

  // 如果target是被标记为原始数据 INVALID = 0
  // __v_skip 也不会成为响应式
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }

  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers: baseHandlers
  )
  // 存入缓存中，下次就直接从缓存读取
  proxyMap.set(target, proxy)
  return proxy
}

// reactive实现
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // 如果是个readonlyReactive就直接返回
  if (target && (target as Target)[ReactiveFlags.IS_READONLY]) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

// 浅响应，只有根对象是响应式的
export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}

export function shallowReadonly<T extends object>(target: T): Readonly<{ [K in keyof T]: UnwrapNestedRefs<T[K]> }> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyHandlers,
    shallowReadonlyMap
  )
}

export function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>> {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}

// __v_isReadonly 代表是个只读属性
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}

// __v_isReactive 代表是个响应式对象
// __v_raw 未经加工的对象
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

// 是否是个响应式对象
export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

// 返回响应式对象的原始数据
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as  Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}

// 标记一个对象不会被转化为响应式
export function markRaw<T extends object>(value: T): T {
  // 对象设置__v_skip属性，就不会变成响应式
  def(value, ReactiveFlags.SKIP, true)
  return value
}
