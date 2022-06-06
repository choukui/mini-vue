import { ComponentInternalInstance } from "./component"
import { VNode } from "./vnode"

export function renderComponentRoot(instance: ComponentInternalInstance): VNode {
  let result: any
  const { render, proxy } = instance
  const proxyToUse = proxy
  // 这里要改变render函数的this指向, 才能访问组件实例 this.xxx = ...
  result = render?.call(proxyToUse, proxyToUse!)
  return result
}
