export type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
  >
export type EmitsOptions = ObjectEmitsOptions | string[]
