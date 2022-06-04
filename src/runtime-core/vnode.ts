import {RendererElement, RendererNode} from "./renderer";
import {Component, ComponentInternalInstance, Data} from "./component";
import {isObject, isString, ShapeFlags} from "../shared";

/********** TS类型声明 start ***********/
export type VNodeNormalizedChildren = string | VNodeArrayChildren

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  __v_isVNode: true, // vnode标识符
  component: ComponentInternalInstance | null,
  type: VNodeTypes,
  shapeFlag: number,
  el: HostNode | null,
  children: VNodeNormalizedChildren
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
/********** TS类型声明 end ***********/


export function isVNode(value: any):value is VNode  {
  return value ? value.__v_isVNode === true : false
}

export const createVNode = _createVNode

function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null
): VNode {
  // 暂时只有 element 和 component 两种类型
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.COMPONENT
      : 0
  return createBaseVNode(type, props,children, shapeFlag)
}

// 创建vnode
function createBaseVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  shapeFlag: ShapeFlags
) {
  const vnode = {
    __v_isVNode: true, // vnode标识
    type,
    children, // 子元素
    shapeFlag, // 元素标记
  } as VNode

  if (children) {
    // 重新标记节点类型
    // |= 按位或赋值运算符 MDN: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Bitwise_OR_assignment
    vnode.shapeFlag |= isString(children) ? ShapeFlags.TEXT_CHILDREN : ShapeFlags.ARRAY_CHILDREN
  }
  return vnode
}

// export function normalizeVNode(child: VNodeChild): VNode {
//
// }
