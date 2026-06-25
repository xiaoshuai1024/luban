import { onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'

/**
 * T-eng-6: 全局设计器快捷键
 *
 * 支持的快捷键：
 * - Ctrl/Cmd + Z     撤销
 * - Ctrl/Cmd + Shift + Z / Ctrl + Y  重做
 * - Ctrl/Cmd + C     复制选中节点
 * - Ctrl/Cmd + V     粘贴
 * - Ctrl/Cmd + D     克隆选中节点
 * - Delete / Backspace  删除选中节点
 * - Ctrl/Cmd + S     保存
 * - Esc              取消选中 / 关闭菜单
 *
 * 注意：当焦点在 input/textarea/contenteditable 中时不触发（避免与输入冲突）
 */

interface UseDesignerKeyboardOptions {
  undo: () => void
  redo: () => void
  canUndo: ComputedRef<boolean> | Ref<boolean>
  canRedo: ComputedRef<boolean> | Ref<boolean>
  selectedNodeId: Ref<string | null>
  onDelete: () => void
  onCopy: () => void
  onDuplicate: () => void
  onSave: () => void
  onEsc: () => void
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

export function useDesignerKeyboard(options: UseDesignerKeyboardOptions) {
  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName.toLowerCase()
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      target.isContentEditable
    )
  }

  function isMod(e: KeyboardEvent): boolean {
    // 跨平台：Mac 用 metaKey（Cmd），Windows/Linux 用 ctrlKey
    // 测试模拟可能用任意一个，所以两者都检查
    return e.metaKey || e.ctrlKey
  }

  function handleKeydown(e: KeyboardEvent) {
    // 输入框中不触发快捷键（除了 Esc）
    if (isEditableTarget(e.target) && e.key !== 'Escape') return

    const mod = isMod(e)

    // Ctrl/Cmd + S — 保存
    if (mod && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
      e.preventDefault()
      options.onSave()
      return
    }

    // Ctrl/Cmd + Z — 撤销
    if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z' || e.keyCode === 90)) {
      e.preventDefault()
      options.undo()
      return
    }

    // Ctrl/Cmd + Shift + Z 或 Ctrl + Y — 重做
    if (
      (mod && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
      (mod && (e.key === 'y' || e.key === 'Y' || e.keyCode === 89))
    ) {
      e.preventDefault()
      options.redo()
      return
    }

    // Ctrl/Cmd + C — 复制
    if (mod && (e.key === 'c' || e.key === 'C' || e.keyCode === 67)) {
      if (options.selectedNodeId.value) {
        e.preventDefault()
        options.onCopy()
      }
      return
    }

    // Ctrl/Cmd + D — 克隆
    if (mod && (e.key === 'd' || e.key === 'D' || e.keyCode === 68)) {
      if (options.selectedNodeId.value) {
        e.preventDefault()
        options.onDuplicate()
      }
      return
    }

    // Delete / Backspace — 删除选中
    if (
      (e.key === 'Delete' || e.key === 'Backspace' || e.keyCode === 46 || e.keyCode === 8) &&
      options.selectedNodeId.value
    ) {
      e.preventDefault()
      options.onDelete()
      return
    }

    // Esc — 取消选中
    if (e.key === 'Escape' || e.keyCode === 27) {
      options.onEsc()
      return
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
