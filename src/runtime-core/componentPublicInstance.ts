import { ComponentInternalInstance } from "./component"
import { EMPTY_OBJ, hasOwn } from "../shared"

export type ComponentPublicInstance = {}
/****** TTS类型声明 start ******/
export interface ComponentRenderContext {
  [key: string]: any,
  _: ComponentInternalInstance
}
export type CreateComponentPublicInstance<P = {}, B = {}> = {}
/****** TS类型声明 end ******/

// 对 instance 组件实例访问的代理拦截 this.xxx = ....
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key) {
    const { setupState, props } = instance
    // render访问setup数据拦截
    // 如何在 render 函数里方法setup数据就是在这一步实现的
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)){
      return setupState[key]
    } else if (props !== EMPTY_OBJ && hasOwn(props, key )){
      return props![key]
    }
  },
  set({ _: instance }: ComponentRenderContext, key: string | symbol, value: any): boolean {
    const { setupState } = instance

    // 在render里设置 setup 的数据是在这一步实现的
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      setupState[key] = value
    }
    return true
  }
}
