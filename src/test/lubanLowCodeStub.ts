/**
 * lubanLowCodeStub.ts — engine 本地测试 stub，模拟 luban-low-code 的运行时导出。
 *
 * 背景：engine node_modules 中 luban-low-code 是指向 luban-ui 源码包的 symlink，
 * dist 未构建，运行时（vite dev / vitest）无法解析。vitest.config.ts 把
 * `luban-low-code` alias 到本文件，使 PageEditor.vue 的 `import { ... } from 'luban-low-code'`
 * 在测试环境解析到本 stub。
 *
 * 生产 build（vite build）走 vite.config.ts，不经此 alias，由真实 node_modules 解析。
 *
 * 本 stub 提供：
 *   - LubanDesigner / LubanPage 占位组件（渲染标记 div，并把 emit hooks 暴露给测试）
 *   - getComponentMeta / getPaletteGroups / reorderRootChildren / isContainerType
 *     行为与真实实现一致的最小子集
 *
 * 测试通过 resetLubanStub() 在 beforeEach 重置 hooks 与 fixtures。
 */
import { defineComponent, h, type Component } from 'vue'

export interface MetaFixture {
  label?: string
  defaultProps?: Record<string, unknown>
  isContainer?: boolean
}

/** 默认物料 meta fixture；测试可覆盖。 */
export const metaFixture: Record<string, MetaFixture> = {
  LubanButton: { label: '按钮', defaultProps: { text: '按钮', type: 'default' } },
  LubanInput: { label: '输入框', defaultProps: { placeholder: '请输入' } },
  LubanContainer: { label: '容器', defaultProps: {}, isContainer: true },
}

/**
 * emit hooks：PageEditor 在模板上为 LubanDesigner 绑定 @select/@add-node/@reorder。
 * 测试无法直接拿到组件实例的 emit，故 stub 内部把每次 setup 捕获的 emit 函数
 * 注册到这里，供测试触发（模拟画布点击/拖入/排序）。
 */
export const designerEmitHooks: {
  select: ((id: string | null) => void) | null
  addNode: ((type: string, parentId?: string) => void) | null
  reorder: ((from: number, to: number) => void) | null
} = { select: null, addNode: null, reorder: null }

/** 最近一次 LubanDesigner 收到的 props（供断言 design-mode/schema）。 */
export const designerPropsHolder: { current: Record<string, unknown> | null } = {
  current: null,
}

export function resetLubanStub(): void {
  designerEmitHooks.select = null
  designerEmitHooks.addNode = null
  designerEmitHooks.reorder = null
  designerPropsHolder.current = null
}

export const LubanDesigner = defineComponent({
  name: 'LubanDesignerStub',
  props: {
    schema: { type: Object, default: null },
    designMode: { type: Boolean, default: false },
    showToolbar: { type: Boolean, default: true },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:schema', 'select', 'add-node', 'reorder'],
  setup(props, { emit }) {
    designerPropsHolder.current = props
    designerEmitHooks.select = (id) => emit('select', id)
    designerEmitHooks.addNode = (type, parentId) => emit('add-node', type, parentId)
    designerEmitHooks.reorder = (from, to) => emit('reorder', from, to)
    return () =>
      h('div', {
        class: 'designer-stub',
        'data-design-mode': String(props.designMode),
      })
  },
}) as unknown as Component

export const LubanPage = defineComponent({
  name: 'LubanPageStub',
  props: { schema: { type: Object, default: null } },
  setup(props) {
    return () => h('div', { class: 'page-stub' }, JSON.stringify(props.schema?.root?.id ?? ''))
  },
}) as unknown as Component

export function getComponentMeta(type: string) {
  const m = metaFixture[type]
  if (!m) return undefined
  return {
    name: type,
    label: m.label ?? type,
    defaultProps: m.defaultProps,
    propSchema: {},
  }
}

export function getPaletteGroups() {
  return [
    {
      category: '基础',
      items: [
        { type: 'LubanButton', label: '按钮' },
        { type: 'LubanInput', label: '输入框' },
      ],
    },
  ]
}

export function reorderRootChildren(
  schema: { root: { children?: unknown[] } },
  fromIdx: number,
  toIdx: number,
): void {
  const children = schema.root.children
  if (!children) return
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= children.length || toIdx >= children.length) return
  const [moved] = children.splice(fromIdx, 1)
  children.splice(toIdx, 0, moved)
}

