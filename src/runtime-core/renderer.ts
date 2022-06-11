import { createAppAPI } from "./apiCreateApp";
import { VNode, VNodeArrayChildren, normalizeVNode, Text } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance
} from "./component"
import { updateProps } from "./componentProps"
import { ShapeFlags, invokeArrayFns, EMPTY_ARR } from "../shared"
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
  parentNode(node: HostNode): HostElement | null,
  remove(el: HostNode): void
}

type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  parentComponent: ComponentInternalInstance | null,
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

type UnmountChildrenFn = (
  children: VNode[],
  parentComponent: ComponentInternalInstance | null,
  start?: number | undefined
) => void

type UnmountFn = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
) => void

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  parentComponent?: ComponentInternalInstance | null
) => void

type RemoveFn = (vnode: VNode) => void

export type MountComponentFn = (
  initialVNode: VNode,
  container: RendererElement,
  parentComponent: ComponentInternalInstance | null
) => void

export type SetupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
) => void
/********** TS类型声明 end ***********/

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
    remove: hostRemove,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    parentNode: hostParentNode
  } = options

  const patch: PatchFn = (n1, n2, container, parentComponent = null) => {
    if (n1 === n2) { return }
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
          processComponent(n1, n2, container, parentComponent)
        }
    }

  }

  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent: ComponentInternalInstance | null
  ) => {
    if (n1 == null) {
      // 挂载组件
      mountComponent(n2, container, parentComponent)
    } else {
      // 更新组件
      updateComponent(n1, n2)
    }
  }

  // 挂载组件
  const mountComponent: MountComponentFn = (
    initialVNode,
    container,
    parentComponent) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))
    /*
      * 1、为instance设置 render 函数
      * 2、初始化data props methods等
      * 3、初始化生命周期函数
      * 4、执行了 beforeCreate / created 生命周期
      * */
    setupComponent(instance)

    // 建立更新机制
    setupRenderEffect(instance, initialVNode, container)
  }

  // 更新组件
  const updateComponent = (n1: VNode, n2: VNode) => {
    // instance是旧component
    const instance = (n2.component = n1.component)!
    // instance.next指向新节点n2
    instance.next = n2
    instance.update()
  }
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    parentComponent: ComponentInternalInstance | null
  ) => {
    // 没有旧节点，挂载元素
    if (n1 == null) {
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, parentComponent)
    }
  }

  // 挂载普通 html 元素
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    parentComponent: ComponentInternalInstance | null
    ) => {
    let el: RendererElement
    const { shapeFlag } = vnode
    // 创建dom元素
    el = vnode.el = hostCreateElement(vnode.type)

    // 如果子元素是个文本, 插入到父元素中
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children as string)
    } if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children as VNodeArrayChildren, el, parentComponent)
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
          // 两个数组 就改比较更新了
          // 这里应该是pathKeyedChildren, diff 算法还没实现，先用暴力更新的吧
          patchUnkeyedChildren(c1 as VNode[], c2 as VNodeArrayChildren, parentComponent, container)
          // patchKeyedChildren(c1 as VNode[], c2 as VNodeArrayChildren, parentComponent, container)
        } else {
          //  没有新节点，直接卸载旧节点的children
          unmountChildren(c1 as VNode[], parentComponent)
        }
      } else {
        // 新节点不是文本，旧节点是个文本,清除旧节点
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        // 新节点是个数组，开始挂载
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2 as VNodeArrayChildren, container, parentComponent)
        }
      }
    }
  }

  /*const patchKeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    parentComponent: ComponentInternalInstance | null,
    container: RendererElement
  ) => {
    // TODO diff算法实现
    // 因为比较难，最后在实现，暂时先暴力卸载和更新
    unmountChildren(c1, parentComponent)
    mountChildren(c2, container)
  }*/
  const patchUnkeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    parentComponent: ComponentInternalInstance | null,
    container: RendererElement
  ) => {
    c1 = c1 || EMPTY_ARR
    c2 = c2 || EMPTY_ARR
    const oldLength = c1.length
    const newLength = c2.length
    // 找到两个数组length最小的
    const commonLength = Math.min(oldLength, newLength)
    // 循环最小的
    for (let i = 0; i < commonLength; i++) {
      const nextChild = c2[i]
      patch(c1[i], nextChild as VNode, container, parentComponent)
    }
    // 循环结束后，如果oldLength 大于 commonLength
    // 证明old children里多余的元素要卸载
    if (oldLength > commonLength) {
      // 移除旧节点
      unmountChildren(c1, parentComponent)
    } else {
      // 挂载新节点
      mountChildren(c2, container, parentComponent, commonLength)
    }
  }

  const unmountChildren: UnmountChildrenFn = (
    children,
    parentComponent,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent)
    }
  }

  const unmount: UnmountFn = (vnode) => {
    const { shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 卸载组件
      unmountComponent(vnode.component!)
    } else {
     // 删除el
      remove(vnode)
    }
  }

  const unmountComponent = (instance: ComponentInternalInstance) => {

    const { bum, um } = instance

    // beforeUnmount hook
    if (bum) {
      invokeArrayFns(bum)
    }
    const { subTree } = instance
    unmount(subTree, instance)
    // unmount hook
    if (um) {
      invokeArrayFns(um)
    }
  }

  const remove:RemoveFn = (vnode) => {
    const { el } = vnode
    hostRemove(el!)
  }

  const mountChildren: MountChildrenFn = (
    children,
    container,
    parentComponent,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i])
      patch(null, child, container, parentComponent)
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

  const updateComponentPreRender = (instance: ComponentInternalInstance, nextVNode: VNode) => {
    // const prevProps = instance.vnode.props
    // nextVNode.props 新props, prevProps 旧props
    updateProps(instance, nextVNode.props)
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

        const { bm, m } = instance

        // beforeMount hook
        if (bm) {
          invokeArrayFns(bm)
        }

        // 创建 vnode,并保存在组件实例上
        const subTree = (instance.subTree = renderComponentRoot(instance))
        patch(null, subTree, container)

        // mounted
        if (m) {
          invokeArrayFns(m)
        }
        instance.isMounted = true
      } else {
        // 组件更新
        let { next, vnode, bu, u } = instance
        if (next) {
          // 这里要更新props
          updateComponentPreRender(instance, next)
          next.el = vnode.el
        } else {
          next = vnode
        }
        // beforeUpdate hook
        if (bu) {
          invokeArrayFns(bu)
        }
        // 新的 vnode
        const nextTree = renderComponentRoot(instance)
        // 旧的 vnode
        const prevTree = instance.subTree
        // 更新实例上vnode
        instance.subTree = nextTree
        // 开始对比更新组件
        patch(prevTree, nextTree, hostParentNode(prevTree.el!)!, instance)

        next.el = nextTree.el
        // updated hook
        if (u) {
          invokeArrayFns(u)
        }
      }
    }
    // *****建立响应式关系*****
    const effect = new ReactiveEffect(componentUpdateFn)
    // 重新绑定this指向
    // componentUpdateFn 赋值给instance.update 在updateComponent时还会调用
    const update = (instance.update = effect.run.bind(effect))
    // 第一次挂载时，这里要手动先执行下
    update()
  }

  // render 函数会被 mount 方法调用
  const render: RootRenderFunction = (vnode, container) =>  {
    if (vnode == null) {

    } else {
      patch(null, vnode, container, null)
    }
  }
  return {
    createApp: createAppAPI(render)
  }
}


