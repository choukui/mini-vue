export const isArray = Array.isArray
export const hasChange = (value: any, oldValue: any) => !Object.is(value, oldValue)
export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'

export const objectToString = Object.prototype.toString

export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

// "[object RawType]" 转化成 "RawType"
export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'
