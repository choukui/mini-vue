import { Dep } from "./dep";
import { isArray } from "../shared";

// 当前活跃的 reactiveEffect 实例
let activeEffect: ReactiveEffect | undefined


export function effect<T>(fn: () => T) {// fn 会立即执行

  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

/*
* 收集 Effect 依赖
*  */
export function trackEffects(dep: Dep) {
  dep.add(activeEffect!)
}

// 更新依赖
export function triggerEffect(dep: Dep) {
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

