import { RootRenderFunction } from "./renderer";
import { Component } from "./component";
import { VNode, createVNode } from "./vnode";

/****** TS类型声明 start ******/
export interface App<HostElement = any> {}

export type CreateAppFunction<HostElement> = (
  rootComponent: Component
) => App<HostElement>
/****** TS类型声明 end ******/

export function createAppAPI<HostElement>(render: RootRenderFunction): CreateAppFunction<HostElement> {
  return  function createApp (rootComponent) {
    const app: App = {
      mount(rootContainer: HostElement): any {
        // 创建vnode
        const vnode = createVNode(rootComponent) as VNode
        // 调用renderer文件baseCreateRenderer函数里的 render 函数。开始真正的patch
        render(vnode, rootContainer)
      }
    }
    return app
  }
}
