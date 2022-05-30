import { Dep, createDep } from "./dep";
import { isArray } from "../shared";

type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// 当前活跃的 reactiveEffect 实例
let activeEffect: ReactiveEffect | undefined


export function effect<T>(fn: () => T) {// fn 会立即执行

  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

export function track(target: object, key: unknown) {
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

export function trigger(target: object, key: unknown) {

  // 从集合中拿不到deps 就不用派发更新了
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const deps: (Dep | undefined)[] = []
  deps.push(depsMap.get(key))


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
  dep.add(activeEffect!)
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
  run() {
    // 设置activeReact为当前实例，这样就可以被别的属性收集为依赖了
    activeEffect = this
    this.fn()
    //  收集完成后，记得清空
    activeEffect = undefined
  }
}

