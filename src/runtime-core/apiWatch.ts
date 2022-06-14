import { isRef, Ref } from "../reactive/ref"
import { ComputedRef } from "../reactive/computed"
import {EMPTY_OBJ, NOOP} from "../shared"
import {DebuggerOptions, EffectScheduler, ReactiveEffect,} from "../reactive/effect"
import { SchedulerJob } from "./scheduler";

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
/********** TS类型声明 end ***********/

// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
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
  let forceTrigger = false
  if (isRef(source)) {
    getter = () => source.value
    let forceTrigger = !!source._shallow
  } else {
    getter = NOOP
  }

  let oldValue = {}

  const job: SchedulerJob = () =>{
    if (cb) {
      const newValue = effect.run()
      cb(newValue, oldValue, ()=>{})
      oldValue = newValue
    }
  }

  let scheduler: EffectScheduler = () => {
    job()
  }

  const effect = new ReactiveEffect(getter, scheduler)

  if (cb) {
    oldValue = effect.run()
  }
  return function () {
    //  effect stop
  }
}
