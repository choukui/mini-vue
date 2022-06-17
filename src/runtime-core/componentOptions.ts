import {ComponentPublicInstance, CreateComponentPublicInstance} from "./componentPublicInstance"
import {ComponentInternalInstance, ComponentInternalOptions, Data} from './component'
import { computed, ComputedGetter, WritableComputedOptions } from "../reactive/computed"
import { EmitsOptions } from "./componentEmits"
import { reactive } from "../reactive/reactive"
import {isArray, isFunction, isObject, isString, NOOP} from "../shared"
import { onBeforeMount, onMount, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from "./apiLifecycle"
import { provide, inject } from "./apiInject";
import {watch, WatchCallback, WatchOptions} from "./apiWatch";

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

type ObjectInjectOptions = Record<
  string | symbol,
  string | symbol | { from?: string | symbol; default?: unknown }
  >

type ComponentInjectOptions = string[] | ObjectInjectOptions

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
  beforeMount?(): void
  mounted?(): void
  beforeUpdate?(): void
  updated?(): void
  beforeUnmount?(): void
  unmounted?(): void
  beforeDestroy?(): void
  destroyed?(): void

  extends?: Extends
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

export type ObjectWatchOptionItem = {
  handler: WatchCallback | string
} & WatchOptions

type WatchOptionItem = string | WatchCallback | ObjectWatchOptionItem

type ComponentWatchOptionItem = WatchOptionItem | WatchOptionItem[]

/********** TS类型声明 end ***********/

// 调用hook并改变this指向
function callHook(hook: Function, instance: ComponentInternalInstance) {
  if (isFunction(hook)) {
    hook.call(instance.proxy)
  }
}

export function applyOptions(instance: ComponentInternalInstance) {
  // resolveMergedOptions函数
  // 1、合并组件mixins
  // 2、全局mixin处理
  const options = resolveMergedOptions(instance)
  const publicThis = instance.proxy!
  const ctx = instance.ctx

  // call beforeCreate hook
  if (options.beforeCreate) {
    callHook(options.beforeCreate, instance)
  }

  const {
    data: dataOptions,
    methods,
    computed: computedOptions,
    provide: provideOptions,
    inject: injectOptions,
    watch: watchOptions,
    beforeMount,
    mounted,
    beforeUpdate,
    updated,
    beforeUnmount,
    unmounted,
    beforeDestroy,
    destroyed
  } = options

  if (injectOptions) {
    resolveInjections(injectOptions, ctx)
  }

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

  // option watch
  if (watchOptions) {
    for (const key in watchOptions) {
      createWatcher(watchOptions[key], ctx, publicThis, key)
    }
  }

  // option provide
  if (provideOptions) {
    const provides = isFunction(provideOptions)? provideOptions.call(publicThis) : provideOptions
    const providesKeys = Reflect.ownKeys(provides) // key array
    providesKeys.forEach(key => {
      provide(key, provides[key])
    })
  }

  function registerLifecycleHook(register: Function, hook?: Function) {
    // 这里手动传入 instance, 源码里是 currentInstance
    if (hook) {
      register((hook as Function).bind(publicThis))
    }
  }
  // call created hook
  if (options.created) {
    callHook(options.created, instance)
  }

  // 注册生命周期函数，在合适的时机调用
  registerLifecycleHook(onBeforeMount, beforeMount)
  registerLifecycleHook(onMount, mounted)
  registerLifecycleHook(onBeforeUpdate, beforeUpdate)
  registerLifecycleHook(onUpdated, updated)
  registerLifecycleHook(onBeforeUnmount, beforeUnmount)
  registerLifecycleHook(onUnmounted, unmounted)

  // 兼容vue2.x 的beforeDestroy/destroyed 生命周期
  if (beforeDestroy ) {
    registerLifecycleHook(onBeforeUnmount, beforeDestroy)
  }
  if (destroyed) {
    registerLifecycleHook(onUnmounted, destroyed)
  }
}

// 处理不同的入参情况，最后调用的是watch函数
function createWatcher(
  raw: ComponentWatchOptionItem,
  ctx: Data,
  publicThis: ComponentPublicInstance,
  key: string
  ) {
  const getter = () => (publicThis as any)[key]
  if (isString(raw)) { // eg: watch: { count: 'handler' }
    const handler = ctx[raw]
    if (isFunction(handler)) {
      watch(getter, handler as WatchCallback)
    }
  } else if (isFunction(raw)) { // eg: watch: { count: () => { ... } }
    watch(getter, raw.bind(publicThis))
  } else if (isObject(raw)) { // eg: watch: { count: { ... }, count: [] }
    if (isArray(raw)) { // eg: watch: { count: [] }
      raw.forEach(r => createWatcher(r, ctx,publicThis, key))
    } else { // eg: watch: { count: { .... } }
      const handler = isFunction(raw.handler) ? raw.handler.bind(publicThis) : (ctx[raw.handler] as WatchCallback)
      if (isFunction(handler)) {
        watch(getter, handler, raw)
      }
    }
  }
}
function mergeOptions(to: any, from: any) {
  const { mixins } = from

  // mixins是个数组要循环合并
  if (mixins) {
    mixins.forEach((m: ComponentOptionsMixin) => {
      mergeOptions(to, m)
    })
  }

  // 给目标对象赋值
  for (const key in from) {
    to[key] = from[key]
  }
}

export function resolveMergedOptions(
  instance: ComponentInternalInstance
): MergedComponentOptions {
  let resolved = {}
  const base = instance.type as ComponentOptions

  // mixins 就是组件的 mixins 选项
  const { mixins } = base

  // 全局的mixin选项
  const { mixins: globalMixins } = instance.appContext

  // 全局mixin 为空，实例上也没有mixins，就不用合并mixins了
  if (!globalMixins.length && !mixins) {
    // 直接赋值base
    resolved = base as ComputedOptions
  } else {
    // 全局mixin选项合并
    if (globalMixins.length) {
      globalMixins.forEach((m) => {
        mergeOptions(resolved, m)
      })
    }
    // 合并component中的mixins选项
    mergeOptions(resolved, base)
  }
  return resolved
}

function resolveInjections(injectOptions: ComponentInjectOptions, ctx: any) {
  if (isArray(injectOptions)) {
    injectOptions = normalizeInject(injectOptions)
  }

  for (const key in injectOptions) {
    const opt = (injectOptions as ObjectInjectOptions)[key]
    let injected:unknown
    if (isObject(opt)) {

    } else {
      injected = inject(opt)
    }
    ctx[key] = injected
  }
}
// inject 数组形式转化为对象形式
function normalizeInject(raw: ComponentInjectOptions):ObjectInjectOptions {
  if (isArray(raw)) {
    const res: ObjectInjectOptions = {}
    for (let i = 0; i < raw.length; i++) {
      res[raw[i]] = raw[i]
    }
    return res
  }
  return raw
}
