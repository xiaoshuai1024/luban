import { request } from './request';

/**
 * Form 表单 API（对齐后端 FormResponse）。
 * list 不分页（后端返回数组）；update 用 PATCH；delete 带级联校验。
 */
export interface Form {
  id: string;
  siteId: string;
  pageId: string;
  name: string;
  fieldSchema: Record<string, unknown>;
  submitConfig: Record<string, unknown>;
  dedupKeys?: string[];
  dedupWindow: number;
  dedupPolicy: string;
  antiSpam?: { captchaRequired?: boolean };
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}

/** 表单保存请求体（create/post + patch 对齐后端 FormSaveRequest） */
export interface FormSavePayload {
  siteId: string;
  pageId?: string;
  name?: string;
  fieldSchema?: Record<string, unknown>;
  submitConfig?: Record<string, unknown>;
  dedupKeys?: string[];
  dedupWindow?: number;
  dedupPolicy?: string;
  antiSpam?: { captchaRequired?: boolean };
  status?: string;
}

/** 表单列表（后端 List<FormResponse>，无分页包装） */
export async function getForms(siteId: string): Promise<{ data: Form[] }> {
  const query = new URLSearchParams({ siteId });
  return request.get(`/forms?${query.toString()}`);
}

/** 表单详情 */
export async function getForm(siteId: string, id: string): Promise<{ data: Form }> {
  return request.get(`/forms/${id}?siteId=${encodeURIComponent(siteId)}`);
}

/** 创建表单 */
export async function createForm(data: FormSavePayload) {
  return request.post<Form>('/forms', data);
}

/** 更新表单（PATCH 部分更新） */
export async function updateForm(siteId: string, id: string, data: Partial<FormSavePayload>) {
  return request.patch<Form>(`/forms/${id}?siteId=${encodeURIComponent(siteId)}`, data);
}

/** 删除表单（有线索时返回 409 FORM_HAS_LEADS） */
export async function deleteForm(siteId: string, id: string) {
  return request.delete(`/forms/${id}?siteId=${encodeURIComponent(siteId)}`);
}

/** 状态标签映射 */
export const FORM_STATUS_MAP: Record<string, { label: string; type: string }> = {
  active: { label: '启用', type: 'success' },
  disabled: { label: '禁用', type: 'info' },
};

/** 去重策略选项 */
export const DEDUP_POLICY_OPTIONS = [
  { value: 'reject', label: '拒绝（重复返回 409）' },
  { value: 'mark', label: '标记无效（插入但标 invalid）' },
  { value: 'overwrite', label: '覆盖（删旧插新）' },
  { value: 'merge', label: '合并（字段级合并）' },
];
