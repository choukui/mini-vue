import { Dep, createDep } from "./dep";
import { isArray } from "../shared";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import { isIntegerKey } from "../shared";

type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

const effectStack: ReactiveEffect[] = []
// 当前活跃的 reactiveEffect 实例
let activeEffect: ReactiveEffect | undefined

export type EffectScheduler = (...args: any[]) => any

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

let shouldTrack = true
const trackStack: boolean[] = []

/*
* 暂停收集
* 将上一次的的shouldTrack状态push到 trackStack
* shouldTrack = false 暂停track收集
* */
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

/*
* 恢复track
* 重置为上一次的状态
* */
export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

// 用来判断是否可以收集依赖
export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

export function effect<T>(fn: () => T): ReactiveEffectRunner {// fn 会立即执行

  // 如果上一次调用过，会拿到上次的fn函数
  // 暂时不清楚为什么这么做。
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }
  const _effect = new ReactiveEffect(fn)
  _effect.run()

  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  // 保存上一次的ReactiveEffect
  runner.effect = _effect
  return runner
}

// track 负责进行依赖收集
export function track(target: object, type:TrackOpTypes, key: unknown) {
  if (!isTracking()) {
    return
  }
  /* 初始化 dep start */
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 获取下dep, 如果没有就创建一个新的
  // dep = new Set()
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, ( dep = createDep() /* 初始化 dep */ ))
  }

  // 开始收集依赖
  trackEffects(dep)
}

// trigger 负责进行派发更新
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  // 1、尝试从weakMap中获取target 对应的 depsMap
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }


  const deps: (Dep | undefined)[] = []
  // if (key === 'length' && isArray(target)) {
  //   depsMap.forEach((dep, key) => {
  //     if (key === 'length' || key >= (newValue as number)) {
  //       deps.push(dep)
  //     }
  //   })
  // } else {
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }
  // }
    switch (type) {
      case TriggerOpTypes.ADD:
        if (isIntegerKey(key)) {
          // 向数组push新值时，length更新了
          // 那只要调用 length 的dep就能行
          deps.push(depsMap.get('length'))
        }
        break
    //   case TriggerOpTypes.DELETE:
    //     break
    //   case TriggerOpTypes.SET:
    //     break
    }
  // }


  if (deps.length === 1) { //只有一个时, 不循环。节省性能
    if (deps[0]) {
      triggerEffect(deps[0])
    }
  } else {
    const effects: ReactiveEffect[] = []
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep)
      }
    }
    // 派发更新
    triggerEffect(createDep(effects))
  }
}

/*
* 收集 Effect 依赖
*  */
export function trackEffects(dep: Dep) {
  if (shouldTrack) {
    // 添加当前activeEffect到dep
    dep.add(activeEffect!)
  }
}

// 更新依赖
export function triggerEffect(dep: Dep | ReactiveEffect[]) {
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    // 判断是不是当前activeReactive
    if (effect !== activeEffect) {
      // 派发更新时，优先执行调度器方法，没有的话再执行run
      if (effect.scheduler) {
        effect.scheduler()
      } else {
        effect.run()
      }
    }
  }
}

export class ReactiveEffect<T = any> {
  active = true // flag 是否活跃Effect
  onStop?: () => void
  constructor(public fn:() => T, public scheduler: EffectScheduler | null = null) {}
  deps: Dep[] = []
  run() {
    if (!this.active) { // stop
      return this.fn()
    }
    // 设置activeReact为当前实例，这样就可以被别的属性收集为依赖了
    if (!effectStack.includes(this)) {
      try {
        effectStack.push((activeEffect = this))
        enableTracking()
        return this.fn()
      } finally {
        resetTracking()
        effectStack.pop()
        /*
        * 收集完 activeEffect 后，如果 effectStack 还有 ReactiveEffect
        * 把当前activeEffect指向前一个effect
        * 再effect 嵌套时会出现收集问题。
        * TODO 待深入研究，暂时还没缕清思路
        * */
        const n = effectStack.length
        activeEffect = n > 0 ? effectStack[n - 1] : undefined
      }
    }

  }

  stop() {
    if (this.active) {
      cleanupEffect(this) // 清除所有监听
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

// 清除监听器
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
