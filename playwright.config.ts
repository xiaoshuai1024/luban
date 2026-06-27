import { defineConfig, devices } from '@playwright/test';

/**
 * luban engine Playwright E2E
 *
 * 迁移自 Cypress。覆盖：登录/导航/站点CRUD/页面CRUD/设计器全场景/用户管理/设置/版本历史。
 * 真实登录（admin/admin123）+ 真实 BFF + Java 后端；禁 mock-token 假绿。
 *
 * 浏览器：优先本机 Chrome（channel: 'chrome'），无 Chrome 时回退 Playwright Chromium。
 * 与 docs/E2E_AGENT_GUIDE.md §4.0 约定一致。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  maxFailures: Number(process.env.LUBAN_E2E_NO_BAIL) > 0 ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.LUBAN_E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // 本机 Chrome 优先；CI 无 Chrome 时用 LUBAN_E2E_USE_PLAYWRIGHT_CHROMIUM=1 回退
    channel: process.env.LUBAN_E2E_USE_PLAYWRIGHT_CHROMIUM ? undefined : 'chrome',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
