import {reactive, ReactiveFlags, Target} from "./reactive";
import { track, trigger } from "./effect";
import { isObject } from "../shared";

function createGetter() {
  return function get (target: Target, key: string | symbol, receiver: any): any {
    /*
    * 处理像这种情况的访问 target['__v_isReactive']
    * 当判断是不是一个reactive是有用，例如 isReactive() 函数
    * */
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    const res = Reflect.get(target, key, receiver)
    track(target, key)
    if (isObject(res)) {
      return reactive(res)
    }

    return res
  }
}

export const mutableHandlers: ProxyHandler<object> = {
  get: createGetter(),
  set(target: Target, key: string | symbol, value: any, receiver: any): boolean {
    const res = Reflect.set(target, key, value, receiver)
    // 派发更新
    trigger(target, key)
    return res
  }
}

export const mutableCollectionHandlers = {}
