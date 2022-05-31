import { reactive, ReactiveFlags, Target, toRaw } from "./reactive";
import { track, trigger } from "./effect";
import { isArray, isObject, isIntegerKey } from "../shared";
import { isRef } from "./ref";

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

    // 判断target是不是数组
    const targetIsArray = isArray(target)

    const res = Reflect.get(target, key, receiver)

    track(target, key)

    /*
    * 处理嵌套的ref(), 也叫做解包ref
    * 例如 reactive({ foo: ref('foo')})
    * */
    if (isRef(res)) {
      /**
       * 1、数组的时候不解包，如果ref(2)被自动解包了，数据就成了[1, 2], 就失去响应性了。
       * eg: [1, ref(2)]
       * 2、数组赋值时下标不是一个可迭代的key, 自动解包
       * eg:
       *  const arr = ref([])
       *  arr.value[1] = ref(1) // result: arr[0] => ref(1)
       *  arr.value[''] = ref(2) // result:  arr[''] => 2
       *  arr.value[Symbol('')] = ref(3) // result:  arr[''] => 3
       *  因为Symbol('') 、"" 不是可迭代的key,
       *  例：字符串数字'1'、'2'、'3'...、数字1、2、3... 是可迭代的key
      */
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key)
      return shouldUnwrap ? res.value : res
    }

    if (isObject(res)) {
      return reactive(res)
    }


    return res
  }
}

function createSetter() {
  return function set (target: Target, key: string | symbol, value: any, receiver: any):boolean {

    /*
    * 处理 reactive 嵌套 ref 时的赋值时不响应的情况
    * eg:
    * const a = ref(1)
    * const obj = reactive({
    *   a,
    *   b: {
    *     c: a
    *   }
    * })
    */
    let oldValue = (target as any)[key]
     value = toRaw(value)
    oldValue = toRaw(oldValue)
    if (!isArray(target) && !isRef(value) && isRef(oldValue)) {
      oldValue.value = value
      return true
    }
    /* end */

    const res = Reflect.set(target, key, value, receiver)
    // 派发更新
    trigger(target, key)
    return res
  }
}

export const mutableHandlers: ProxyHandler<object> = {
  get: createGetter(),
  set: createSetter()
}

export const mutableCollectionHandlers = {}
