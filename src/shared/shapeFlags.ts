// 组件的类型标记
export const enum ShapeFlags {
    ELEMENT = 1, // element 类型
    STATEFUL_COMPONENT = 1 << 2, // 4 普通组件类型
    TEXT_CHILDREN = 1 << 3, // 8 vnode 的 children 为 string 类型
    ARRAY_CHILDREN = 1 << 4, // 16 vnode 的 children 为数组类型
    SLOTS_CHILDREN = 1 << 5, // 32 vnode 的 children 为 slots 类型
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT // 4 组件类型
  }
