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
export function watchEffect(effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle {
  return doWatch(effect, null, options)
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
/*
* 通常watch函数接收两个参数
* source: 响应式数据
* cb: 回调函数*/
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {

  let getter: () => any // 定义getter
  let forceTrigger = false // flag 强制触发
  let isMultiSource = false // flag, source = [ value, value2 ]这种情况
  if (isRef(source)) { // ref
    getter = () => source.value
    // let forceTrigger = !!source._shallow
  } else if (isReactive(source)) { // reactive
    getter = () => source
    deep = true
  } else if (isArray(source)) { // array 多数据源的侦听
    isMultiSource = true
    // 数组里有一个值是reactive的。就强制触发更新
    forceTrigger = source.some(s => isReactive(s))
    getter = () => source.map(s => {
      // 根据不同的情况返回不同的值
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        // 调用traverse递归读取
        return traverse(s)
      } else if (isFunction(s)) {
        return s()
      }
    })
  } else if (isFunction(source)) { // 如果 source 是函数，说明用户传入的是 getter, 直接把 source 赋值给 getter
    if (cb) { // watch函数
      getter = () => source(onInvalidate)
    } else { // 没有callback就是一个watchEffect
      getter = () => {
        if (cleanup) {
          cleanup()
        }
        return source(onInvalidate)
      }
    }
  } else {
    getter = NOOP
  }

  // 深度侦听 deep
  if (cb && deep) {
    const baseGetter = getter
    // 递归遍历getter函数的返回值
    getter = () => traverse(baseGetter())
  }

  // 侦听器被停止时
  // 清除副作用 watchEffect(fn, (onInvalidate) => { onInvalidate(cleanup)})
  let cleanup: () => void
  // 定义失效时需要传参的函数
  const onInvalidate: InvalidateCbRegistrator = (fn: () => void) => {
    // 执行用户传进来的fn函数
    cleanup = effect.onStop = () => {
      fn()
    }
  }

  let oldValue = isMultiSource ? [] : {} // 储存旧值
  const job: SchedulerJob = () => {
    if (!effect.active) { // effect stop 不用执行
      return
    }
    if (cb) { // eg: watch(source, callback)
      const newValue = effect.run() // 在 scheduler 中重新执行副作用函数，获取新值
      // 自己提出一个函数，源码里太长了不好阅读，功能一样
      const _hasChange = () => {
        return isMultiSource
          ? newValue.some((v: any, i: number) => hasChange(v, (oldValue as any[])[i]))
          : hasChange(newValue, oldValue)
      }
      // 新旧值有变化才触发回调
      if (deep || forceTrigger || _hasChange()) {
        //在调用回调函数cb之前 先调用过期回调cleanup
        if (cleanup) {
          cleanup()
        }
        // 给回调函数传入新旧两个值，并将 onInvalidate 作为回调函数的第三个参数，以便用户调用
        cb(newValue, oldValue, onInvalidate)
        // 更新旧值，不然下次会得到错误的旧值
        oldValue = newValue
      }
    } else { // watchEffect(effect) 直接run
      effect.run()
    }
  }

  // 当数据变化时执行调度器(pre类型)
  let scheduler: EffectScheduler = () => {
    // 源码里是放在队列里执行的，这里简单放在微任务里。
    // 目的防止同一个宏任务多个状态改变，多次触发回调函数执行
    resolvedPromise.then(() => {
      job()
    })
  }

  // effect.run方法执行，就是执行getter
  const effect = new ReactiveEffect(getter, scheduler)

  if (cb) {
    if (immediate) { // immediate 立即执行
      job()
    } else {
      // 手动调用下副作用函数，获取旧值
      oldValue = effect.run()
    }
  } else { // watchEffect
    effect.run()
  }
  // 返回一个函数，用于停止侦听
  return function () {
    //  effect stop
    effect.stop()
  }
}

// 递归读取对象的每一个属性
// seen 是用于防止递归陷入死循环
export function traverse(value: unknown, seen?: Set<unknown>) {
  // 如果是读取的原始值，什么都不做
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }
  seen = seen || new Set()
  // 如果已经被读取过了，同样什么也不做
  if (seen.has(value)) {
    return value
  }
  // 将数据添加到seen中，代表遍历读取过了。避免循环引用引起死循环
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
    // 如果是一个普通对象，使用for in 读取对象的每一个值，并递归地调用traverse进行处理
    for (const key in value) {
      traverse((value as any)[key], seen)
    }
  }
  return value
}
