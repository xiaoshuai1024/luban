import { request } from './request';

/**
 * 数据源 API（对齐后端 DatasourceResponse）。
 * 类型仅 static | api；list 不分页；headers 值 GET 时脱敏为 "***"。
 */
export interface DatasourceConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

export interface Datasource {
  id: string;
  siteId: string;
  name: string;
  type: 'static' | 'api';
  config: DatasourceConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatasourceTestResult {
  ok: boolean;
  message?: string;
  latencyMs?: number;
}

/** 数据源列表（后端 List，无分页包装） */
export function getDatasources(siteId: string) {
  return request.get<Datasource[]>('/datasources', { params: { siteId } });
}

/** 数据源详情 */
export function getDatasource(id: string) {
  return request.get<Datasource>(`/datasources/${id}`);
}

/** 创建数据源 */
export function createDatasource(data: {
  siteId: string;
  name: string;
  type: string;
  config: DatasourceConfig;
}) {
  return request.post<Datasource>('/datasources', data);
}

/** 更新数据源 */
export function updateDatasource(
  id: string,
  data: Partial<{ name: string; type: string; config: DatasourceConfig }>,
) {
  return request.put<Datasource>(`/datasources/${id}`, data);
}

/** 删除数据源 */
export function deleteDatasource(id: string) {
  return request.delete(`/datasources/${id}`);
}

/** 测试数据源连接（返回 ok/message/latencyMs） */
export function testDatasource(id: string) {
  return request.post<DatasourceTestResult>(`/datasources/${id}/test`);
}
