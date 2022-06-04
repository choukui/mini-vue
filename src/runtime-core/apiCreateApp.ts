import { RootRenderFunction } from "./renderer";
import { Component } from "./component";
import { VNode, createVNode } from "./vnode";

export interface App<HostElement = any> {}

export type CreateAppFunction<HostElement> = (
  rootComponent: Component
) => App<HostElement>

export function createAppAPI<HostElement>(render: RootRenderFunction): CreateAppFunction<HostElement> {
  return  function createApp (rootComponent) {
    const app: App = {
      mount(): any {
        // 创建vnode
        const vnode = createVNode(rootComponent) as VNode
        render(vnode, rootComponent)
      }
    }
    return app
  }
}
