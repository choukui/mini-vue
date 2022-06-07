import { ComponentInternalInstance } from "./component"
import { Data } from "./component";
import { shallowReactive } from "../reactive/reactive";

// 初始化props
export function initProps (instance: ComponentInternalInstance, rawProps: Data | null,) {
  /**
   * 如果组件声明了props, 那么才会进入到props里，
   * 没有被声明的props，则会保存在attrs里
   * attrs: 储存没有被声明 props
   * props: 储存 props
   * */
  const props: Data = {}
  const attrs: Data = {}

  // 暂时只考虑props的情况
  // props 转换为一个浅渲染的reactive
  if (rawProps) {
    instance.props = shallowReactive(rawProps)
  }
}
