export interface NodeSchema {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: NodeSchema[];
  eventBindings?: Record<string, string>;
  /** 内联样式（CSS 属性→值），设计态属性面板 styleSchema 编辑 */
  style?: Record<string, unknown>;
  /** 响应式断点样式覆盖（tablet/mobile） */
  responsive?: Record<string, unknown>;
  /** 节点隐藏（设计态半透明渲染） */
  hidden?: boolean;
  /** 节点锁定（设计态不可拖拽） */
  locked?: boolean;
}

export interface PageSchema {
  root: NodeSchema;
  formState?: Record<string, unknown>;
}
