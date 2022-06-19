import { RendererOptions } from "../runtime-core/renderer";
const doc = document
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },
  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement: (tag) => {
    return doc.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  createText: text => doc.createTextNode(text),
  parentNode: node => node.parentNode as Element | null,
  nextSibling: node => node.nextSibling,
}
