import { CreateComponentPublicInstance } from "./componentPublicInstance"
import { ComponentInternalInstance, ComponentInternalOptions } from './component'
import { computed, ComputedGetter, WritableComputedOptions } from "../reactive/computed"
import { EmitsOptions } from "./componentEmits"
import { reactive } from "../reactive/reactive"
import { isFunction, NOOP } from "../shared"

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

  beforeCreate?(): void
  created?(): void
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

// 调用hook并改变this指向
function callHook(hook: Function, instance: ComponentInternalInstance) {
  if (isFunction(hook)) {
    hook.call(instance.proxy)
  }
}

export function applyOptions(instance: ComponentInternalInstance) {
  const options = resolveMergedOptions(instance)
  const publicThis = instance.proxy!
  const ctx = instance.ctx

  // call beforeCreate hook
  if (options.beforeCreate) {
    callHook(options.beforeCreate, instance)
  }

  // resolveMergedOptions 为了类型不报错
  const { data: dataOptions, methods, computed: computedOptions } = options

  if (dataOptions) {
    // 拿到data返回的对象
    const data = (dataOptions as any).call(publicThis, publicThis)
    // 把data转换成响应式的
    instance.data = reactive(data)
  }

  // option methods 处理
  if (methods) {
    for (const key in methods) {
      const methodHandler = methods[key]
      // 确保是个函数
      if (isFunction(methodHandler)) {
        // 挂载到ctx, 为了以后this.xxx()调用
        // this.xxx() 实际就是访问ctx上的函数名
        ctx[key] = methodHandler.bind(publicThis)
      }
    }
  }

  // option computed 处理
  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = computedOptions[key]
      // 拿到get函数，拿不到就赋值个空函数
      const get = isFunction(opt) ? opt.bind(publicThis) : isFunction(opt.get) ? opt.get.bind(publicThis) : NOOP
      // 拿到set函数
      const set = !isFunction(opt) && isFunction(opt.set) ? opt.set.bind(publicThis) : NOOP
      // 调用reactive 里的 computed
      // computed 是个 ref
      const c = computed({
        get,
        set
      })
      // 在ctx上定义相同的字段，可以this.xxx 访问到computed属性
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: v => c.value = v
      })
    }
  }

  // todo watch 未实现

  // call created hook
  if (options.created) {
    callHook(options.created, instance)
  }
}

export function resolveMergedOptions(
  instance: ComponentInternalInstance
): MergedComponentOptions {
  return instance.type as ComponentOptions
}
