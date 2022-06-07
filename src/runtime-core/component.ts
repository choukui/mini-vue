import { VNode, VNodeChild } from "./vnode"
import { ComponentOptions } from "./componentOptions"
import { initProps } from "./componentProps"
import { ComponentPublicInstance, PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { isObject, NOOP, EMPTY_OBJ } from "../shared"
import { pauseTracking, resetTracking } from "../reactive/effect"
import { proxyRefs } from "../reactive/ref"
import { markRaw } from "../reactive/reactive"

export type Component = any
export type Data = Record<string, unknown>

export type InternalRenderFunction = {
  ( ctx: ComponentPublicInstance): VNodeChild
}

export type ConcreteComponent = ComponentOptions

export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  render: InternalRenderFunction | null,
  vnode: VNode
  subTree: VNode
  setupState: Data
  ctx: Data
  proxy: ComponentPublicInstance | null,
  isMounted: boolean

  props: Data
}

let uid = 0

// 创建组件实例
export function createComponentInstance(vnode: VNode) {
  const type = vnode.type as ConcreteComponent
  const instance: ComponentInternalInstance = {
    uid: uid++,
    type,
    vnode,
    render: null,
    subTree: null!,
    proxy: null,
    setupState: EMPTY_OBJ, // 储存 setupResult，前提条件 setup 返回值必须是一个对象
    // state
    /*
    * 公共实例代理的目标
    * 通过 this.x=… 来访问 props methods data...
    * */
    ctx: EMPTY_OBJ,
    isMounted: false,

    props: EMPTY_OBJ
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
}
