import { RendererOptions } from "../runtime-core/renderer";
const doc = document
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  insert: (child, parent) => {
    parent.insertBefore(child, null)
  },
  createElement: (tag) => {
    const el = doc.createElement(tag)
    return el
  }
}
