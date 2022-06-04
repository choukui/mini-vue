import {RendererElement, RendererNode} from "./renderer";
import {Component, ComponentInternalInstance, Data} from "./component";
import {isObject, isString, ShapeFlags} from "../shared";

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  component: ComponentInternalInstance | null,
  type: VNodeTypes,
  shapeFlag: number,
  el: HostNode | null
}
export type VNodeProps = {}

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

export const createVNode = _createVNode

function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null
): VNode {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.COMPONENT
      : 0
  return createBaseVNode(type, props, shapeFlag)
}

function createBaseVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  shapeFlag: ShapeFlags
) {
  const vnode = {
    type,
    shapeFlag,
  } as VNode
  return vnode
}

// export function normalizeVNode(child: VNodeChild): VNode {
//
// }
