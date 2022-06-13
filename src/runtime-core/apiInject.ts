import { currentInstance } from "./component";

export interface InjectionKey<T> extends Symbol {}
export function provide<T>(key: InjectionKey<T> | string | number, value: T) {
  if (currentInstance) {
    let provides = currentInstance.provides
    // 实例继承其父对象的provides对象
    provides[key as string] = value
  }
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T,
  treatDefaultAsFactory?: false
): T
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory: true
): T
export function inject(key: InjectionKey<any> | string, defaultValue?: unknown) {
  const instance = currentInstance
  if (instance) {
    // instance.parent === null代表根组件
    const provides = instance.parent === null
      ? instance.vnode.appContext && instance.vnode.appContext.provides
      : instance.parent.provides
    if (provides && (key as string | symbol) in provides) {
      return provides[key as string]
    }
  }
}
