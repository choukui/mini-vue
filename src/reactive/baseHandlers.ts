import {
  reactive,
  ReactiveFlags,
  Target,
  toRaw,
  reactiveMap,
  shallowReadonlyMap,
  readonlyMap,
  shallowReactiveMap, readonly
} from "./reactive";
import { track, trigger, pauseTracking, resetTracking } from "./effect";
import { isArray, isObject, isIntegerKey, hasOwn, isSymbol, makeMap, extend } from "../shared";
import { isRef } from "./ref";
import { TriggerOpTypes, TrackOpTypes } from "./operations";

export const ITERATE_KEY = Symbol( '')
const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)
// symbol 相关
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)
// 数组array
const arrayInstrumentations = createArrayInstrumentations()
// 对数组的操作进行了拦截
function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  ;(['indexOf', 'includes', 'lastIndexOf']).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET,i + '')
      }
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  ;(['push']).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      // 暂停收集
      pauseTracking()
      const res = (toRaw(this) as any)[key].apply(this, args)
      // 恢复收集
      resetTracking()
      return res
    }
  })
  return instrumentations
}

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowGet = createGetter(false, true)
const shallowSet = createSetter(true)
const shallowReadonlyGet = createGetter(true, true)

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
    } else if (
      // 如果是读取原数据，并且缓存中有。直接返回目标对象 toRaw() 会读取__v_raw
      // 可以防止重复收集数据造成调用栈溢出
      key === ReactiveFlags.RAW &&
      receiver === (isReadonly
        ? shallow ? shallowReadonlyMap : readonlyMap
        : shallow ? shallowReactiveMap : reactiveMap
      ).get(target)
    ) {
      return target
    }

    // 判断target是不是数组
    const targetIsArray = isArray(target)
    // debugger
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)


    /*
    * 处理Symbol.prototype上的内置属性，直接返回原值
    * eg:
    * const obj = {
    *   [Symbol.asyncIterator]: ref(1),
    *   ...otherBuiltInSymbols
    * }
    * const objRef = ref(obj)
    * objRef.value[Symbol.asyncIterator] === obj[Symbol.asyncIterator] // true
    * */
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    // 如果是浅渲染，直接返回结果
    if (shallow) {
      return res
    }

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
      return isReadonly ? readonly(res) : reactive(res)
    }


    return res
  }
}

function createSetter(shallow = false) {
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
    if (!shallow) {
      let oldValue = (target as any)[key]
      value = toRaw(value)
      oldValue = toRaw(oldValue)
      if (!isArray(target) && !isRef(value) && isRef(oldValue)) {
        oldValue.value = value
        return true
      }
    }
    /* end */

    const res = Reflect.set(target, key, value, receiver)
    // 派发更新
    trigger(target, TriggerOpTypes.ADD, key, value)
    return res
  }
}

// 数组 for in 处理
function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}

// 处理对象数组等引用类型
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  ownKeys
}

// readonly 只处理 get 方法，set delete 都返回true
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(): boolean {
    return true
  },
  deleteProperty(): boolean {
    return true
  }
}

export const shallowReactiveHandlers: ProxyHandler<object> = extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)

export const shallowReadonlyHandlers: ProxyHandler<object> = extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)
