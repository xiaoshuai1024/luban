import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
// eslint-disable-next-line boundaries/no-unknown
import { setupMock } from '../mocks';

const TOKEN_KEY = 'luban_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * 原生 fetch adapter：绕过 axios 内置 xhr/fetch adapter 在某些环境（如 E2E 测试浏览器）
 * 的兼容问题。直接用 window.fetch，功能等价，行为更可预期。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nativeFetchAdapter: (config: any) => Promise<any> = async (config) => {
  const rawBase = config.baseURL || '';
  const rawUrl = config.url || '';
  let url: string;
  if (/^https?:\/\//.test(rawBase) && typeof window !== 'undefined') {
    url = rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl;
  } else {
    url = rawBase + rawUrl;
  }
  // 提取 headers：axios InternalAxiosRequestConfig.headers 是 AxiosHeaders 实例（有 get/set）
  const headers: Record<string, string> = {};
  const axiosHeaders = config.headers as unknown as {
    get?: (k: string) => string | null | undefined;
    forEach?: (cb: (value: string, key: string) => void) => void;
  };
  if (axiosHeaders && typeof axiosHeaders.forEach === 'function') {
    axiosHeaders.forEach((value: string, key: string) => {
      headers[key] = value;
    });
  } else if (axiosHeaders && typeof axiosHeaders.get === 'function') {
    for (const k of ['Authorization', 'Content-Type', 'X-User-ID', 'X-User-Role']) {
      const v = axiosHeaders.get(k);
      if (v) headers[k] = v;
    }
  }
  const init: RequestInit = {
    method: (config.method || 'get').toUpperCase(),
    headers,
    body: config.data
      ? typeof config.data === 'string'
        ? config.data
        : JSON.stringify(config.data)
      : undefined,
  };
  const ctrl = new AbortController();
  if (config.signal) config.signal.addEventListener('abort', () => ctrl.abort());
  init.signal = ctrl.signal;
  const resp = await fetch(url, init);
  const data = resp.headers.get('content-type')?.includes('application/json')
    ? await resp.json()
    : await resp.text();
  return {
    data,
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers as unknown as Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: config as any,
    request: {},
  } as AxiosResponse;
};

export const request: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  adapter: nativeFetchAdapter,
});

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

if (useMock) {
  setupMock(request);
}

request.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // 从 JWT payload 解析 user-id/role，传给 BFF（BFF 转发给 Java 后端）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) config.headers['X-User-ID'] = payload.sub;
      if (payload.role) config.headers['X-User-Role'] = payload.role;
    } catch {
      // token 不是 JWT 格式，忽略
    }
  }
  return config;
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    // 来自 mock 拦截器的“错误”，直接作为成功响应返回
    if (
      error &&
      (error as { __isMock?: boolean }).__isMock &&
      (error as { response?: AxiosResponse }).response
    ) {
      return Promise.resolve((error as { response: AxiosResponse }).response);
    }
    if (error.response?.status === 401) {
      clearToken();
      const path = window.location.pathname;
      if (!path.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
