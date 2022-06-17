import { ComponentInternalInstance, currentInstance, LifecycleHooks } from "./component"

// 给组件实例注入生命周期钩子
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null
): Function | undefined {
  if (target) {
    // 获取target类型上的函数钩子，可以是多个，多个就是一个数组
    const hooks = target[type] || (target[type] = [])
    const wrappedHook = (...args: unknown[]) => {
      // 执行钩子
      hook(args)
    }
    hooks.push(wrappedHook)
    return  wrappedHook
  }
}

// 创建生命周期钩子
export const createHook = <T extends Function = () => any >(lifecycle: LifecycleHooks) =>
  (hook: T, target: ComponentInternalInstance | null = currentInstance) =>
    injectHook(lifecycle, hook, target)

// 函数柯里化
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMount = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
