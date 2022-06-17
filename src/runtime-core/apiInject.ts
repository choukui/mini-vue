import { currentInstance } from "./component";

export interface InjectionKey<T> extends Symbol {}
export function provide<T>(key: InjectionKey<T> | string | number, value: T) {
  if (currentInstance) {
    // 获取当实例上的provides
    let provides = currentInstance.provides

    // 默认情况下，实例继承其父级的provides对象，
    // 但当它需要provide自己的值时，
    // 它会使用父级provide对象作为原型创建自己的provide对象。
    // 通过这种方式，在“inject”中，我们可以简单地查找来自直接父级的注入，并让原型链完成工作。

    // 获取父组件的provides
    const parentProvides = currentInstance.parent && currentInstance.parent.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
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
