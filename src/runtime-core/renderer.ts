import { createAppAPI } from "./apiCreateApp";
import { VNode } from "./vnode";
import { setupComponent, createComponentInstance} from "./component";

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

}

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement
) => void

export type MountComponentFn = (initialVNode: VNode, container: RendererElement) => void


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
  const patch: PatchFn = (n1, n2, container) => {
    processComponent(n1, n2, container)
  }

  const processComponent = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    mountComponent(n2, container)
  }
  // 挂载组件
  const mountComponent: MountComponentFn = (initialVNode, container) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode))
    setupComponent(instance)
    console.log(instance);
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


