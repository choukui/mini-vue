import { VNode, VNodeChild } from "./vnode"
import { applyOptions, ComponentOptions, ComputedOptions, MethodOptions } from "./componentOptions"
import { initProps, normalizePropsOptions, NormalizedPropsOptions, ComponentPropsOptions } from "./componentProps"
import { ComponentPublicInstance, PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { isObject, NOOP, EMPTY_OBJ } from "../shared"
import { pauseTracking, resetTracking } from "../reactive/effect"
import { proxyRefs } from "../reactive/ref"
import { markRaw } from "../reactive/reactive"
import { SchedulerJob } from "./scheduler"
import { EmitsOptions } from "./componentEmits"
import { AppContext, createAppContext } from "./apiCreateApp"

/********** TS类型声明 start ***********/
export type Component = any
export type Data = Record<string, unknown>

type LifecycleHook<TFn = Function> = TFn[] | null

export const enum LifecycleHooks {
  // BEFORE_CREATE = 'bc',
  // CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  // DEACTIVATED = 'da',
  // ACTIVATED = 'a',
  // RENDER_TRIGGERED = 'rtg',
  // RENDER_TRACKED = 'rtc',
  // ERROR_CAPTURED = 'ec',
  // SERVER_PREFETCH = 'sp'
}

export type InternalRenderFunction = {
  ( ctx: ComponentPublicInstance): VNodeChild
}

export interface ComponentInternalOptions {}

export interface FunctionalComponent<P = {}, E extends EmitsOptions = {}>
  extends ComponentInternalOptions {
  // use of any here is intentional so it can be a valid JSX Element constructor
  // (props: P, ctx: Omit<SetupContext<E>, 'expose'>): any
  props?: ComponentPropsOptions<P>
  emits?: E | (keyof E)[]
  inheritAttrs?: boolean
  displayName?: string
}

export type ConcreteComponent<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
  > =
  | ComponentOptions<Props, RawBindings, D, C, M>
  | FunctionalComponent<Props, any>

export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  render: InternalRenderFunction | null,
  parent: ComponentInternalInstance | null
  vnode: VNode
  next: VNode | null
  subTree: VNode
  update: SchedulerJob

  appContext: AppContext

  setupState: Data
  ctx: Data
  proxy: ComponentPublicInstance | null,
  isMounted: boolean

  provides: Data

  props: Data
  data: Data

  propsOptions: NormalizedPropsOptions

  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  [LifecycleHooks.UNMOUNTED]: LifecycleHook
}
/********** TS类型声明 end ***********/

let uid = 0

// 当前实例
export let currentInstance: ComponentInternalInstance | null = null
export function setCurrentInstance(instance: ComponentInternalInstance) {
  currentInstance = instance
}
export function unsetCurrentInstance() {
  currentInstance = null
}

// 创建app上下文
const emptyAppContext = createAppContext()

// 创建组件实例
export function createComponentInstance(vnode: VNode, parent: ComponentInternalInstance | null) {
  const type = vnode.type as ConcreteComponent

  // appContext 全局就一个，子组件都指向父组件的appContext, 全局共享
  // 层层向上查找 最终指向了根组件的appContext
  const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance: ComponentInternalInstance = {
    uid: uid++,
    type,
    vnode,
    parent,
    appContext,
    render: null,
    subTree: null!,
    next: null,
    update: null!,
    proxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides), // 继承了父级的provides
    setupState: EMPTY_OBJ, // 储存 setupResult，前提条件 setup 返回值必须是一个对象
    // state
    /*
    * 公共实例代理的目标
    * 通过 this.x=… 来访问 props methods data...
    * */
    ctx: EMPTY_OBJ,
    isMounted: false,

    props: EMPTY_OBJ,
    data: EMPTY_OBJ,

    propsOptions: normalizePropsOptions(type),

    bm: null, // beforeMounted
    m: null, // mounted
    bu: null, // beforeUpdated
    u: null, // mounted
    bum: null, // beforeUnmount
    um: null, // unmount
  }

  instance.ctx = { _: instance }
  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  // 拿到传给组件的props
  const { props } = instance.vnode

  // 初始化props
  initProps(instance, props)

  setupStatefulComponent(instance)
}

// 对setup返回结果进行处理
export function handleSetupResult(instance: ComponentInternalInstance, setupResult: unknown) {
  /*
  * 暂时只处理返回结果是个对象的情况
  * 其他情况以后再增加处理*/
  if (isObject(setupResult)) {
    /*
    * 对返回对象ref键值进行解包操作
    * eg:
    * const result = { foo: ref(1) }
    * 访问 result.foo 等于 result.foo.value
    * */
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance)
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
  const Component = instance.type as ComponentOptions

  // 渲染代理并将其标记为原始, 原始值用元不会被proxy
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))

  const { setup } = Component
  if (setup) {
    // 暂停收集，在setup里访问一个响应式对象, 不用收集依赖
    pauseTracking()
    // 拿到setup执行的结果，暂时只有对象
    const setupResult = setup()
    // 对setupResult返回结果进行处理
    handleSetupResult(instance, setupResult)
    // 拿到结果后，恢复依赖收集
    resetTracking()
  } else {
    finishComponentSetup(instance)
  }
}

function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type as ComponentOptions
  // 如果setup返回一个render函数，render就有值了。这里就不会再次赋值
  if (!instance.render) {
    instance.render = (Component.render || NOOP) as InternalRenderFunction
  }

  /*  support 2 */
  // 设置全局currentInstance为当前实例
  setCurrentInstance(instance)
  // 暂停收集
  pauseTracking()
  //  vue2.x option api
  applyOptions(instance)
  // 恢复收集
  resetTracking()
  // 设置全局currentInstance为 null
  unsetCurrentInstance()
  /*  support 2 */
}
