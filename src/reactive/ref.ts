import { Dep } from "./dep";
import { trackEffects, triggerEffect } from "./effect";
import {reactive, toRaw} from "./reactive";
import {hasChange, isObject} from "../shared";

type RefBase<T> = {
  dep?: Dep
  value: T
}
interface Ref<T = any> {
  value: T
}

export function isRef(r: any): r is Ref {
  return Boolean(r && r.__v__isRef === true)
}

// 触发Ref依赖收集
function triggerRefValue(ref: RefBase<any>) {
  if (ref.dep) {
    triggerEffect(ref.dep)
  }
}
// 收集Ref依赖
function trackRefValue(ref: RefBase<any>) {
  if (!ref.dep) { // 如果没有dep 初始化一个set
    ref.dep = new Set()
  }
  trackEffects(ref.dep)
}

function cover<T extends unknown>(value: T) {
  // 对象转换reactive
  return isObject(value) ? reactive(value) : value
}

class RefImpl<T> {
  private _value: T // 实际存储的地方
  private _rawValue: T // 原始值
  public dep?: Dep = undefined // 存储依赖，Set结构
  public readonly __v__isRef = true // ref 标记
  /*
  * shallow true 浅渲染， false 深渲染
  *  */
  constructor(value: T, public readonly _shallow = false) {
    // TODO 浅渲染逻辑未实现
    this._rawValue = this._shallow ? value : toRaw(value)
    // cover函数 如果是个对象调用reactive方法，不是的话。返回原值
    this._value = this._shallow ? value : cover(value)
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value;
  }

  set value(newValue) {
    // 值不同，再触发更新，新旧值相同不会触发更新
    if (hasChange(newValue, this._rawValue)) {
      // 必须先赋值再出发依赖，否则拿到的是旧值
      this._value = this._shallow ? newValue : cover(newValue);
      this._rawValue = newValue;
      // 派发依赖更新
      triggerRefValue(this)
    }
  }
}
/*
* shallow true 浅渲染， false 深渲染
*  */
function createRef(rawValue: any, shallow = false) {
  // 如果已经是响应式了，直接返回就行了
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

// ref 实现
export function ref(value?:unknown) {
  return createRef(value)
}
