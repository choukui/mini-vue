export enum ReactiveFlags {
  RAW = '__v_raw' // 标记原始数据
}

export interface Target {
  [ReactiveFlags.RAW]?: any
}

// 返回响应式对象的原始数据
export function toRow<T>(observed: T): T {
  const raw = observed && (observed as  Target)[ReactiveFlags.RAW]
  return raw ? toRow(raw) : observed
}
