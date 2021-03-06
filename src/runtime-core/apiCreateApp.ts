import { RootRenderFunction } from "./renderer"
import { Component } from "./component"
import { ComponentOptions } from "./componentOptions"
import { VNode, createVNode } from "./vnode"
import { ComponentPublicInstance } from "./componentPublicInstance"
import { InjectionKey } from "./apiInject"

/****** TS类型声明 start ******/
export interface App<HostElement = any> {
  mixin(mixin: ComponentOptions): this,
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance
  _context: AppContext,
  provide<T>(key: InjectionKey<T> | string, value: T): this
}

export type CreateAppFunction<HostElement> = (
  rootComponent: Component
) => App<HostElement>

export interface AppContext {
  mixins: ComponentOptions[]
  provides: Record<string | symbol, any>
}
/****** TS类型声明 end ******/

// 创建app上下文，全局属性会挂载到appContext上
export function createAppContext(): AppContext {
  return {
    mixins: [],
    provides: Object.create(null),
  }
}

export function createAppAPI<HostElement>(render: RootRenderFunction): CreateAppFunction<HostElement> {
  return  function createApp (rootComponent, rootProps = null) {
    const context = createAppContext()
    const app: App = {
      _context: context, // 上下文
      // App的mixin实现
      // 注意：不是组件里的mixins选项
      mixin(mixin: ComponentOptions): App {
        // mixin 保存在上下文的mixins里了
        if (!context.mixins.includes(mixin)) {
          context.mixins.push(mixin)
        }
        return app
      },
      // 挂载
      mount(rootContainer: HostElement): any {
        // 创建vnode
        const vnode = createVNode(rootComponent, rootProps) as VNode

        // 根节点上下文context复制给appContext，被所有组件共享
        vnode.appContext = context
        // 调用renderer文件baseCreateRenderer函数里的 render 函数。开始真正的patch
        render(vnode, rootContainer)
      },

      // app.provide()
      provide(key, value){
        context.provides[key as string] = value
        return app
      }
    }
    return app
  }
}
