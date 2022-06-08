import { CreateComponentPublicInstance } from "./componentPublicInstance"

export type ComponentOptions<Props = {}, RawBindings = any> =
  ComponentOptionsBase<Props, RawBindings> & ThisType<CreateComponentPublicInstance<{},
  RawBindings>>

export interface ComponentOptionsBase<Props, RawBindings> {
  render?: Function
  name?: string
  setup?: () => RawBindings
}
