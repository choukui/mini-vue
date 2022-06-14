import { ComponentInternalInstance } from "./component";
/********** TS类型声明 start ***********/
export interface SchedulerJob extends Function {
  id?: number
  active?: boolean
  computed?: boolean
  allowRecurse?: boolean
  ownerInstance?: ComponentInternalInstance
}
/********** TS类型声明 end ***********/
const resolvedPromise: Promise<any> = Promise.resolve()
let currentFlushPromise: Promise<void> | null = null
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
