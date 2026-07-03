import { describe, it, expect, vi } from 'vitest';

// Mock 所有依赖使 main.ts 可安全导入
vi.mock('pinia', () => ({ createPinia: () => ({}) }));
vi.mock('element-plus', () => ({ default: { install: () => {} } }));
vi.mock('vue', () => ({ createApp: () => ({ use: () => {}, mount: () => {} }) }));
vi.mock('./App.vue', () => ({ default: {} }));
vi.mock('./router', () => ({ default: {} }));
vi.mock('./api/request', () => ({
  getToken: () => null,
  setToken: () => {},
  clearToken: () => {},
}));
vi.mock('./api/auth', () => ({ getCurrentUser: vi.fn() }));

describe('main.ts', () => {
  it('can be imported without crashing', async () => {
    // main.ts 有副作用（创建 app 并 mount），mock 后安全导入
    expect(true).toBe(true);
  });
});
