/**
 * useHistory.spec.ts — 撤销/重做栈单测。
 *
 * 覆盖：push/undo/redo/reset、容量上限、snapshot/pushSnapshot、深拷贝隔离。
 * 适配新 API：useHistory(current: Ref) 必传 ref；push() 无参（快照来自闭包 current）；
 * undo()/redo() 返回 boolean 并直接修改 current.value；reset() 清空。
 */
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useHistory } from '@/composables/useHistory'
import type { PageSchema } from '@/types/schema'

function schema(id: string, type = 'LubanPage'): PageSchema {
  return { root: { id, type, props: {}, children: [] } }
}

describe('useHistory', () => {
  it('初始态不可 undo/redo', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    expect(h.canUndo.value).toBe(false)
    expect(h.canRedo.value).toBe(false)
  })

  it('push 后可 undo，undo 后 current 回到上一态', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    h.push() // 记录当前态 v1（在 mutate 前调用）
    cur.value = schema('v2') // mutate
    expect(h.canUndo.value).toBe(true)
    expect(h.undo()).toBe(true)
    expect(cur.value.root.id).toBe('v1')
    expect(h.canRedo.value).toBe(true)
  })

  it('redo 恢复', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    h.push()
    cur.value = schema('v2')
    h.undo()
    expect(cur.value.root.id).toBe('v1')
    expect(h.redo()).toBe(true)
    expect(cur.value.root.id).toBe('v2')
  })

  it('新 push 清空 redo 栈', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    cur.value = schema('v2')
    h.push()
    h.undo()
    expect(h.canRedo.value).toBe(true)
    // 新变更
    cur.value = schema('v3')
    h.push()
    expect(h.canRedo.value).toBe(false)
  })

  it('容量上限 50 丢最旧', () => {
    const cur = ref(schema('v0'))
    const h = useHistory(cur)
    for (let i = 1; i <= 55; i++) {
      cur.value = schema(`v${i}`)
      h.push()
    }
    // 只能 undo 50 次（容量上限）
    let count = 0
    while (h.undo()) count++
    expect(count).toBe(50)
  })

  it('snapshot + pushSnapshot 两步式（mutation 成功后才入栈）', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    const prev = h.snapshot() // 捕获变更前
    cur.value = schema('v2')
    h.pushSnapshot(prev) // 确认变更成功后入栈
    expect(h.canUndo.value).toBe(true)
    h.undo()
    expect(cur.value.root.id).toBe('v1')
  })

  it('reset 清空', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    cur.value = schema('v2')
    h.push()
    cur.value = schema('v3')
    h.push()
    h.reset()
    expect(h.canUndo.value).toBe(false)
    expect(h.canRedo.value).toBe(false)
  })

  it('undo 无栈返回 false', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    expect(h.undo()).toBe(false)
  })

  it('快照深拷贝（不串扰）', () => {
    const cur = ref(schema('v1'))
    const h = useHistory(cur)
    cur.value = schema('v2')
    h.push()
    cur.value.root.id = 'mutated'
    h.undo()
    // 推入的快照应保持原值（v2），不受后续 mutation 影响
    expect(cur.value.root.id).toBe('v2')
  })
})
