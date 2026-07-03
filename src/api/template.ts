import { request } from './request'
import type { PageSchema } from '@/types/schema'

/**
 * Template API client. Mirrors src/api/datasource.ts conventions:
 *   - import the shared axios `request` instance
 *   - types inlined here
 *   - errors transparent（axios error bubbles, 401 auto-handled by interceptor）
 *
 * URL shape: /templates（运营端，鉴权）+ /public/templates（市场目录，免鉴权）。
 * 后端契约：template-marketplace plan。
 */

/** 模板目录条目（市场响应，不含 schema 体积字段）。 */
export interface TemplateMeta {
  id: string
  slug: string
  name: string
  category: 'blank' | 'saas' | 'ecommerce' | 'education' | 'blog' | 'landing' | 'portfolio'
  description?: string
  thumbnail?: string
  authorId?: string | null
  status: 'draft' | 'published' | 'archived' | 'featured'
  latestVersion: number
  installCount: number
  createdAt: string
  updatedAt: string
}

/** 创建/更新模板的请求体。 */
export interface TemplateSavePayload {
  slug: string
  name: string
  category: TemplateMeta['category']
  description?: string
  thumbnail?: string
  /** 完整 PageSchema JSON 字符串 */
  schemaJson: string
  changeNote?: string
}

/** 安装请求体。 */
export interface TemplateInstallPayload {
  siteId: string
  path?: string
  version?: number
}

/** 安装结果。 */
export interface TemplateInstallResult {
  pageId: string
  path: string
  version: number
}

// === 公开市场（免鉴权，仅 published/featured）===

/** 浏览市场目录（可选类目过滤）。 */
export async function getPublicTemplates(category?: string): Promise<TemplateMeta[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await request.get(`/public/templates${qs}`)
  return res.data
}

/** 取模板 schema（公开端，免鉴权）。返回 PageSchema。 */
export async function getPublicTemplateSchema(id: string): Promise<PageSchema | null> {
  try {
    const res = await request.get(`/public/templates/${id}/schema`)
    // BFF 返回 { schema: "<json string>" }
    const raw = typeof res.data === 'string' ? res.data : res.data?.schema
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
  } catch {
    return null
  }
}

// === 运营端（鉴权）===

/** 运营端模板列表（含 draft/archived）。 */
export async function getTemplates(): Promise<TemplateMeta[]> {
  const res = await request.get('/templates')
  return res.data
}

/** 模板详情。 */
export async function getTemplate(id: string): Promise<TemplateMeta> {
  const res = await request.get(`/templates/${id}`)
  return res.data
}

/** 取模板最新版 schema（运营端）。 */
export async function getTemplateSchema(id: string): Promise<PageSchema | null> {
  try {
    const res = await request.get(`/templates/${id}/schema`)
    const raw = typeof res.data === 'string' ? res.data : res.data?.schema
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
  } catch {
    return null
  }
}

/** 创建模板。 */
export async function createTemplate(payload: TemplateSavePayload): Promise<TemplateMeta> {
  const res = await request.post('/templates', payload)
  return res.data
}

/** 更新模板。 */
export async function updateTemplate(id: string, payload: TemplateSavePayload): Promise<TemplateMeta> {
  const res = await request.put(`/templates/${id}`, payload)
  return res.data
}

/** 删除模板。 */
export async function deleteTemplate(id: string): Promise<void> {
  await request.delete(`/templates/${id}`)
}

/** 发布模板。 */
export async function publishTemplate(id: string): Promise<TemplateMeta> {
  const res = await request.post(`/templates/${id}/publish`)
  return res.data
}

/** 归档模板。 */
export async function archiveTemplate(id: string): Promise<TemplateMeta> {
  const res = await request.post(`/templates/${id}/archive`)
  return res.data
}

/** 推荐模板（上市场推荐位）。 */
export async function featureTemplate(id: string): Promise<TemplateMeta> {
  const res = await request.post(`/templates/${id}/feature`)
  return res.data
}

/** 安装模板到站点（创建 draft Page）。 */
export async function installTemplate(id: string, payload: TemplateInstallPayload): Promise<TemplateInstallResult> {
  const res = await request.post(`/templates/${id}/install`, payload)
  return res.data
}
