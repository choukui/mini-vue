import { RendererOptions } from "../runtime-core/renderer";
const doc = document
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  insert: (child, parent) => {
    parent.insertBefore(child, null)
  },
  createElement: (tag) => {
    return doc.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  createText: text => doc.createTextNode(text),
  parentNode: node => node.parentNode as Element | null,
}
