import { Target } from "./reactive";
import { track, trigger } from "./effect";

export const mutableHandlers: ProxyHandler<object> = {
  get(target: Target, key: string | symbol, receiver: any): any {
    const res = Reflect.get(target, key, receiver)
    track(target, key)
    return res
  },
  set(target: Target, key: string | symbol, value: any, receiver: any): boolean {
    const res = Reflect.set(target, key, value, receiver)
    // 派发更新
    trigger(target, key)
    return res
  }
}

export const mutableCollectionHandlers = {}
