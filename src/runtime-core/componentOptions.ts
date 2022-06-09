import { CreateComponentPublicInstance } from "./componentPublicInstance"
import { ComponentInternalInstance, ComponentInternalOptions } from './component'
import { ComputedGetter, WritableComputedOptions } from "../reactive/computed"
import { EmitsOptions } from "./componentEmits"
import {reactive} from "../reactive/reactive";

/********** TS类型声明 start ***********/

export type ComputedOptions = Record<
  string,
  ComputedGetter<any> | WritableComputedOptions<any>
  >

export interface MethodOptions {
  [key: string]: Function
}
export type ComponentOptionsMixin = ComponentOptionsBase<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
  >

export type OptionTypesKeys = 'P' | 'B' | 'D' | 'C' | 'M' | 'Defaults'

export type OptionTypesType<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Defaults = {}
  > = {
  P: P
  B: B
  D: D
  C: C
  M: M
  Defaults: Defaults
}

export type ComponentOptions<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = any,
  M extends MethodOptions = any,
  Mixin extends ComponentOptionsMixin = any,
  Extends extends ComponentOptionsMixin = any,
  E extends EmitsOptions = any
  > = ComponentOptionsBase<Props, RawBindings, D, C, M, Mixin, Extends, E> &
  ThisType<
    CreateComponentPublicInstance<
      {},
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      Readonly<Props>
      >
    >

interface LegacyOptions<
  Props,
  D,
  C extends ComputedOptions,
  M extends MethodOptions,
  Mixin extends ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin
  > {
  [key: string]: any

  data?: () => any
}

export interface ComponentCustomOptions {}

export interface ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C extends ComputedOptions,
  M extends MethodOptions,
  Mixin extends ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin,
  E extends EmitsOptions,
  EE extends string = string,
  Defaults = {}
  > extends LegacyOptions<Props, D, C, M, Mixin, Extends>,
  ComponentInternalOptions,
  ComponentCustomOptions {
  render?: Function
  name?: string
  setup?: () => RawBindings
}

type MergedHook<T = () => void> = T | T[]

export type MergedComponentOptions = ComponentOptions &
  MergedComponentOptionsOverride

export type MergedComponentOptionsOverride = {
  beforeCreate?: MergedHook
  created?: MergedHook
  beforeMount?: MergedHook
  mounted?: MergedHook
  beforeUpdate?: MergedHook
  updated?: MergedHook
  activated?: MergedHook
  deactivated?: MergedHook
  /** @deprecated use `beforeUnmount` instead */
  beforeDestroy?: MergedHook
  beforeUnmount?: MergedHook
  /** @deprecated use `unmounted` instead */
  destroyed?: MergedHook
  unmounted?: MergedHook
  renderTracked?: MergedHook
  renderTriggered?: MergedHook
  errorCaptured?: MergedHook
}

/********** TS类型声明 end ***********/

export function applyOptions(instance: ComponentInternalInstance) {
  // beforeCreate hook
  // @ts-ignore
  console.log(`${instance.type.name}-lifeCycle: beforeCreate`);

  const publicThis = instance.proxy!

  // resolveMergedOptions 为了类型不报错
  const { data: dataOptions } = resolveMergedOptions(instance)

  if (dataOptions) {
    // 拿到data返回的对象
    const data = (dataOptions as any).call(publicThis, publicThis)
    // 把data转换成响应式的
    instance.data = reactive(data)
  }

  // created hook
  // @ts-ignore
  console.log(`${instance.type.name}-lifeCycle: created`);
}

export function resolveMergedOptions(
  instance: ComponentInternalInstance
): MergedComponentOptions {
  return instance.type as ComponentOptions
}
