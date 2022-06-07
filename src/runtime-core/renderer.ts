import { createAppAPI } from "./apiCreateApp";
import { VNode, VNodeArrayChildren, normalizeVNode, Text } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance
} from "./component"
import { ShapeFlags } from "../shared"
import { ReactiveEffect } from "../reactive/effect"
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
  createText(text: string): HostNode,
  parentNode(node: HostNode): HostElement | null
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

type PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  parentComponent: ComponentInternalInstance | null
) => void
/********** TS类型声明 end ***********/

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  parentComponent?: ComponentInternalInstance | null
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
    createText: hostCreateText,
    parentNode: hostParentNode
  } = options

  const patch: PatchFn = (n1, n2, container, parentComponent = null) => {
    // n2 是新的vnode，应该基于n2的类型判断
    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理普通元素类型
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 处理组件类型
          processComponent(n1, n2, container)
        }
    }

  }

  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    mountComponent(n2, container)
  }

  // 挂载组件
  const mountComponent: MountComponentFn = (initialVNode, container) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode))
    setupComponent(instance)

    // 建立更新机制
    setupRenderEffect(instance, initialVNode, container)
  }

  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent: ComponentInternalInstance | null
  ) => {
    // 没有旧节点，挂载元素
    if (n1 == null) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2, parentComponent)
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

  const patchElement = (n1: VNode, n2: VNode, parentComponent: ComponentInternalInstance | null) => {
    // 更新新节点上的el
    const el = (n2.el = n1.el!)
    patchChildren(n1, n2, el, parentComponent)
  }

  const patchChildren: PatchChildrenFn = (
    n1,
    n2,
    container,
    parentComponent
  ) => {
    const { shapeFlag } = n2
    const c1 = n1 && n1.children // old children
    const c2 = n2.children // new children
    const prevShapeFlag = n1 ? n1.shapeFlag : 0 // old shapeFlag
    // 新节点text文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧节点children是个数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 卸载旧节点 children
      }
      // 更新text
      if (c2 !== c1) {
        hostSetElementText(container, c2 as string)
      }
    } else {
      // 旧节点的children是个数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新节点的children是个数组
        if (shapeFlag && ShapeFlags.ARRAY_CHILDREN) {
          // 两个数组 就改比较更新了,
          //  todo patchKeyedChildren
        } else {
          //  没有新节点，直接卸载旧节点的children
          //  todo unmountChildren
        }
      } else {
        // 新节点不是文本，旧节点是个文本,清除旧节点
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        // 新节点是个数组，开始挂载
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2 as VNodeArrayChildren, container)
        }
      }
    }
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
    // 当响应式对象更新时，会重新执行componentUpdateFn函数来更新视图
    const componentUpdateFn = () => {
      // 第一次挂载组件
      if (!instance.isMounted) {
        // 创建 vnode,并保存在组件实例上
        const subTree = (instance.subTree = renderComponentRoot(instance))
        patch(null, subTree, container)
        instance.isMounted = true
      } else { // 组件更新
        // 新的 vnode
        const nextTree = renderComponentRoot(instance)
        // 旧的 vnode
        const prevTree = instance.subTree
        // 开始对比更新组件
        patch(prevTree, nextTree, hostParentNode(prevTree.el!)!)
      }
    }
    // *****建立响应式关系*****
    const effect = new ReactiveEffect(componentUpdateFn)
    // 重新绑定this指向
    const update = effect.run.bind(effect)
    // 第一次挂载时，这里要手动先执行下
    update()
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


