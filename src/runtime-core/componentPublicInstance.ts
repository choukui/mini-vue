import { ComponentInternalInstance } from "./component"
import { EMPTY_OBJ, hasOwn } from "../shared"
import {
  ComputedOptions,
  MethodOptions,
  ComponentOptionsBase,
  ComponentOptionsMixin,
  OptionTypesType,
  OptionTypesKeys
} from "./componentOptions"
import { EmitsOptions } from "./componentEmits"
import { UnionToIntersection } from "./helper/typeUtils";
/****** TTS类型声明 start ******/
export type ComponentPublicInstance<
  P = {}, // props type extracted from props option
  B = {}, // raw bindings returned from setup()
  D = {}, // return from data()
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>
  > = {}

export interface ComponentRenderContext {
  [key: string]: any,
  _: ComponentInternalInstance
}

type MixinToOptionTypes<T> = T extends ComponentOptionsBase<
    infer P,
    infer B,
    infer D,
    infer C,
    infer M,
    infer Mixin,
    infer Extends,
    any,
    any,
    infer Defaults
    >
  ? OptionTypesType<P & {}, B & {}, D & {}, C & {}, M & {}, Defaults & {}> &
  IntersectionMixin<Mixin> &
  IntersectionMixin<Extends>
  : never

type ExtractMixin<T> = {
  Mixin: MixinToOptionTypes<T>
}[T extends ComponentOptionsMixin ? 'Mixin' : never]

type IsDefaultMixinComponent<T> = T extends ComponentOptionsMixin
  ? ComponentOptionsMixin extends T
    ? true
    : false
  : false

type IntersectionMixin<T> = IsDefaultMixinComponent<T> extends true
  ? OptionTypesType<{}, {}, {}, {}, {}>
  : UnionToIntersection<ExtractMixin<T>>

type UnwrapMixinsType<
  T,
  Type extends OptionTypesKeys
  > = T extends OptionTypesType ? T[Type] : never

type EnsureNonVoid<T> = T extends void ? {} : T

export type CreateComponentPublicInstance<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
  PublicP = UnwrapMixinsType<PublicMixin, 'P'> & EnsureNonVoid<P>,
  PublicB = UnwrapMixinsType<PublicMixin, 'B'> & EnsureNonVoid<B>,
  PublicD = UnwrapMixinsType<PublicMixin, 'D'> & EnsureNonVoid<D>,
  PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, 'C'> &
    EnsureNonVoid<C>,
  PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, 'M'> &
    EnsureNonVoid<M>,
  PublicDefaults = UnwrapMixinsType<PublicMixin, 'Defaults'> &
    EnsureNonVoid<Defaults>
  > = ComponentPublicInstance<
  PublicP,
  PublicB,
  PublicD,
  PublicC,
  PublicM,
  E,
  PublicProps,
  PublicDefaults,
  MakeDefaultsOptional,
  ComponentOptionsBase<P, B, D, C, M, Mixin, Extends, E, string, Defaults>
  >
/****** TS类型声明 end ******/

// 对 instance 组件实例访问的代理拦截 this.xxx = ....
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key) {
    const { setupState, props, data } = instance
    // render访问setup数据拦截
    // 如何在 render 函数里方法setup数据就是在这一步实现的
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      return setupState[key]
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      // 访问 option data
      return data![key]
    } else if (props !== EMPTY_OBJ && hasOwn(props, key )) {
      // 访问 option props
      return props![key]
    }
  },
  set({ _: instance }: ComponentRenderContext, key: string | symbol, value: any): boolean {
    const { setupState, data } = instance

    // 在render里设置 setup 的数据是在这一步实现的
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      setupState[key] = value
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      // 设置 options data
      data[key] = value
    }
    return true
  }
}
