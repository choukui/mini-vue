export const isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

export const hasChange = (value: any, oldValue: any) => !Object.is(value, oldValue)
export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

export const objectToString = Object.prototype.toString

export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

// "[object RawType]" 转化成 "RawType"
export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'

export const isString = (val: unknown): val is string => typeof val === 'string'
// 数字和字符串的数字被认为是可迭代的key 1 '1'
export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: false,
    enumerable: true,
    value
  })
}

export const extend = Object.assign

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const NOOP = () => {}

const camelizeRE = /-(\w)/g

export const camelize = (str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
}

export const EMPTY_OBJ: { readonly [key: string]: any } =  {}
export const EMPTY_ARR = []

export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}

export * from './makeMap'
export * from './shapeFlags'
