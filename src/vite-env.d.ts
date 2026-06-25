/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * luban-low-code 动态 import 类型声明
 * 实际模块通过 pnpm link 挂载到 workspace，运行时由 Vite 解析
 * 此声明仅让 vue-tsc 编译时通过（实际类型从运行时模块获取）
 */
declare module 'luban-low-code' {
  export const LubanDesigner: unknown
  export const DesignerToolbar: unknown
  export const PropertyPanel: unknown
  export const ComponentPanel: unknown
  export const OutlineTree: unknown
  export const ContextMenu: unknown
  export const CodeEditor: unknown
  export const useHistory: (initial: unknown) => unknown
  export const getComponentMeta: (type: string) => unknown
  export const findNode: (root: unknown, id: string) => unknown
  export const removeNode: (root: unknown, id: string) => boolean
  export const duplicateNode: (root: unknown, id: string) => unknown
  export const moveNode: (root: unknown, id: string, dir: 'up' | 'down') => boolean
  export const insertNode: (root: unknown, node: unknown, parentId: string, index?: number) => boolean
  export const updateNodeProps: (root: unknown, id: string, patch: Record<string, unknown>) => boolean
  export const bringToFront: (root: unknown, id: string) => boolean
  export const sendToBack: (root: unknown, id: string) => boolean
  export const genNodeId: (type: string) => string
  export const getPaletteGroups: () => unknown[]
}
