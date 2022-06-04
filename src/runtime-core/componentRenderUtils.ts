import { ComponentInternalInstance } from "./component";
import { VNode } from "./vnode";

export function renderComponentRoot(instance: ComponentInternalInstance): VNode {
  let result: any
  const { vnode, render } = instance
  result = render?.call({}, {})
  return result
}