export function isContainerType(type: string): boolean {
  return metaFixture[type]?.isContainer === true
}

// 兼容 PageEditor 未直接使用但可能被间接引用的导出（占位）
export const canAcceptChild = (type: string): boolean => isContainerType(type)

/** 节点 id 生成（PageEditor.onAddNode 调用）。stub 返回固定格式 id。 */
export function genNodeId(prefix = 'n'): string {
  return `${prefix}-stub-${Math.random().toString(36).slice(2, 10)}`
}

// === PageEditor 调用的 schema 树操作（与 schemaTree.ts 逻辑一致的最小实现）===
type SchemaNode = { id: string; type: string; props?: Record<string, unknown>; children?: SchemaNode[]; events?: Record<string, unknown> }

export function findNode(root: SchemaNode, id: string): SchemaNode | null {
  if (root.id === id) return root
  if (root.children) {
    for (const c of root.children) {
      const found = findNode(c, id)
      if (found) return found
    }
  }
  return null
}

export function insertNode(root: SchemaNode, node: SchemaNode, parentId?: string): boolean {
  if (!parentId || root.id === parentId) {
    if (!root.children) root.children = []
    root.children.push(node)
    return true
  }
  if (root.children) {
    for (const c of root.children) {
      if (insertNode(c, node, parentId)) return true
    }
  }
  return false
}

export function removeNode(root: SchemaNode, id: string): boolean {
  if (root.children) {
    const idx = root.children.findIndex((c) => c.id === id)
    if (idx >= 0) { root.children.splice(idx, 1); return true }
    for (const c of root.children) { if (removeNode(c, id)) return true }
  }
  return false
}

export function moveNode(root: SchemaNode, nodeId: string, toParentId: string | null, toIdx: number): boolean {
  let moved: SchemaNode | null = null
  function extract(n: SchemaNode): boolean {
    if (n.children) {
      const idx = n.children.findIndex((c) => c.id === nodeId)
      if (idx >= 0) { moved = n.children.splice(idx, 1)[0]; return true }
      for (const c of n.children) { if (extract(c)) return true }
    }
    return false
  }
  if (!extract(root) || !moved) return false
  const host = toParentId ? findNode(root, toParentId) : root
  if (!host) return false
  if (!host.children) host.children = []
  host.children.splice(Math.min(toIdx, host.children.length), 0, moved)
  return true
}

export function duplicateNode(root: SchemaNode, nodeId: string): string | null {
  const node = findNode(root, nodeId)
  if (!node) return null
  function findParent(n: SchemaNode): SchemaNode | null {
    if (n.children) {
      if (n.children.some((c) => c.id === nodeId)) return n
      for (const c of n.children) { const p = findParent(c); if (p) return p }
    }
    return null
  }
  const parent = findParent(root)
  if (!parent || !parent.children) return null
  const clone = JSON.parse(JSON.stringify(node)) as SchemaNode
  clone.id = genNodeId(node.type)
  const idx = parent.children.findIndex((c) => c.id === nodeId)
  parent.children.splice(idx + 1, 0, clone)
  return clone.id
}

export function updateNodeProps(root: SchemaNode, nodeId: string, props: Record<string, unknown>): boolean {
  const node = findNode(root, nodeId)
  if (!node) return false
  node.props = { ...(node.props ?? {}), ...props }
  return true
}

