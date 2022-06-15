import { isRef, Ref } from "../reactive/ref"
import { ComputedRef } from "../reactive/computed"
import { EMPTY_OBJ, hasChange, isArray, isFunction, NOOP, isObject, isPlainObject, isSet, isMap } from "../shared"
import { DebuggerOptions, EffectScheduler, ReactiveEffect } from "../reactive/effect"
import { SchedulerJob } from "./scheduler"
import { isReactive, ReactiveFlags } from "../reactive/reactive"
import { resolvedPromise } from "./scheduler";
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

// watchEffect 实现，和watch的区别是：没有callback函数
export function watchEffect(effect: WatchEffect, options?: WatchOptionsBase) {
  doWatch(effect, null, options)
}

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
  let forceTrigger = false // flag 强制触发
  let isMultiSource = false // flag, source = [ value, value2 ]这种情况
  if (isRef(source)) { // ref
    getter = () => source.value
    // let forceTrigger = !!source._shallow
  } else if (isReactive(source)) { // reactive
    getter = () => source
    deep = true
  } else if (isArray(source)) { // array
    isMultiSource = true
    // 数组里有一个值是reactive的。就强制触发更新
    forceTrigger = source.some(s => isReactive(s))
    getter = () => source.map(s => {
      // 根据不同的情况返回不同的值
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        return traverse(s)
      } else if (isFunction(s)) {
        return s()
      }
    })
  } else if (isFunction(source)) { // function
    if (cb) { // watch函数
      // @ts-ignore
      getter = () => source()
    } else { // 没有callback就是一个watchEffect
      getter = () => {
        // @ts-ignore
        return source()
      }
    }
  } else {
    getter = NOOP
  }

  const onInvalidate = () => {}

  let oldValue = isMultiSource ? [] : {}
  const job: SchedulerJob = () => {
    if (cb) { // watch(source, callback)
      const newValue = effect.run()
      // 自己提出一个函数，源码里太长了不好阅读，功能一样
      const _hasChange = () => {
        return isMultiSource
          ? newValue.some((v: any, i: number) => hasChange(v, (oldValue as any[])[i]))
          : hasChange(newValue, oldValue)
      }
      // 新旧值有变化才触发回调
      if (deep || forceTrigger || _hasChange()) {
        cb(newValue, oldValue, onInvalidate)

        oldValue = newValue
      }
    } else { // watchEffect
      effect.run()
    }
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let scheduler: EffectScheduler = () => {
    // 源码里是放在队列里执行的，这里简单放在微任务里。
    // 目的防止同一个宏任务连续修改监听源，多次触发回调函数执行
    resolvedPromise.then(() => {
      job()
    })
  }
  const effect = new ReactiveEffect(getter, scheduler)

  if (cb) {
    // 先主动获取下，拿到旧值
    oldValue = effect.run()
  } else { // watchEffect
    effect.run()
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
