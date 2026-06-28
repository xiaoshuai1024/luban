import { request } from './request';

/** 线索响应（contactMasked 已脱敏：phone→138****1234） */
export interface Lead {
  id: string;
  siteId: string;
  formId: string;
  formName?: string;
  pageId?: string;
  channelId?: string;
  contactMasked: Record<string, string>;
  utm?: Record<string, string>;
  status: string;
  assigneeId?: string;
  sourceIp?: string;
  createdAt: string;
  updatedAt?: string;
  convertedAt?: string;
}

export interface LeadListResult {
  list: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

/** 线索列表（脱敏） */
export async function getLeads(
  siteId: string,
  params?: { status?: string; formId?: string; keyword?: string; page?: number; size?: number },
): Promise<{ data: LeadListResult }> {
  const query = new URLSearchParams({ siteId });
  if (params?.status) query.set('status', params.status);
  if (params?.formId) query.set('formId', params.formId);
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.page) query.set('page', String(params.page));
  if (params?.size) query.set('size', String(params.size));
  return request.get(`/leads?${query.toString()}`);
}

/** 线索详情（脱敏） */
export async function getLeadDetail(siteId: string, leadId: string): Promise<{ data: Lead }> {
  return request.get(`/leads/${leadId}?siteId=${encodeURIComponent(siteId)}`);
}

/** 状态标签映射 */
export const LEAD_STATUS_MAP: Record<string, { label: string; type: string }> = {
  new: { label: '新建', type: 'info' },
  assigned: { label: '已分配', type: 'warning' },
  contacting: { label: '联系中', type: 'primary' },
  converted: { label: '已转化', type: 'success' },
  invalid: { label: '无效', type: 'danger' },
  lost: { label: '流失', type: 'danger' },
};
