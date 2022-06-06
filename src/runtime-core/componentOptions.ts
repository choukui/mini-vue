export type ComponentOptions<RawBindings = any> = ComponentOptionsBase<RawBindings>

export interface ComponentOptionsBase<RawBindings> {
  render?: Function,
  setup?: () => RawBindings
}
