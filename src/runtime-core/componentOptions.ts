export type ComponentOptions<Props = {}, RawBindings = any> = ComponentOptionsBase<RawBindings>

export interface ComponentOptionsBase<RawBindings> {
  render?: Function,
  setup?: () => RawBindings
}
