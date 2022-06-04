import { createVNode } from "../runtime-core/vnode";
import { isArray, isObject } from "../shared";
import { isVNode } from "../runtime-core/vnode";

export function h(type: any, propsOrChildren?: any, children?: any) {
  const l = arguments.length

  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // propsOrChildren 是 props
      return createVNode(type, propsOrChildren)
    } else {
      // 第二个参数是children, 没有prop
      // eg: h('div', 'hello world')
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      // 如果参数大于三个，从第二个之后的都认为是 children
      children = Array.prototype.slice.call(arguments, 2)
    } else if (isVNode(children)) {
      children = [ children ]
    }
    // children 都是数组了
    return createVNode(type, propsOrChildren, children)
  }
}
