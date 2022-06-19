import { createAppAPI } from "./apiCreateApp";
import { VNode, VNodeArrayChildren, normalizeVNode, Text, isSameVNodeType } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";
import {
  setupComponent,
  createComponentInstance,
  ComponentInternalInstance
} from "./component"
import { updateProps } from "./componentProps"
import { ShapeFlags, invokeArrayFns, EMPTY_ARR } from "../shared"
import { ReactiveEffect } from "../reactive/effect"
/********** TS类型声明 start ***********/
export const enum MoveType {
  ENTER,
  LEAVE,
  REORDER
}
export interface RendererNode {
  [key: string]: any
}

export interface RendererElement extends RendererNode {}

export interface Renderer<HostElement = RendererElement> {
  render: any,
  createApp: any
}
export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: VNode | null,
  container: HostElement
) => void

export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  createElement(type: string): HostElement
  setElementText(node: HostElement, text: string): void
  createText(text: string): HostNode,
  parentNode(node: HostNode): HostElement | null,
  remove(el: HostNode): void,
  nextSibling(node: HostNode): HostNode | null
}

type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  start?: number | undefined
) => void

type ProcessTextOrCommentFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => void

type PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null
) => void

type UnmountChildrenFn = (
  children: VNode[],
  parentComponent: ComponentInternalInstance | null,
  start?: number | undefined
) => void

type UnmountFn = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
) => void

type NextFn = (vnode: VNode) => RendererNode | null

type PatchFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor?: RendererNode | null,
  parentComponent?: ComponentInternalInstance | null
) => void

type RemoveFn = (vnode: VNode) => void

type MoveFn = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  type: MoveType
) => void

export type MountComponentFn = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null
) => void

export type SetupRenderEffectFn = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) => void
/********** TS类型声明 end ***********/

export function createRenderer<HostNode = RendererNode, HostElement = RendererElement>(
  options:RendererOptions<HostNode, HostElement>
) {
  return baseCreateRenderer(options)
}


