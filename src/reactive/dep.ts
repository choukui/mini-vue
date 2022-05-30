import { ReactiveEffect } from "./effect";

export type Dep = Set<ReactiveEffect>;

export const createDep = (effect?: ReactiveEffect[]): Dep => {
  return new Set<ReactiveEffect>(effect) as Dep
}