/** 层级操作（z-index 语义在 schema 里靠 children 顺序，stub 做端点移动）*/
export function bringToFront(root: SchemaNode, nodeId: string): void {
  const idx = root.children?.findIndex((c) => c.id === nodeId) ?? -1
  if (idx >= 0 && root.children) {
    const [m] = root.children.splice(idx, 1)
    root.children.push(m)
  }
}

export function sendToBack(root: SchemaNode, nodeId: string): void {
  const idx = root.children?.findIndex((c) => c.id === nodeId) ?? -1
  if (idx >= 0 && root.children) {
    const [m] = root.children.splice(idx, 1)
    root.children.unshift(m)
  }
}

export function getSnippetById(_id: string): SchemaNode | null {
  return null
}

// === V2-T4 响应式纯逻辑（与 luban-low-code 真实实现一致的最小子集）===
export const BREAKPOINTS = { tablet: 1024, mobile: 768 } as const

export function resolveResponsiveProps(
  node: { style?: Record<string, string>; responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> } },
  breakpoint: 'desktop' | 'tablet' | 'mobile'
): Record<string, string> {
  const desktop = { ...(node.style ?? {}) }
  if (breakpoint === 'desktop') return desktop
  const responsive = node.responsive ?? {}
  if (breakpoint === 'tablet') {
    return { ...desktop, ...(responsive.tablet ?? {}) }
  }
  return { ...desktop, ...(responsive.tablet ?? {}), ...(responsive.mobile ?? {}) }
}

export function hasResponsiveOverrides(node: { responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> } }): boolean {
  const r = node.responsive
  if (!r) return false
  return (r.tablet ? Object.keys(r.tablet).length : 0) + (r.mobile ? Object.keys(r.mobile).length : 0) > 0
}

function toKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
}

