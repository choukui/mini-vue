import { Dep, createDep } from "./dep";
import { isArray } from "../shared";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
// import { isIntegerKey } from "../shared";

type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// 当前活跃的 reactiveEffect 实例
let activeEffect: ReactiveEffect | undefined

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

let shouldTrack = true
const trackStack: boolean[] = []

// 暂停收集
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

// 重置为上一次的状态
export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
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

export function track(target: object, type:TrackOpTypes, key: unknown) {
  if (!isTracking()) {
    return
  }
  /* 初始化 dep start */
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, ( dep = createDep() ))
  }
  /* 初始化 dep start */

  // 开始收集依赖
  trackEffects(dep)
}

export function trigger(target: object, type: TriggerOpTypes, key: unknown, newValue?: unknown) {

  // 从集合中拿不到deps 就不用派发更新了
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
    // if (key !== void 0) {
      deps.push(depsMap.get(key))
    // }


    // switch (type) {
    //   case TriggerOpTypes.ADD:
    //     if (isIntegerKey(key)) {
    //       // new index added to array -> length changes
    //       deps.push(depsMap.get('length'))
    //     }
    //     break
    //   case TriggerOpTypes.DELETE:
    //     break
    //   case TriggerOpTypes.SET:
    //     break
    // }
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
    dep.add(activeEffect!)
  }
}

// 更新依赖
export function triggerEffect(dep: Dep | ReactiveEffect[]) {
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    // 判断是不是当前activeReactive
    if (effect !== activeEffect) {
      effect.run()
    }
  }
}

export class ReactiveEffect<T = any> {
  constructor(public fn:() => T) {}
  deps: Dep[] = []
  run() {
    // 设置activeReact为当前实例，这样就可以被别的属性收集为依赖了
    activeEffect = this
    this.fn()
    //  收集完成后，记得清空
    activeEffect = undefined
  }
}

