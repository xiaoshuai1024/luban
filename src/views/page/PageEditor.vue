<script setup lang="ts">
import { ref, computed, onMounted, watch, shallowRef, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import { getPage, savePage, createPage } from '@/api/page'
import type { PageSchema, NodeSchema } from '@/types/schema'
import { useDesignerKeyboard } from '@/composables/useDesignerKeyboard'

/**
 * T-eng-1: PageEditor 重写为完整 IDE 三栏布局
 *
 * 装配顺序（W1 接线）：
 *   T-eng-1: 布局骨架 + designMode=true（本文件）
 *   T-eng-2: DesignerToolbar emit 接线（undo/redo/device/mode/template/save）
 *   T-eng-3: PropertyPanel 接线（selectedNodeId → getComponentMeta → patch）
 *   T-eng-4: ComponentPanel 接线（HTML5 drag → add-node emit）
 *   T-eng-5: OutlineTree 接线（select/delete/duplicate/reorder）
 *   T-eng-6: ContextMenu + useDesignerKeyboard 全局快捷键
 *   T-eng-7: CodeEditor 接线（代码模式双向绑定）
 *
 * 所有 luban-low-code 组件通过动态 import 加载（避免引擎硬依赖）。
 */

type DeviceType = 'pc' | 'tablet' | 'mobile'
type EditorMode = 'design' | 'preview' | 'code'
type MenuAction = 'copy' | 'paste' | 'delete' | 'bring-front' | 'send-back' | 'move-up' | 'move-down'

// ===== 动态加载的 luban-low-code 模块 =====
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LubanLowCodeModule {
  LubanDesigner: any
  DesignerToolbar: any
  PropertyPanel: any
  ComponentPanel: any
  OutlineTree: any
  ContextMenu: any
  CodeEditor: any
  useHistory: (initial: PageSchema) => {
    current: { value: PageSchema }
    push: (s: PageSchema) => void
    undo: () => void
    redo: () => void
    canUndo: { value: boolean }
    canRedo: { value: boolean }
    reset: (s: PageSchema) => void
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getComponentMeta: (type: string) => any | undefined
  findNode: (root: NodeSchema, id: string) => NodeSchema | null
  findParent: (root: NodeSchema, childId: string) => NodeSchema | null
  removeNode: (root: NodeSchema, id: string) => boolean
  duplicateNode: (root: NodeSchema, id: string) => NodeSchema | null
  moveNode: (root: NodeSchema, id: string, direction: 'up' | 'down') => boolean
  insertNode: (root: NodeSchema, node: NodeSchema, parentId: string, index?: number) => boolean
  updateNodeProps: (root: NodeSchema, id: string, patch: Record<string, unknown>) => boolean
  bringToFront: (root: NodeSchema, id: string) => boolean
  sendToBack: (root: NodeSchema, id: string) => boolean
  genNodeId: (type: string) => string
}

const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.siteId as string)
const pageId = computed(() => route.params.pageId as string)
const isNew = computed(() => route.name === 'PageNew' || route.meta.isNew)

// ===== 页面元数据 =====
const pageName = ref('')
const pagePath = ref('')
const loading = ref(false)
const saving = ref(false)
const designerError = ref<string | null>(null)

// ===== 动态加载的组件引用 =====
const LubanDesignerC = shallowRef<unknown>(null)
const DesignerToolbarC = shallowRef<unknown>(null)
const PropertyPanelC = shallowRef<unknown>(null)
const ComponentPanelC = shallowRef<unknown>(null)
const OutlineTreeC = shallowRef<unknown>(null)
const ContextMenuC = shallowRef<unknown>(null)
const CodeEditorC = shallowRef<unknown>(null)

// ===== luban-low-code 工具函数（加载后赋值） =====
const llc = shallowRef<LubanLowCodeModule | null>(null)

// ===== 设计器状态 =====
const schema = ref<PageSchema | null>(null)
const selectedNodeId = ref<string | null>(null)
const designMode = ref(true) // 🔑 关键修复：设计模式默认开启
const editorMode = ref<EditorMode>('design') // design / preview / code
const device = ref<DeviceType>('pc')
const leftPanelCollapsed = ref(false)
const rightPanelCollapsed = ref(false)

// ===== 历史栈（useHistory 加载后赋值） =====
const history = ref<ReturnType<LubanLowCodeModule['useHistory']> | null>(null)
const canUndo = computed(() => history.value?.canUndo.value ?? false)
const canRedo = computed(() => history.value?.canRedo.value ?? false)

// ===== 右键菜单状态 =====
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNodeId = ref<string | null>(null)

// ===== 剪贴板（用于 copy/paste） =====
const clipboard = shallowRef<NodeSchema | null>(null)

// ===== 当前选中的节点元数据（给 PropertyPanel） =====
const selectedNodeMeta = computed(() => {
  if (!schema.value || !selectedNodeId.value || !llc.value) return null
  const node = llc.value.findNode(schema.value.root, selectedNodeId.value)
  if (!node) return null
  return llc.value.getComponentMeta(node.type) ?? null
})

const selectedNodeProps = computed(() => {
  if (!schema.value || !selectedNodeId.value) return {}
  const node = llc.value?.findNode(schema.value.root, selectedNodeId.value)
  return node?.props ?? {}
})

const selectedNodeStyle = computed(() => {
  if (!schema.value || !selectedNodeId.value) return {}
  const node = llc.value?.findNode(schema.value.root, selectedNodeId.value)
  return (node?.style as Record<string, unknown>) ?? {}
})

// ===== 断点映射（device → breakpoint） =====
const breakpoint = computed(() => {
  if (device.value === 'mobile') return 'mobile' as const
  if (device.value === 'tablet') return 'tablet' as const
  return 'desktop' as const
})

// ===== 画布宽度（设备预览） =====
const canvasWidth = computed(() => {
  if (device.value === 'mobile') return '375px'
  if (device.value === 'tablet') return '768px'
  return '100%'
})

// ===== 加载 luban-low-code 模块 =====
onMounted(async () => {
  try {
    const m = (await import(/* @vite-ignore */ 'luban-low-code')) as unknown as LubanLowCodeModule
    llc.value = m
    LubanDesignerC.value = m.LubanDesigner
    DesignerToolbarC.value = m.DesignerToolbar
    PropertyPanelC.value = m.PropertyPanel
    ComponentPanelC.value = m.ComponentPanel
    OutlineTreeC.value = m.OutlineTree
    ContextMenuC.value = m.ContextMenu
    CodeEditorC.value = m.CodeEditor

    // 初始化历史栈（schema 加载后）
    if (schema.value) {
      history.value = m.useHistory(schema.value)
    }
  } catch {
    designerError.value = '未安装 luban-low-code，无法使用页面设计器。'
  }
})

// schema 加载后初始化历史栈
watch(schema, (val) => {
  if (val && llc.value && !history.value) {
    history.value = llc.value.useHistory(val)
  }
}, { immediate: false })

// ===== 注册全局快捷键 =====
useDesignerKeyboard({
  undo: () => doUndo(),
  redo: () => doRedo(),
  canUndo,
  canRedo,
  selectedNodeId,
  onDelete: () => deleteSelected(),
  onCopy: () => copySelected(),
  onDuplicate: () => duplicateSelected(),
  onSave: () => handleSave(),
  onEsc: () => {
    selectedNodeId.value = null
    contextMenuVisible.value = false
  },
})

// ===== 页面加载 =====
async function loadPage() {
  if (!siteId.value || (isNew.value ? false : !pageId.value)) return
  loading.value = true
  try {
    if (isNew.value) {
      pageName.value = ''
      pagePath.value = ''
      schema.value = {
        root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
      }
    } else {
      const { data } = await getPage(siteId.value, pageId.value)
      pageName.value = data.name
      pagePath.value = data.path
      schema.value = data.schema ?? {
        root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
      }
    }
  } catch {
    schema.value = { root: { id: 'root', type: 'LubanContainer', props: {}, children: [] } }
  } finally {
    loading.value = false
  }
}

// ===== schema 变更 → 同步到 history（debounce 500ms，避免连续 @input 过多快照）=====
let historyTimer: ReturnType<typeof setTimeout> | null = null
function onSchemaUpdate(newSchema: PageSchema | null) {
  if (!newSchema) return
  schema.value = newSchema
  // 推入历史栈（undo/redo 时跳过，避免循环；debounce 避免连续输入过多快照）
  if (history.value && !isUndoRedoing.value) {
    if (historyTimer) clearTimeout(historyTimer)
    historyTimer = setTimeout(() => {
      history.value!.push(JSON.parse(JSON.stringify(schema.value)))
      historyTimer = null
    }, 500)
  }
}

// ===== 选中节点 =====
function onSelectNode(nodeId: string | null) {
  selectedNodeId.value = nodeId
}

// ===== 从组件库添加节点 =====
function onAddNode(type: string, parentId?: string) {
  if (!schema.value || !llc.value) return
  const meta = llc.value.getComponentMeta(type)
  const newNode: NodeSchema = {
    id: llc.value.genNodeId(type),
    type,
    props: meta?.defaultProps ? JSON.parse(JSON.stringify(meta.defaultProps)) : {},
    children: [],
  }
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const targetParentId = parentId ?? 'root'
  llc.value.insertNode(root, newNode, targetParentId)
  const newSchema = { ...schema.value, root }
  onSchemaUpdate(newSchema)
  // 自动选中新节点
  selectedNodeId.value = newNode.id
}

// ===== 属性面板 patch 回写 =====
function onPropUpdate(patch: Record<string, unknown>) {
  if (!schema.value || !selectedNodeId.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  llc.value.updateNodeProps(root, selectedNodeId.value, patch)
  onSchemaUpdate({ ...schema.value, root })
}

function onStyleUpdate(patch: Record<string, unknown>) {
  if (!schema.value || !selectedNodeId.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const node = llc.value.findNode(root, selectedNodeId.value)
  if (node) {
    node.style = { ...(node.style ?? {}), ...patch }
  }
  onSchemaUpdate({ ...schema.value, root })
}

// ===== 撤销/重做 =====
const isUndoRedoing = ref(false)

function doUndo() {
  if (!history.value) return
  history.value.undo()
  if (history.value.current.value) {
    isUndoRedoing.value = true
    schema.value = JSON.parse(JSON.stringify(history.value.current.value))
    nextTick(() => { isUndoRedoing.value = false })
  }
}

function doRedo() {
  if (!history.value) return
  history.value.redo()
  if (history.value.current.value) {
    isUndoRedoing.value = true
    schema.value = JSON.parse(JSON.stringify(history.value.current.value))
    nextTick(() => { isUndoRedoing.value = false })
  }
}

// ===== 复制/粘贴/克隆/删除 =====
function copySelected() {
  if (!schema.value || !selectedNodeId.value || !llc.value) return
  const node = llc.value.findNode(schema.value.root, selectedNodeId.value)
  if (node) {
    clipboard.value = JSON.parse(JSON.stringify(node))
  }
}

function pasteNode() {
  if (!schema.value || !clipboard.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const newNode = JSON.parse(JSON.stringify(clipboard.value)) as NodeSchema
  newNode.id = llc.value.genNodeId(newNode.type)
  llc.value.insertNode(root, newNode, 'root')
  onSchemaUpdate({ ...schema.value, root })
  selectedNodeId.value = newNode.id
}

function duplicateSelected() {
  if (!schema.value || !selectedNodeId.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const cloned = llc.value.duplicateNode(root, selectedNodeId.value)
  if (cloned) {
    onSchemaUpdate({ ...schema.value, root })
    selectedNodeId.value = cloned.id
  }
}

function deleteSelected() {
  if (!schema.value || !selectedNodeId.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  llc.value.removeNode(root, selectedNodeId.value)
  onSchemaUpdate({ ...schema.value, root })
  selectedNodeId.value = null
}

function deleteNode(nodeId: string) {
  if (!schema.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  llc.value.removeNode(root, nodeId)
  onSchemaUpdate({ ...schema.value, root })
  if (selectedNodeId.value === nodeId) selectedNodeId.value = null
}

function duplicateNode(nodeId: string) {
  if (!schema.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const cloned = llc.value.duplicateNode(root, nodeId)
  if (cloned) {
    onSchemaUpdate({ ...schema.value, root })
  }
}

function moveNodeReorder(nodeId: string, direction: 'up' | 'down') {
  if (!schema.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  llc.value.moveNode(root, nodeId, direction)
  onSchemaUpdate({ ...schema.value, root })
}

// ===== 跨容器移动节点 =====
function onMoveNode(
  nodeId: string,
  _fromParentId: string | null,
  toParentId: string | null,
  toIndex: number
) {
  if (!schema.value || !llc.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  const node = llc.value.findNode(root, nodeId)
  if (!node) return
  // 先从原位置移除
  llc.value.removeNode(root, nodeId)
  // 插入到目标父节点
  const targetParent = toParentId ? llc.value.findNode(root, toParentId) : root
  if (targetParent) {
    if (!targetParent.children) targetParent.children = []
    targetParent.children.splice(toIndex, 0, JSON.parse(JSON.stringify(node)))
  }
  onSchemaUpdate({ ...schema.value, root })
}

// ===== root 级重排 =====
function onReorder(fromIndex: number, toIndex: number) {
  if (!schema.value) return
  const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
  if (!root.children) return
  const [moved] = root.children.splice(fromIndex, 1)
  root.children.splice(toIndex, 0, moved)
  onSchemaUpdate({ ...schema.value, root })
}

// ===== 右键菜单 =====
function onContextMenu(x: number, y: number, nodeId: string) {
  contextMenuX.value = x
  contextMenuY.value = y
  contextMenuNodeId.value = nodeId
  selectedNodeId.value = nodeId
  contextMenuVisible.value = true
}

function onContextMenuAction(action: MenuAction) {
  contextMenuVisible.value = false
  const nodeId = contextMenuNodeId.value
  if (!nodeId) return
  switch (action) {
    case 'copy':
      copySelected()
      break
    case 'paste':
      pasteNode()
      break
    case 'delete':
      deleteNode(nodeId)
      break
    case 'bring-front':
      if (schema.value && llc.value) {
        const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
        llc.value.bringToFront(root, nodeId)
        onSchemaUpdate({ ...schema.value!, root })
      }
      break
    case 'send-back':
      if (schema.value && llc.value) {
        const root = JSON.parse(JSON.stringify(schema.value.root)) as NodeSchema
        llc.value.sendToBack(root, nodeId)
        onSchemaUpdate({ ...schema.value!, root })
      }
      break
    case 'move-up':
      moveNodeReorder(nodeId, 'up')
      break
    case 'move-down':
      moveNodeReorder(nodeId, 'down')
      break
  }
}

// ===== 工具栏事件 =====
function onToolbarUndo() { doUndo() }
function onToolbarRedo() { doRedo() }
function onToolbarDevice(d: DeviceType) { device.value = d }
function onToolbarMode(m: EditorMode) {
  editorMode.value = m
  // 预览模式关闭 designMode
  designMode.value = m === 'design'
}
function onToolbarSave() { handleSave() }

// ===== CodeEditor 双向绑定 =====
function onCodeUpdate(newSchema: PageSchema) {
  onSchemaUpdate(newSchema)
}

// ===== 保存 =====
async function handleSave() {
  if (!schema.value || !siteId.value) return
  if (!pageName.value || !pagePath.value) {
    ElMessage.warning('请填写页面名称和路径')
    return
  }
  saving.value = true
  try {
    if (isNew.value) {
      const { data } = await createPage(siteId.value, {
        name: pageName.value,
        path: pagePath.value,
        schema: schema.value,
      })
      ElMessage.success('创建成功')
      router.replace(`/sites/${siteId.value}/pages/${data.id}`)
    } else {
      await savePage(siteId.value, pageId.value, {
        name: pageName.value,
        path: pagePath.value,
        schema: schema.value,
      })
      ElMessage.success('保存成功')
    }
  } catch (e) {
    ElMessage.error((e as Error).message || '保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push(`/sites/${siteId.value}/pages`)
}

onMounted(loadPage)
watch([siteId, pageId], loadPage)
</script>

<template>
  <div class="page-editor" v-loading="loading">
    <!-- 加载错误 -->
    <div v-if="designerError" class="page-editor__error-banner">
      <p>{{ designerError }}</p>
      <p v-if="schema" class="hint">当前 Schema 已加载，保存时将一并提交。</p>
    </div>

    <!-- 完整 IDE 布局 -->
    <div v-else-if="schema" class="page-editor__ide">
      <!-- ===== 顶栏 ===== -->
      <header class="page-editor__topbar">
        <!-- 左侧：返回 + 页面元信息 -->
        <div class="page-editor__meta-left">
          <ElButton text @click="goBack">← 返回</ElButton>
          <ElInput v-model="pageName" placeholder="页面名称" class="meta-input" />
          <ElInput v-model="pagePath" placeholder="/path" class="meta-input meta-path" />
        </div>

        <!-- 中间：DesignerToolbar（撤销/重做/设备/模式） -->
        <div class="page-editor__toolbar" v-if="DesignerToolbarC">
          <component
            :is="DesignerToolbarC"
            :can-undo="canUndo"
            :can-redo="canRedo"
            :device="device"
            :mode="editorMode"
            :saving="saving"
            @undo="onToolbarUndo"
            @redo="onToolbarRedo"
            @switch-device="onToolbarDevice"
            @switch-mode="onToolbarMode"
            @save="onToolbarSave"
          />
        </div>

        <!-- 右侧：保存按钮 -->
        <div class="page-editor__meta-right">
          <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
        </div>
      </header>

      <!-- ===== 主体三栏 ===== -->
      <div class="page-editor__body">
        <!-- 左栏：组件库 -->
        <aside
          class="page-editor__left"
          :class="{ 'page-editor__left--collapsed': leftPanelCollapsed }"
        >
          <button
            class="page-editor__collapse-btn"
            @click="leftPanelCollapsed = !leftPanelCollapsed"
            :title="leftPanelCollapsed ? '展开组件库' : '收起组件库'"
          >
            {{ leftPanelCollapsed ? '▶' : '◀' }}
          </button>
          <div v-if="!leftPanelCollapsed && ComponentPanelC" class="page-editor__component-panel">
            <component :is="ComponentPanelC" @add-node="(type: string) => onAddNode(type)" />
          </div>
        </aside>

        <!-- 中间：画布 -->
        <main class="page-editor__canvas-area">
          <div class="page-editor__canvas-wrapper" :style="{ maxWidth: canvasWidth }">
            <!-- 设计/预览模式：LubanDesigner -->
            <component
              v-if="LubanDesignerC && editorMode !== 'code'"
              :is="LubanDesignerC"
              v-model:schema="schema"
              v-model:selected-node-id="selectedNodeId"
              :design-mode="designMode"
              :breakpoint="breakpoint"
              :show-toolbar="false"
              placeholder="从左侧拖拽组件到此处"
              @add-node="(type: string, parentId?: string) => onAddNode(type, parentId)"
              @select="(id: string | null) => onSelectNode(id)"
              @copy="(id: string) => { selectedNodeId = id; copySelected() }"
              @delete="(id: string) => deleteNode(id)"
              @reorder="(from: number, to: number) => onReorder(from, to)"
              @move-node="(id: string, from: string | null, to: string | null, idx: number) => onMoveNode(id, from, to, idx)"
              @context-menu="(x: number, y: number, id: string) => onContextMenu(x, y, id)"
            />
            <!-- 代码模式：CodeEditor -->
            <component
              v-else-if="CodeEditorC && editorMode === 'code'"
              :is="CodeEditorC"
              :model-value="schema"
              @update:modelValue="(val: PageSchema) => onCodeUpdate(val)"
            />
          </div>
        </main>

        <!-- 右栏：属性面板 + 大纲树 -->
        <aside
          class="page-editor__right"
          :class="{ 'page-editor__right--collapsed': rightPanelCollapsed }"
        >
          <button
            class="page-editor__collapse-btn"
            @click="rightPanelCollapsed = !rightPanelCollapsed"
            :title="rightPanelCollapsed ? '展开属性面板' : '收起属性面板'"
          >
            {{ rightPanelCollapsed ? '◀' : '▶' }}
          </button>
          <div v-if="!rightPanelCollapsed" class="page-editor__right-content">
            <!-- 属性面板（上半） -->
            <div class="page-editor__property-panel" v-if="PropertyPanelC">
              <component
                :is="PropertyPanelC"
                :node-meta="selectedNodeMeta"
                :model-value="selectedNodeProps"
                :style-value="selectedNodeStyle"
                @update:modelValue="(patch: Record<string, unknown>) => onPropUpdate(patch)"
                @update:styleValue="(patch: Record<string, unknown>) => onStyleUpdate(patch)"
              />
            </div>
            <!-- 大纲树（下半） -->
            <div class="page-editor__outline-tree" v-if="OutlineTreeC">
              <div class="page-editor__panel-title">大纲</div>
              <component
                :is="OutlineTreeC"
                :schema="schema"
                :selected-id="selectedNodeId"
                @select="(id: string) => onSelectNode(id)"
                @delete="(id: string) => deleteNode(id)"
                @duplicate="(id: string) => duplicateNode(id)"
                @reorder="(id: string, dir: 'up' | 'down') => moveNodeReorder(id, dir)"
              />
            </div>
          </div>
        </aside>
      </div>

      <!-- ===== 右键菜单 ===== -->
      <component
        v-if="ContextMenuC"
        :is="ContextMenuC"
        :visible="contextMenuVisible"
        :x="contextMenuX"
        :y="contextMenuY"
        :can-paste="!!clipboard"
        @action="(a: MenuAction) => onContextMenuAction(a)"
        @close="contextMenuVisible = false"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
  overflow: hidden;
}

.page-editor__error-banner {
  padding: 24px;
  color: #f56c6c;
  text-align: center;

  .hint {
    color: #909399;
    font-size: 12px;
    margin-top: 8px;
  }
}

.page-editor__ide {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-height: 0;
}

// ===== 顶栏 =====
.page-editor__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  gap: 12px;
}

.page-editor__meta-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .meta-input {
    width: 180px;
  }

  .meta-path {
    width: 140px;
  }
}

.page-editor__toolbar {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.page-editor__meta-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

// ===== 主体三栏 =====
.page-editor__body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

// 左栏
.page-editor__left {
  position: relative;
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;

  &--collapsed {
    width: 32px;
  }
}

.page-editor__component-panel {
  width: 260px;
  height: 100%;
  overflow-y: auto;
}

// 中间画布
.page-editor__canvas-area {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  overflow: auto;
  background: #f0f2f5;
}

.page-editor__canvas-wrapper {
  width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  min-height: 600px;
  margin: 0 auto;
  transition: max-width 0.3s ease;
}

// 右栏
.page-editor__right {
  position: relative;
  width: 320px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;

  &--collapsed {
    width: 32px;
  }
}

.page-editor__right-content {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-editor__property-panel {
  flex: 1;
  overflow-y: auto;
  border-bottom: 1px solid #e4e7ed;
  min-height: 200px;
}

.page-editor__outline-tree {
  height: 280px;
  flex-shrink: 0;
  overflow-y: auto;
}

.page-editor__panel-title {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

// 折叠按钮
.page-editor__collapse-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 20px;
  height: 40px;
  border: 1px solid #e4e7ed;
  background: #fff;
  cursor: pointer;
  font-size: 10px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }
}

// 左栏的折叠按钮在右边
.page-editor__left .page-editor__collapse-btn {
  right: 0;
  border-radius: 4px 0 0 4px;
}

// 右栏的折叠按钮在左边
.page-editor__right .page-editor__collapse-btn {
  left: 0;
  border-radius: 0 4px 4px 0;
}
</style>
