import { RendererNode, RendererElement } from "./renderer";
import {Component, ComponentInternalInstance, Data} from "./component";

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  component: ComponentInternalInstance | null,
  type: VNodeTypes
}
export type VNodeProps = {}
export const createVNode = _createVNode

type VNodeTypes = string | Component

type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>
export type VNodeChild = VNodeChildAtom | VNodeArrayChildren

function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null
): VNode {
  return createBaseVNode(type, props)
}

function createBaseVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null
) {
  const vnode = {
    type
  } as VNode
  return vnode
}
