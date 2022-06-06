import { createAppAPI } from "./apiCreateApp";
import { VNode, VNodeArrayChildren, normalizeVNode, Text } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance
} from "./component";
import {ShapeFlags} from "../shared";
/********** TS类型声明 start ***********/
export interface RendererNode {
  [key: string]: any
}
export interface RendererElement extends RendererNode {}

export interface Renderer<HostElement = RendererElement> {
  render: any,
  createApp: any
}
export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: VNode | null,
  container: HostElement
) => void

export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
  insert(el: HostNode, parent: HostElement): void
  createElement(type: string): HostElement
  setElementText(node: HostElement, text: string): void
  createText(text: string): HostNode
}

type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  start?: number | undefined
) => void

type ProcessTextOrCommentFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement
) => void
/********** TS类型声明 end ***********/

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement
) => void

export type MountComponentFn = (initialVNode: VNode, container: RendererElement) => void

export type SetupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
) => void


export function createRenderer<HostNode = RendererNode, HostElement = RendererElement>(
  options:RendererOptions<HostNode, HostElement>
) {
  return baseCreateRenderer(options)
}


function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
  >(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>
function baseCreateRenderer(
  options: RendererOptions
): any {

  const {
    insert: hostInsert,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    createText: hostCreateText
  } = options

  const patch: PatchFn = (n1, n2, container) => {
    // n2 是新的vnode，应该基于n2的类型判断
    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理普通元素类型
          processElement(n1, n2, container)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 处理组件类型
          processComponent(n1, n2, container)
        }
    }

  }

  const processComponent = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    mountComponent(n2, container)
  }

  // 挂载组件
  const mountComponent: MountComponentFn = (initialVNode, container) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode))
    setupComponent(instance)

    // 建立更新机制
    setupRenderEffect(instance, initialVNode, container)
  }

  const processElement = ( n1: VNode | null, n2: VNode, container: RendererElement) => {
    // 没有旧节点，挂载元素
    if (n1 == null) {
      mountElement(n2, container)
    }
  }
  // 挂载普通 html 元素
  const mountElement = (vnode: VNode, container: RendererElement,) => {
    let el: RendererElement
    const { shapeFlag } = vnode
    // 创建dom元素
    el = vnode.el = hostCreateElement(vnode.type)

    // 如果子元素是个文本, 插入到父元素中
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children as string)
    } if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children as VNodeArrayChildren, el)
    }
    // dom插入操作，将el插入到container中
    hostInsert(el, container)
  }

  const mountChildren: MountChildrenFn = (
    children,
    container,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i])
      patch(null, child, container)
    }
  }

  // 处理文本节点
  const processText: ProcessTextOrCommentFn = (n1, n2, container) => {
    if (n1 == null) { // 新增
      hostInsert(
        (n2.el = hostCreateText(n2.children as string)),
        container
      )
    }
  }

  // 建立更新机制
  const setupRenderEffect: SetupRenderEffectFn = (
    instance,
    initialVNode,
    container
  ) => {
    const componentUpdateFn = () => {
      const subTree = (instance.subTree = renderComponentRoot(instance))
      patch(null, subTree, container)
    }
    componentUpdateFn()
  }

  // render 函数会被 mount 方法调用
  const render: RootRenderFunction = (vnode, container) =>  {
    if (vnode == null) {

    } else {
      patch(null, vnode, container)
    }
  }
  return {
    createApp: createAppAPI(render)
  }
}


