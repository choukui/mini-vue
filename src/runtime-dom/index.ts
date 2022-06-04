import { Renderer, createRenderer } from "../runtime-core/renderer";

// 缓存renderer
let renderer: Renderer<Element | ShadowRoot>

// 默认渲染项
const rendererOptions = {}

function ensureRenderer () {
  return (renderer || (renderer = createRenderer(rendererOptions)))
}

// 创建APP
export const createApp = (...args: any[]) => {
  const app = ensureRenderer().createApp(args)
  console.log(app);
  return app
}
