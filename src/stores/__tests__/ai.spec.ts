/**
 * ai.spec.ts — AI 会话状态机 store 单测。
 *
 * 适配新 API：pushUserMessage/consumeEvent/confirmApply/confirmReject/setFailed/clearAll；
 * 字段 content（非 text）/role: assistant（非 ai）/hasPending（非 isAwaitingConfirm）/sessionId（非 pendingSessionId）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore } from '@/stores/ai'

describe('useAiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始 idle', () => {
    const ai = useAiStore()
    expect(ai.status).toBe('idle')
    expect(ai.messages).toHaveLength(0)
    expect(ai.isGenerating).toBe(false)
  })

  it('pushUserMessage 推入用户消息并置 generating', () => {
    const ai = useAiStore()
    ai.pushUserMessage('做一个按钮页')
    expect(ai.status).toBe('generating')
    expect(ai.isGenerating).toBe(true)
    expect(ai.messages).toHaveLength(1)
    expect(ai.messages[0].role).toBe('user')
    expect(ai.messages[0].content).toBe('做一个按钮页')
  })

  it('consumeEvent(progress) 累计进度步骤', () => {
    const ai = useAiStore()
    ai.pushUserMessage('x')
    ai.consumeEvent({ type: 'progress', ts: 1, message: '检索物料…' })
    expect(ai.pendingSteps).toHaveLength(1)
  })

  it('consumeEvent(confirm 终态) 置 awaiting_confirm + 待确认 schema', () => {
    const ai = useAiStore()
    const schema = { root: { id: 'r', type: 'LubanPage', props: {}, children: [] } }
    ai.pushUserMessage('x')
    ai.consumeEvent({ type: 'confirm', session_id: 'sess-1', schema })
    expect(ai.status).toBe('awaiting_confirm')
    expect(ai.hasPending).toBe(true)
    expect(ai.pendingSchema).toStrictEqual(schema)
    expect(ai.sessionId).toBe('sess-1')
  })

  it('confirmApply 清空待确认', () => {
    const ai = useAiStore()
    ai.pushUserMessage('x')
    ai.consumeEvent({ type: 'confirm', session_id: 's', schema: { root: { id: 'r', type: 'LubanPage', props: {}, children: [] } } })
    ai.confirmApply()
    expect(ai.status).toBe('applied')
    expect(ai.pendingSchema).toBeNull()
  })

  it('confirmReject', () => {
    const ai = useAiStore()
    ai.pushUserMessage('x')
    ai.consumeEvent({ type: 'confirm', session_id: 's', schema: { root: { id: 'r', type: 'LubanPage', props: {}, children: [] } } })
    ai.confirmReject()
    expect(ai.status).toBe('rejected')
  })

  it('setFailed 置 error', () => {
    const ai = useAiStore()
    ai.setFailed('校验失败')
    expect(ai.status).toBe('failed')
    expect(ai.error).toBe('校验失败')
  })

  it('clearAll 清空', () => {
    const ai = useAiStore()
    ai.pushUserMessage('x')
    ai.consumeEvent({ type: 'progress', ts: 1, message: 'y' })
    ai.clearAll()
    expect(ai.status).toBe('idle')
    expect(ai.messages).toHaveLength(0)
  })

  it('状态机流转 idle→generating→awaiting_confirm→applied', () => {
    const ai = useAiStore()
    ai.pushUserMessage('x')
    expect(ai.status).toBe('generating')
    ai.consumeEvent({ type: 'confirm', session_id: 's', schema: { root: { id: 'r', type: 'LubanPage', props: {}, children: [] } } })
    expect(ai.status).toBe('awaiting_confirm')
    ai.confirmApply()
    expect(ai.status).toBe('applied')
  })
})
