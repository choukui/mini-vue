import { createAppAPI } from "./apiCreateApp";
import { VNode } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance
} from "./component";
import {ShapeFlags} from "../shared";

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
}

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
    createElement: hostCreateElement
  } = options
  console.log('options' ,options);
  const patch: PatchFn = (n1, n2, container) => {
    // n2 是新的vnode，应该基于n2的类型判断
    const { type, shapeFlag } = n2
    switch (type) {
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

  const processElement = ( n1: VNode | null, n2: VNode, container: RendererElement) => {
    // 没有旧节点，挂载元素
    if (n1 == null) {
      mountElement(n2, container)
    }
  }
  // 挂载普通 html 元素
  const mountElement = (vnode: VNode, container: RendererElement,) => {
    let el: RendererElement
    // 创建dom元素
    el = vnode.el = hostCreateElement(vnode.type)
    console.log('el', el);
    // dom插入操作，将el插入到container中
    console.log('container', container)
    hostInsert(el, container)
  }
  // 挂载组件
  const mountComponent: MountComponentFn = (initialVNode, container) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode))
    setupComponent(instance)
    console.log(instance);
    setupRenderEffect(instance, initialVNode, container)
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