function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
  >(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>
function baseCreateRenderer(
  options: RendererOptions
): any {

  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
  } = options

  const patch: PatchFn = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 === n2) { return }
    // n2 是新的vnode，应该基于n2的类型判断
    const { type, shapeFlag } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理普通元素类型
          processElement(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 处理组件类型
          processComponent(n1, n2, container, anchor, parentComponent)
        }
    }

  }

  // 处理组件类型
  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null
  ) => {
    if (n1 == null) {
      // 挂载组件
      mountComponent(n2, container, anchor, parentComponent)
    } else {
      // 更新组件
      updateComponent(n1, n2)
    }
  }

  // 挂载组件
  const mountComponent: MountComponentFn = (
    initialVNode,
    container,
    anchor,
    parentComponent
  ) => {
    const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))
    /*
      * 1、为instance设置 render 函数
      * 2、初始化data props methods等
      * 3、初始化生命周期函数
      * 4、执行了 beforeCreate / created 生命周期
      * */
    setupComponent(instance)

    // 建立更新机制
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  // 更新组件
  const updateComponent = (n1: VNode, n2: VNode) => {
    // instance是旧component
    const instance = (n2.component = n1.component)!
    // instance.next指向新节点n2
    instance.next = n2
    instance.update()
  }

  // 处理元素类型
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null
  ) => {
    // 没有旧节点，挂载元素
    if (n1 == null) {
      mountElement(n2, container, anchor, parentComponent)
    } else {
      patchElement(n1, n2, parentComponent)
    }
  }

  // 挂载普通 html 元素
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null
    ) => {
    let el: RendererElement
    const { shapeFlag } = vnode
    // 创建dom元素
    el = vnode.el = hostCreateElement(vnode.type)

    // 如果子元素是个文本, 插入到父元素中
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children as string)
    } if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children as VNodeArrayChildren, el, anchor, parentComponent)
    }
    // dom插入操作，将el插入到container中
    hostInsert(el, container, anchor)
  }

  // 更新元素
  const patchElement = (n1: VNode, n2: VNode, parentComponent: ComponentInternalInstance | null) => {
    // 更新新节点上的el
    const el = (n2.el = n1.el!)
    patchChildren(n1, n2, el, null, parentComponent)
  }

  // 更新children
  const patchChildren: PatchChildrenFn = (
    n1,
    n2,
    container,
    anchor,
    parentComponent
  ) => {
    const { shapeFlag } = n2
    const c1 = n1 && n1.children // old children
    const c2 = n2.children // new children
    const prevShapeFlag = n1 ? n1.shapeFlag : 0 // old shapeFlag
    // 新节点text文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧节点children是个数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 卸载旧节点 children
      }
      // 更新text
      if (c2 !== c1) {
        hostSetElementText(container, c2 as string)
      }
    } else {
      // 旧节点的children是个数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新节点的children是个数组
        if (shapeFlag && ShapeFlags.ARRAY_CHILDREN) {
          // 两个数组 就改比较更新了
          // 这里应该是pathKeyedChildren, diff 算法还没实现，先用暴力更新的吧
          // patchUnkeyedChildren(c1 as VNode[], c2 as VNodeArrayChildren, parentComponent, container)
          patchKeyedChildren(
            c1 as VNode[],
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent
          )
        } else {
          //  没有新节点，直接卸载旧节点的children
          unmountChildren(c1 as VNode[], parentComponent)
        }
      } else {
        // 新节点不是文本，旧节点是个文本,清除旧节点
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        // 新节点是个数组，开始挂载
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2 as VNodeArrayChildren, container,anchor, parentComponent)
        }
      }
    }
  }


  // 有key子节点更新 diff算法
  const patchKeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    parentAnchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null
  ) => {
    /*
    * 名词解释和功能注解
    * 1、c1: 旧的vnode
    * 2、c2: 新的vnode
    * 3、isSameVNodeType 判断是否同一个节点(key & type 都相等，认为是同一个节点)*/

    let i = 0 // 指向新旧序列开始的位置
    let l2 = c2.length // 新序列的长度
    let e1 = c1.length - 1 // 新序列的结束位置
    let e2 = l2 - 1 // 旧序列的结束位置

    // 1、从左侧向右开始遍历, 如果节点不同则退出while循环
    // (a b) c
    // (a b) d e
    // i <= 2 && i <= 3
    while (i <= e1 && i <= e2) {
      const n1= c1[i]
      const n2 = c2[i] as VNode
      // 如果新旧节点相同，则进行patch处理
      if (isSameVNodeType(n1, n2)) {
        // patch 更新children
        patch(n1, n2, container, null, parentComponent)
      } else {
        // 不相同则跳过
        break
      }
      i++
    }

    // 2、从右向左遍历，如果节点不同则退出while循环
    // a (b c)
    // d e (b c)
    // i <= 2 && i <= 3
    // 结束后：e1 = 0, e2 = 1
    while (i <= e1 && i <= e2) {
      const n1= c1[i]
      const n2 = c2[i] as VNode
      // 如果新旧节点相同，则进行patch处理
      if (isSameVNodeType(n1, n2)) {
        // patch 更新children
        patch(n1, n2, container, null, parentComponent)
      } else {
        // 不相同则跳过
        break
      }
      e1--
      e2--
    }

    //3、 相同部分遍历结束，新序列有多有vnode，进行挂载
    if (i > e1) { // 大于旧节点的长度且小于新节点的长度部分就需要创建新的vnode
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor
        while (i <= e2) {
          // 创建新节点
          patch(null, c2[i] as VNode, container, anchor, parentComponent)
          i++
        }
      }
    }
    // 4、卸载旧序列多余vnode
    else if (i > e2) { // i 大于旧序列长度并且小于新序列长度，证明旧序列有多余的vnode需要卸载
      while (i <= e1) {
        // 卸载旧vnode
        unmount(c1[i], parentComponent)
        i++
      }
    } else {
      //  5. 乱序情况
      const s1 = i // prev starting index
      const s2 = i // next starting index

      // 5.1 build key:index map for newChildren
      // 首先为新的子节点构建在新的子序列中 key：index 的映射
      // 通过map 创建的新的子节点
      const keyToNewIndexMap: Map<string | number | symbol, number> = new Map()
      // 遍历新的vnode 为新的vnode设置key
      for ( i = s2; i < e2; i++) {
        const nextChild = c2[i] as VNode
        if (nextChild.key != null) {
          // 例如：c2 = a b [e d c h] f g
          // 那么：keyToNewIndexMap = e:2 d:3 c:4 h:5
          // [...]里的vnode是本次要遍历的节点
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }
      // 5.2
      // 从旧的子节点的左侧开始循环遍历进行patch。
      // 并且patch匹配的节点 并移除不存在的节点

      /**
       * 程序执行到这里，我们假设一下前置前置条件, 方便理解
       * old vnode: c1 =  a   b   [   c   d   e   f  ]  g   h
       *                             s1=2        e1=5
       * new vnode: c2 =  a   b   [   d   e   c   i  ]   g   h
       *                            s2=2        e2=5
       * 需要移动的节点：c d e
       * 需要卸载的节点：f
       * 需要新增的节点：i
       * [...]里是这次需要patch的child
       * s1 = 2 => c, e1 = 5 => f
       * s2 = d => c, e2 = 5 => i
       * [e d c h]是本次需要patch的节点, a、b、f、g节点在前面已经patch过了
       * */

      let j

      // 已经patch的节点个数
      let patched = 0

      // 需要patch的节点数量
      // 根据我们假设的c2序列，得出patch的数量是4，toBePatched = 4
      const toBePatched = e2 - s2 + 1

      // 用于判断节点是否需要移动
      // 当新旧序列出现可复用节点交叉时，moved = true
      let moved = false

      // 用于记录节点是否已经移动
      let maxNewIndexSoFar = 0

      // 新下标与旧下标的map映射
      // 数组的index是新vnode的索引, value是老vnode的索引。
      const newIndexToOldIndexMap = new Array(toBePatched)

      // 初始化所有下标为0
      // [0,0,0,0] 由上一步计算得出toBePatched = 4, 所以初始化一个length为4的数组
      for (i = 0; i < toBePatched; i++) {
        // 数组所有元素设置为0
        newIndexToOldIndexMap[i] = 0
      }

      // 遍历旧序列 起点是s1 终点是e1
      for ( i = s1; i < e1; i++) {
        const prevChild = c1[i] // 旧序列的child
        // 如果已经patch的数量 >= 需要进行patch的数量
        if (patched >= toBePatched) {
          // 这里说明所有新的节点已经patch了，旧的节点都可以移除了
          unmount(prevChild, parentComponent)
          continue // 跳过，进行下次循环
        }

        let newIndex // 旧节点在新序列里的下标
        // 如果旧节点的key是存在的，通过keyToNewIndexMap获取prevChild在新序列里的下标newIndex
        if (prevChild.key != null) {
          // 旧节点肯定有key, 根据旧节点的key获取相同类型的新节点在新序列中的位置
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 如果旧节点没有key，会查找没有key的且类型相同的新节点在新序列中的位置
          for ( j = s2; j <= e2; j++) { // 遍历剩下的所有新节点
            if (newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j] as VNode)) {
              // 获取到相同类型节点的下标
              newIndex = j
              break
            }
          }
        }

        if (newIndex === undefined) {
          // 如果执行到这里，没有找到旧节点在新序列c2中的下标
          // 需要卸载旧结节
          unmount(prevChild, parentComponent)
        } else {
          /**
           *
           * old vnode: c1 =  a   b   [   c   d   e   f  ]  g   h
           *                             s1=2        e1=5
           * new vnode: c2 =  a   b   [   d   e   c   i  ]   g   h
           *                            s2=2        e2=5
           * 需要移动的节点：c d e
           * 需要卸载的节点：f
           * 需要新增的节点：i
           * */

          // 根据newIndex开始构建keyToNewIndexMap, 明确新旧节点对应的下标位置
          // ***newIndex是根据旧节点获取其在新序列中的下标***
          // newIndexToOldIndexMap =  [ 2, 3, 4, 0]
          newIndexToOldIndexMap[newIndex - s2] = i + 1


          // 判断是否需要移动
          // 如果newIndex是一直递增的，那么不需要移动
          // 如果newIndex比上一次的newIndex也就是maxNewIndexSoFar小，那么表示有节点需要移动位置
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          // 进行patch
          patch(prevChild, c2[newIndex] as VNode, container, null, parentComponent)

          // patched自增 记录已经patch数量
          patched ++
        }
      }

      // 5.3 move & mount
      // 只有当节点需要移动时，生成最长递增子序列
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR
      j = increasingNewIndexSequence.length - 1 // 最长子序列的指针
      // 从右向左遍历 以便于可以用最新的被patch的节点作为锚点
      for ( i = toBePatched - 1; i >= 0 ; i--) {
        const nextIndex = s2 + i // 下一个节点的位置，用于移动DOM
        const nextChild = c2[nextIndex] // 找到新的vnode

        const anchor =
          nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor
        if (newIndexToOldIndexMap[i] === 0) { // 情况1: 该节点是全新节点
          // mount new
          // 挂载新的
          patch(
            null,
            nextChild as VNode,
            container,
            anchor,
            parentComponent
          )
        } else if (moved) {
          // 如果没有最长递增子序列或者 当前节点不在递增子序列中间
          // 则移动节点
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 情况2，不是递增子序列，该节点需要移动
            move(nextChild as VNode, container, anchor, MoveType.REORDER)
          } else {
            // 情况3，是递增子序列，该节点不需要移动
            // 让j指向下一个
            j--
          }
        }
      }
    }

  }

  // 无key子节点更新
  const patchUnkeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    parentComponent: ComponentInternalInstance | null,
    anchor: RendererNode | null,
    container: RendererElement
  ) => {
    c1 = c1 || EMPTY_ARR
    c2 = c2 || EMPTY_ARR
    // 获得新旧节点的长度
    const oldLength = c1.length
    const newLength = c2.length
    // 找到两个数组length最小的，作为公共长度
    const commonLength = Math.min(oldLength, newLength)
    // 循环patch公共部分
    for (let i = 0; i < commonLength; i++) {
      const nextChild = c2[i]
      patch(c1[i], nextChild as VNode, container, null, parentComponent)
    }
    // 循环结束后，如果oldLength 大于 commonLength
    // 证明old children里多余的元素要卸载
    if (oldLength > commonLength) {
      // 移除旧节点
      unmountChildren(c1, parentComponent, commonLength)
    } else {
      // 挂载新节点
      mountChildren(c2, container, anchor, parentComponent, commonLength)
    }
  }

  // 卸载子组件
  const unmountChildren: UnmountChildrenFn = (
    children,
    parentComponent,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent)
    }
  }

  // 卸载组件
  const unmount: UnmountFn = (vnode) => {
    const { shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 卸载组件
      unmountComponent(vnode.component!)
    } else {
     // 删除el
      remove(vnode)
    }
  }

  const unmountComponent = (instance: ComponentInternalInstance) => {

    const { bum, um } = instance

    // beforeUnmount hook
    if (bum) {
      invokeArrayFns(bum)
    }
    const { subTree } = instance
    unmount(subTree, instance)
    // unmount hook
    if (um) {
      invokeArrayFns(um)
    }
  }

  // 删除节点
  const remove:RemoveFn = (vnode) => {
    const { el } = vnode
    hostRemove(el!)
  }

  // 移动节点
  const move: MoveFn = (vnode, container, anchor, moveType) => {
    const { el, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.COMPONENT) {
      move(vnode.component!.subTree, container, anchor, moveType)
      return
    }
    hostInsert(el!, container, anchor)
  }

  // 挂载子组件
  const mountChildren: MountChildrenFn = (
    children,
    container,
    anchor,
    parentComponent,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i])
      patch(null, child, container, anchor, parentComponent)
    }
  }

  const getNextHostNode: NextFn = vnode => {
    if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
      return getNextHostNode(vnode.component!.subTree)
    }
    return hostNextSibling((vnode.anchor || vnode.el)!)
  }

  // 处理文本节点
  const processText: ProcessTextOrCommentFn = (n1, n2, container, anchor) => {
    if (n1 == null) { // 新增
      hostInsert(
        (n2.el = hostCreateText(n2.children as string)),
        container,
        anchor
      )
    }
  }

  const updateComponentPreRender = (instance: ComponentInternalInstance, nextVNode: VNode) => {
    // const prevProps = instance.vnode.props
    // nextVNode.props 新props, prevProps 旧props
    updateProps(instance, nextVNode.props)
  }

  // 建立更新机制
  const setupRenderEffect: SetupRenderEffectFn = (
    instance,
    initialVNode,
    container,
    anchor
  ) => {
    // 当响应式对象更新时，会重新执行componentUpdateFn函数来更新视图
    const componentUpdateFn = () => {
      // 第一次挂载组件
      if (!instance.isMounted) {

        const { bm, m } = instance

        // beforeMount hook
        if (bm) {
          invokeArrayFns(bm)
        }

        // 创建 vnode,并保存在组件实例上
        const subTree = (instance.subTree = renderComponentRoot(instance))
        patch(null, subTree, container, anchor, instance)

        // mounted
        if (m) {
          invokeArrayFns(m)
        }
        instance.isMounted = true
      } else {
        // 组件更新
        let { next, vnode, bu, u } = instance
        if (next) {
          // 这里要更新props
          updateComponentPreRender(instance, next)
          next.el = vnode.el
        } else {
          next = vnode
        }
        // beforeUpdate hook
        if (bu) {
          invokeArrayFns(bu)
        }
        // 新的 vnode
        const nextTree = renderComponentRoot(instance)
        // 旧的 vnode
        const prevTree = instance.subTree
        // 更新实例上vnode
        instance.subTree = nextTree
        // 开始对比更新组件
        patch(prevTree, nextTree, hostParentNode(prevTree.el!)!, getNextHostNode(prevTree), instance)

        next.el = nextTree.el
        // updated hook
        if (u) {
          invokeArrayFns(u)
        }
      }
    }
    // *****建立响应式关系*****
    const effect = new ReactiveEffect(componentUpdateFn)
    // 重新绑定this指向
    // componentUpdateFn 赋值给instance.update 在updateComponent时还会调用
    const update = (instance.update = effect.run.bind(effect))
    // 第一次挂载时，这里要手动先执行下
    update()
  }

  // render 函数会被 mount 方法调用
  const render: RootRenderFunction = (vnode, container) =>  {
    if (vnode == null) {

    } else {
      patch(null, vnode, container, null, null)
    }
  }
  return {
    createApp: createAppAPI(render)
  }
}


// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