function styleToDecls(style: Record<string, string>): string {
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${toKebab(k)}: ${v};`)
    .join(' ')
}

export function nodeResponsiveCss(node: { id: string; responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> } }): string {
  if (!node.responsive) return ''
  const selector = `[data-lb-node="${node.id}"]`
  const rules: string[] = []
  if (node.responsive.tablet && Object.keys(node.responsive.tablet).length > 0) {
    const decls = styleToDecls(node.responsive.tablet)
    if (decls) rules.push(`@media (max-width: ${BREAKPOINTS.tablet}px) { ${selector} { ${decls} } }`)
  }
  if (node.responsive.mobile && Object.keys(node.responsive.mobile).length > 0) {
    const decls = styleToDecls(node.responsive.mobile)
    if (decls) rules.push(`@media (max-width: ${BREAKPOINTS.mobile}px) { ${selector} { ${decls} } }`)
  }
  return rules.join('\n')
}

export function treeResponsiveCss(root: { responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> }; children?: unknown[] }): string {
  const parts: string[] = []
  function walk(node: { id?: string; responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> }; children?: unknown[] }): void {
    if (node.id) {
      const css = nodeResponsiveCss(node as { id: string; responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> } })
      if (css) parts.push(css)
    }
    if (node.children) {
      for (const c of node.children) walk(c as { id?: string; responsive?: { tablet?: Record<string, string>; mobile?: Record<string, string> }; children?: unknown[] })
    }
  }
  walk(root)
  return parts.join('\n')
}

// === V2-T5 动画 stub（纯逻辑子集）===
const ANIM_KEYFRAMES: Record<string, string> = {
  fade: `@keyframes lb-anim-fade { from { opacity: 0; } to { opacity: 1; } }`,
  'slide-up': `@keyframes lb-anim-slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }`,
  'slide-left': `@keyframes lb-anim-slide-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }`,
  zoom: `@keyframes lb-anim-zoom { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`,
  flip: `@keyframes lb-anim-flip { from { opacity: 0; transform: perspective(400px) rotateY(90deg); } to { opacity: 1; transform: perspective(400px) rotateY(0); } }`,
}

export function buildAnimationCss(nodeId: string, anim: { type?: string; duration?: number; delay?: number; easing?: string; trigger?: string } | undefined): string {
  if (!anim || !anim.type || !ANIM_KEYFRAMES[anim.type]) return ''
  const type = anim.type
  const duration = anim.duration ?? 600
  const delay = anim.delay ?? 0
  const easing = anim.easing ?? 'ease-out'
  const trigger = anim.trigger ?? 'load'
  const selector = `[data-lb-node="${nodeId}"]`
  const kf = ANIM_KEYFRAMES[type]
  const animProps = `lb-anim-${type} ${duration}ms ${easing} ${delay}ms both`
  if (trigger === 'hover') return `${kf}\n${selector}:hover { animation: ${animProps}; }`
  if (trigger === 'in-view') return `${kf}\n${selector}.lb-anim-pending { opacity: 0; }\n${selector}.lb-anim-playing { animation: ${animProps}; }`
  return `${kf}\n${selector} { animation: ${animProps}; }`
}

export function isValidAnimation(anim: { type?: string } | undefined): boolean {
  return !!(anim && anim.type && ANIM_KEYFRAMES[anim.type])
}

export function treeAnimationCss(root: { id?: string; animation?: { type?: string; duration?: number; delay?: number; easing?: string; trigger?: string }; children?: unknown[] }): string {
  const parts: string[] = []
  const seen = new Set<string>()
  function walk(node: { id?: string; animation?: { type?: string; duration?: number; delay?: number; easing?: string; trigger?: string }; children?: unknown[] }): void {
    if (node.id && node.animation) {
      const css = buildAnimationCss(node.id, node.animation)
      if (css) {
        const type = node.animation.type
        if (type) {
          if (seen.has(type)) {
            parts.push(css.replace(ANIM_KEYFRAMES[type], '').trim())
          } else {
            seen.add(type)
            parts.push(css)
          }
        }
      }
    }
    if (node.children) {
      for (const c of node.children) walk(c as { id?: string; animation?: { type?: string; duration?: number; delay?: number; easing?: string; trigger?: string }; children?: unknown[] })
    }
  }
  walk(root)
  return parts.join('\n')
}

export function collectInViewNodes(root: { id?: string; animation?: { trigger?: string; type?: string }; children?: unknown[] }): { id: string }[] {
  const out: { id: string }[] = []
  function walk(node: { id?: string; animation?: { trigger?: string; type?: string }; children?: unknown[] }): void {
    if (node.id && node.animation?.trigger === 'in-view' && node.animation.type) {
      out.push({ id: node.id })
    }
    if (node.children) {
      for (const c of node.children) walk(c as { id?: string; animation?: { trigger?: string; type?: string }; children?: unknown[] })
    }
  }
  walk(root)
  return out
}

export function useAnimationObserver(): { observe: () => void; disconnect: () => void } {
  return { observe: () => {}, disconnect: () => {} }
}

// === useHistory stub（PageEditor 动态加载后调用，测试需可 swallow）===
// 接口与 engine 自己的 useHistory.ts 对齐：push(current)/undo()/redo()/canUndo/canRedo/current
export function useHistory<T>(initial: T) {
  const past: T[] = []
  const future: T[] = []
  const current = { value: initial }
  return {
    current,
    canUndo: { get value() { return past.length > 0 } },
    canRedo: { get value() { return future.length > 0 } },
    push: (val: T) => { past.push(JSON.parse(JSON.stringify(current.value))); current.value = val; future.length = 0 },
    undo: () => { if (past.length) { future.push(JSON.parse(JSON.stringify(current.value))); current.value = past.pop()!; return true } return false },
    redo: () => { if (future.length) { past.push(JSON.parse(JSON.stringify(current.value))); current.value = future.pop()!; return true } return false },
    reset: () => { past.length = 0; future.length = 0 },
  }
}
