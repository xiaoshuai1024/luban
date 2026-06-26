import { request } from './request';
import type { PageSchema } from '@/types/schema';

export interface PageMeta {
  id: string;
  siteId: string;
  name: string;
  path: string;
  status?: string;
  schema?: PageSchema;
  createdAt?: string;
  updatedAt?: string;
}

export function getPages(siteId: string) {
  return request.get<PageMeta[]>(`/sites/${siteId}/pages`);
}

export function getPage(siteId: string, pageId: string) {
  return request.get<PageMeta>(`/sites/${siteId}/pages/${pageId}`);
}

export function createPage(
  siteId: string,
  data: { name: string; path: string; schema?: PageSchema },
) {
  return request.post<PageMeta>(`/sites/${siteId}/pages`, data);
}

export function savePage(
  siteId: string,
  pageId: string,
  data: { name?: string; path?: string; schema?: PageSchema },
) {
  return request.put<PageMeta>(`/sites/${siteId}/pages/${pageId}`, data);
}

export function deletePage(siteId: string, pageId: string) {
  return request.delete(`/sites/${siteId}/pages/${pageId}`);
}

// ==================== P0 发布闭环 ====================

export function publishPage(siteId: string, pageId: string) {
  return request.post<PageMeta>(`/sites/${siteId}/pages/${pageId}/publish`);
}

export function unpublishPage(siteId: string, pageId: string) {
  return request.post<PageMeta>(`/sites/${siteId}/pages/${pageId}/unpublish`);
}

export function previewPageDraft(siteId: string, pageId: string) {
  return request.get<PageMeta>(`/sites/${siteId}/pages/${pageId}/preview`);
}

// ==================== 版本历史 ====================

export interface PageVersion {
  id: string;
  pageId: string;
  versionNo: number;
  schema?: PageSchema;
  summary?: string;
  createdBy?: string;
  createdAt?: string;
}

export function getPageVersions(siteId: string, pageId: string) {
  return request.get<PageVersion[]>(`/sites/${siteId}/pages/${pageId}/versions`);
}

export function rollbackPage(siteId: string, pageId: string, versionId: string) {
  return request.post<PageMeta>(
    `/sites/${siteId}/pages/${pageId}/versions/${versionId}/rollback`,
  );
}
