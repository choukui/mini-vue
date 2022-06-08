import { ComponentInternalInstance, ConcreteComponent } from "./component"
import { Data } from "./component"
import { shallowReactive } from "../reactive/reactive"
import {isArray, camelize, EMPTY_OBJ, isObject, isFunction, hasOwn} from "../shared"

/********** TS类型声明 start ***********/
type PropMethod<T, TConstructor = any> = [T] extends [(...args: any) => any] // if is function with args
  ? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
  : never

type PropConstructor<T = any> =
  | { new (...args: any[]): T & {} }
  | { (): T }
  | PropMethod<T>

export type PropType<T> = PropConstructor<T> | PropConstructor<T>[]

type DefaultFactory<T> = (props: Data) => T | null | undefined

export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>

export type ComponentObjectPropsOptions<P = Data> = {
  [K in keyof P]: Prop<P[K]> | null
}

export type ComponentPropsOptions<P = Data> =
  | ComponentObjectPropsOptions<P>
  | string[]

export interface PropOptions<T = any, D = T> {
  type?: PropType<T> | true | null
  required?: boolean
  default?: D | DefaultFactory<D> | null | undefined | object
  validator?(value: unknown): boolean
}

type NormalizedProp =
  | null
  | (PropOptions & {
  [BooleanFlags.shouldCast]?: boolean
  [BooleanFlags.shouldCastTrue]?: boolean
})

export type NormalizedProps = Record<string, NormalizedProp>
export type NormalizedPropsOptions = [NormalizedProps, string[]] | []
/********** TS类型声明 end ***********/

const enum BooleanFlags {
  shouldCast,
  shouldCastTrue
}

// 初始化props
export function initProps (instance: ComponentInternalInstance, rawProps: Data | null,) {
  /**
   * 如果组件声明了props, 那么才会进入到props里，
   * 没有被声明的props，则会保存在attrs里
   * attrs: 储存没有被声明 props
   * props: 储存 props
   * */
  const props: Data = {}
  const attrs: Data = {}

  setFullProps(instance, rawProps, props)
  // 确保所有的props都是组件中定义好的。
  // 如果不存在组件的props中，则赋值undefined
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined
    }
  }

  // 暂时只考虑props的情况
  // props 转换为一个浅渲染的reactive
  instance.props = shallowReactive(props)
}

function setFullProps(instance: ComponentInternalInstance, rawProps: Data|null, props: Data) {
  // options 就是组件里的props选项
  // 根据组件里定义的props 来设置props值。
  // 没有定义的props会保存在attrs里，这里先不实现
  const [ options ] = instance.propsOptions
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (options && hasOwn(options, key)) {
        props[key] = value
      }
    }
  }
}

export function normalizePropsOptions(comp: ConcreteComponent) {
  // @ts-ignore
  const raw = comp.props

  const normalized: NormalizedPropsOptions[0] = {}
  if (isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      // 规范化props a-b => aB
      const normalizedKey = camelize(raw[i])
      normalized[normalizedKey] = EMPTY_OBJ
    }
  } else if (raw) {
    for (const key in raw) {
      const normalizedKey = camelize(key)
      const opt = raw[key]
     normalized[normalizedKey] = isArray(opt) || isFunction(opt) ? { type: opt } : opt
    }
  }

  const res: NormalizedPropsOptions = [normalized, ['']]

  return res
}
