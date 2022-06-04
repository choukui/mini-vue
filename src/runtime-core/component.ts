import { VNode, VNodeChild } from "./vnode";
import { ComponentOptions } from "./componentOptions";
import { ComponentPublicInstance } from "./componentPublicInstance";
import { NOOP } from "../shared";

export type Component = any
export type Data = Record<string, unknown>

export type InternalRenderFunction = {
  ( ctx: ComponentPublicInstance): VNodeChild
}

export type ConcreteComponent = ComponentOptions

export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  render: InternalRenderFunction | null
}

let uid = 0

// 创建组件实例
export function createComponentInstance(vnode: VNode) {
  const type = vnode.type as ConcreteComponent
  const instance: ComponentInternalInstance = {
    uid: uid++,
    type,
    render: null,
  }
  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
  finishComponentSetup(instance)
}

function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type as ComponentOptions
  if (!instance.render) {
    instance.render = (Component.render || NOOP) as InternalRenderFunction
  }
}
