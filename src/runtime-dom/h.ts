import { createVNode } from "../runtime-core/vnode";

export function h(type: any) {
  return createVNode(type)
}
