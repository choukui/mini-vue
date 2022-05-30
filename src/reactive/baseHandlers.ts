import {reactive, ReactiveFlags, Target} from "./reactive";
import { track, trigger } from "./effect";
import { isObject } from "../shared";
import {isRef} from "./ref";

function createGetter(isReadonly = false, shallow = false) {
  return function get (target: Target, key: string | symbol, receiver: any): any {
    /*
    * 处理像这种情况的访问 target['__v_isReactive']
    * 当判断是不是一个reactive是有用，例如 isReactive() 函数
    * */
    if (key === ReactiveFlags.IS_REACTIVE) { // '__v_isReactive'
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) { // '__v_isReadonly'
      return isReadonly
    }

    const res = Reflect.get(target, key, receiver)

    track(target, key)

    /*
    * 处理嵌套的ref(), 也叫做解包ref
    * 例如 reactive({ foo: ref('foo')})
    * */
    if (isRef(res)) {
      return res.value
    }

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
