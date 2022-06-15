import { isRef, Ref } from "../reactive/ref"
import { ComputedRef } from "../reactive/computed"
import { EMPTY_OBJ, hasChange, isArray, isFunction, NOOP, isObject, isPlainObject, isSet, isMap } from "../shared"
import { DebuggerOptions, EffectScheduler, ReactiveEffect } from "../reactive/effect"
import { SchedulerJob } from "./scheduler"
import { isReactive, ReactiveFlags } from "../reactive/reactive"
import { currentInstance } from "./component"

/********** TS类型声明 start ***********/

type InvalidateCbRegistrator = (cb: () => void) => void

export type WatchEffect = (onInvalidate: InvalidateCbRegistrator) => void

export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T)

export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onInvalidate: InvalidateCbRegistrator
) => any
export interface WatchOptionsBase extends DebuggerOptions {
  flush?: 'pre' | 'post' | 'sync'
}
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  deep?: boolean
}

export type WatchStopHandle = () => void

type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true
      ? V | undefined
      : V
    : T[K] extends object
      ? Immediate extends true
        ? T[K] | undefined
        : T[K]
      : never
}

type MultiWatchSources = (WatchSource<unknown> | object)[]
/********** TS类型声明 end ***********/

// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: multiple sources w/ `as const`
// watch([foo, bar] as const, () => {})
// somehow [...T] breaks when the type is readonly
export function watch<
  T extends Readonly<MultiWatchSources>,
  Immediate extends Readonly<boolean> = false
  >(
  source: T,
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: watching reactive object w/ cb
export function watch<
  T extends object,
  Immediate extends Readonly<boolean> = false
  >(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  return doWatch(source as any, cb, options)
}

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {

  let getter: () => any
  // let forceTrigger = false
  if (isRef(source)) { // ref
    getter = () => source.value
    // let forceTrigger = !!source._shallow
  } else if (isReactive(source)) { // reactive
    getter = () => source
    deep = true
  } else if (isArray(source)) { // array
    getter = NOOP
  } else if (isFunction(source)) { // function
    if (cb) {
      // @ts-ignore
      getter = () => source()
    } else {
      getter = NOOP
    }
  } else {
    getter = NOOP
  }

  const onInvalidate = () => {}

  let oldValue = {}
  const job: SchedulerJob = () =>{
    if (cb) {
      const newValue = effect.run()
      // 新旧值有变化才触发回调
      if (deep || hasChange(newValue, oldValue)) {
        cb(newValue, oldValue, onInvalidate)

        oldValue = newValue
      }
    }
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let scheduler: EffectScheduler = () => {
    job()
  }
  const effect = new ReactiveEffect(getter, scheduler)

  if (cb) {
    // 先主动获取下，拿到旧值
    oldValue = effect.run()
  }
  return function () {
    //  effect stop
  }
}

// 这块直接从源码复制过来的，没看懂这块的作用,
// todo 待深入研究这块的作用
export function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }
  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  if (isRef(value)) {
    traverse(value.value, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse((value as any)[key], seen)
    }
  }
  return value
}
