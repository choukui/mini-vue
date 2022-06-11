import { RootRenderFunction } from "./renderer";
import { Component } from "./component";
import { ComponentOptions } from "./componentOptions";
import { VNode, createVNode } from "./vnode";

/****** TS类型声明 start ******/
export interface App<HostElement = any> {}

export type CreateAppFunction<HostElement> = (
  rootComponent: Component
) => App<HostElement>
export interface AppContext {
  mixins: ComponentOptions[]
}
/****** TS类型声明 end ******/

// 创建app上下文，全局属性会挂载到appContext上
export function createAppContext(): AppContext {
  return {
    mixins: []
  }
}

export function createAppAPI<HostElement>(render: RootRenderFunction): CreateAppFunction<HostElement> {
  return  function createApp (rootComponent, rootProps = null) {
    const app: App = {
      mount(rootContainer: HostElement): any {
        // 创建vnode
        const vnode = createVNode(rootComponent, rootProps) as VNode
        // 调用renderer文件baseCreateRenderer函数里的 render 函数。开始真正的patch
        render(vnode, rootContainer)
      }
    }
    return app
  }
}
