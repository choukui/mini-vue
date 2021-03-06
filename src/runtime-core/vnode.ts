import { RendererElement, RendererNode } from "./renderer"
import { Component, ComponentInternalInstance, Data } from "./component"
import { isArray, isObject, isString, ShapeFlags } from "../shared"
import { AppContext } from "./apiCreateApp"

/********** TS类型声明 start ***********/
export type VNodeNormalizedChildren = string | VNodeArrayChildren

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  __v_isVNode: true, // vnode标识符
  component: ComponentInternalInstance | null,
  type: VNodeTypes,
  shapeFlag: number,
  el: HostNode | null,
  anchor: HostNode | null // fragment anchor
  props: (VNodeProps & ExtraProps) | null
  children: VNodeNormalizedChildren

  key: string | number | symbol | null

  appContext: AppContext | null
}
export type VNodeProps = {
  key?: string | number | symbol
}

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

// 用Symbol作为唯一标识符
export const Comment = Symbol(undefined)
export const Fragment = Symbol(undefined)
export const Text = Symbol(undefined)

// 判断是否是个vnode
export function isVNode(value: any):value is VNode  {
  return value ? value.__v_isVNode === true : false
}

export function isSameVNodeType(n1: VNode, n2:VNode):boolean {
  return n1.type === n2.type && n1.key === n2.key
}

export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0
  // const { shapeFlag } = vnode
  // 先实现 children 为数组的情况
  if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  vnode.shapeFlag |= type
}

export const createVNode = _createVNode

function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null
): VNode {

  // props class style 的处理
  if (props) {
    // const { class: klass } = props
    // console.log(klass);
  }
  // 暂时只有 element 和 component 两种类型
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.COMPONENT
      : 0
  return createBaseVNode(type, props, children, shapeFlag, true)
}

// 创建vnode
function createBaseVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  shapeFlag: ShapeFlags,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true, // vnode标识
    type,
    props, // props
    children, // 子元素
    shapeFlag, // 元素标记
  } as VNode

  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  }

  if (children) {
    // 重新标记节点类型
    // |= 按位或赋值运算符 MDN: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Bitwise_OR_assignment
    vnode.shapeFlag |= isString(children) ? ShapeFlags.TEXT_CHILDREN : ShapeFlags.ARRAY_CHILDREN
  }
  return vnode
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (child === null || typeof child === 'boolean') {
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(Fragment, null, child.slice())
  } else if (typeof child === 'object') {
    return child
  } else {
    return createVNode(Text, null, String(child))
  }
}
