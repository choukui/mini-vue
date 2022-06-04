import { Renderer, createRenderer } from "../runtime-core/renderer";
import { nodeOps } from "./nodeOps";
import { isString } from "../shared";
// 导出渲染函数
export { h } from './h'

// 缓存renderer
let renderer: Renderer<Element | ShadowRoot>

/**
 * 默认渲染项 有些原生的dom操作方法
 * insert creatElement 等
 * */
const rendererOptions = nodeOps

function ensureRenderer () {
  return (renderer || (renderer = createRenderer(rendererOptions)))
}

function normalizeContainer(container: Element | ShadowRoot | string): Element | null {
  if (isString(container)) {
    return document.querySelector(container)
  }
  return container as any
}

// 创建APP
export const createApp = (...args: any[]) => {
  const app = ensureRenderer().createApp(...args)

  const { mount } = app
  // 这里加强下mount
  app.mount = function (containerOrSelector: Element | ShadowRoot | string): any {
    // <div id='app'></div>
    const container = normalizeContainer(containerOrSelector)
    // container
    mount(container)
  }
  return app
}
