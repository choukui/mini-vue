import { ComponentInternalInstance } from "./component";

export interface SchedulerJob extends Function {
  id?: number
  active?: boolean
  computed?: boolean
  allowRecurse?: boolean
  ownerInstance?: ComponentInternalInstance
}
