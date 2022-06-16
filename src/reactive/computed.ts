import { Ref, triggerRefValue, trackRefValue } from "./ref";
import { ReactiveEffect } from "./effect";
import { isFunction, NOOP } from "../shared";
import { ReactiveFlags, toRaw } from "./reactive";
import { Dep } from "./dep";

/********** TS类型声明 start ***********/
export type ComputedGetter<T> = (...args: any[]) => T
type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}

export interface ComputedRef<T> extends WritableComputedRef<any> {
  readonly value: T
}
/********** TS类型声明 end ***********/

class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  private _value!: T
  private _dirty = true // _dirty为false不会执行getter函数
  public readonly effect: ReactiveEffect<T>
  public readonly __v_isRef = true // ref标记
  // @ts-ignore
  public readonly [ReactiveFlags.IS_READONLY]: boolean

  constructor(getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>, isReadonly: boolean) {
    // ReactiveEffect如果传入scheduler调度器函数，则更新时调用scheduler函数。不调用run方法了
    // 这里的run方法可以看成getter函数，执行run方法是调用了getter
    this.effect = new ReactiveEffect(getter, () => {
      // 2.当computed所依赖的值更新时，会触发scheduler, 来设置 dirty = true
      // 2.1 _dirty 被置为true, 当访问computed属性时，会重新求值
      if (!this._dirty) {
        // _dirty 置为 true
        this._dirty = true
        // 触发依赖更新
        triggerRefValue(this)
      }
    })
    // readonly 只读属性标记
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  get value () {
    const self = toRaw(this)
    trackRefValue(self)
    // computed的惰性求值关键就在这里
    // 1、假如已经求过值了，下次再访问computed，直接返回_value
    // 1.1 等_dirty被置为true时，会再次求值, 并重新赋值_value
    if (self._dirty) {
      // _dirty 置为 false
      self._dirty = false
      // 获取新值
      self._value = self.effect.run()!
    }
    return self._value
  }
  set value (newValue: T) {
    this._setter(newValue)
  }
}

export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
export function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>)  {

  // 声明getter/setter函数
  let get: ComputedGetter<T>
  let set: ComputedSetter<T>

  // 规范化下getter/setter
  if (isFunction(getterOrOptions)) {
    // 只有一个函数的情况下, setter被设置为一个空函数
    get = getterOrOptions
    set = NOOP
  } else {
    // 拿到getter/setter
    get = getterOrOptions.get
    set = getterOrOptions.set
  }

  // 只有一个set函数，标记为只读属性--readonly
  const isReadonly = isFunction(getterOrOptions) || !getterOrOptions.get
  const cRef = new ComputedRefImpl(get, set, isReadonly)
  return cRef as any
}
