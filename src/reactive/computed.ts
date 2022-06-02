import { Ref, triggerRefValue, trackRefValue } from "./ref";
import { ReactiveEffect } from "./effect";
import { isFunction, NOOP } from "../shared";
import { ReactiveFlags, toRaw } from "./reactive";
import { Dep } from "./dep";

type ComputedGetter<T> = (...args: any[]) => T
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

class ComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  private _dirty = true
  public readonly effect: ReactiveEffect<T>
  public readonly __v_isRef = true
  // @ts-ignore
  public readonly [ReactiveFlags.IS_READONLY]: boolean

  constructor(getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>, isReadonly: boolean) {
    this.effect = new ReactiveEffect(getter, () => {
      // console.log(this.dep);
      // debugger
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  get value () {
    const self = toRaw(this)
    trackRefValue(self)
    if (self._dirty) {
      self._dirty = false
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

  let get: ComputedGetter<T>
  let set: ComputedSetter<T>

  if (isFunction(getterOrOptions)) {
    get = getterOrOptions
    set = NOOP
  } else {
    get = getterOrOptions.get
    set = getterOrOptions.set
  }

  // 只有一个set函数，标记为readonly
  const isReadonly = isFunction(getterOrOptions) || !getterOrOptions.get
  const cRef = new ComputedRefImpl(get, set, isReadonly)
  return cRef as any
}
