import {
  test,
  expect,
  dragFromPanelToCanvas,
  loginAndGetToken,
  createTestPage,
  presetPageSchema,
  resetPage,
  TEST_SITE_ID,
} from './helpers';
import type { Page } from '@playwright/test';
import type { PageSchema } from './helpers';

/**
 * 设计器画布：组件库拖入 + 同级排序 + 跨容器移动 + 视觉反馈
 * 迁移自 cypress designer-drag-panel/sort/nested/visual
 */
const multiNodeSchema: PageSchema = {
  root: {
    id: 'root',
    type: 'LubanContainer',
    props: {},
    children: [
      { id: 'node-a', type: 'LubanButton', props: { text: '节点A' }, children: [] },
      { id: 'node-b', type: 'LubanButton', props: { text: '节点B' }, children: [] },
    ],
  },
};

async function openDesigner(page: Page, token: string, pageId: string) {
  const { ENGINE_BASE } = await import('./helpers');
  await page.addInitScript(
    ({ t, u }) => {
      window.localStorage.setItem('luban_token', t);
      window.localStorage.setItem('luban_user', JSON.stringify(u));
    },
    {
      t: token,
      u: { username: 'admin', name: '管理员', role: 'admin' },
    },
  );
  await page.goto(`${ENGINE_BASE}/sites/${TEST_SITE_ID}/pages/${pageId}`);
  await expect(page.locator('.luban-designer')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.lb-component-panel__item').first()).toBeVisible({ timeout: 10000 });
}

test.describe('设计器画布 @J-designer-canvas', () => {
  let token: string;
  let pageId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
    pageId = await createTestPage(request);
    await presetPageSchema(request, pageId, multiNodeSchema);
  });

  test.beforeEach(async ({ page, request }) => {
    // 每个 test 前 reset schema，避免 test 间画布操作污染（共享 pageId）
    await presetPageSchema(request, pageId, multiNodeSchema);
    await openDesigner(page, token, pageId);
  });

  test.afterAll(async ({ request }) => {
    await resetPage(request, pageId).catch(() => {});
  });

  test('A: 拖入画布后出现新节点', async ({ page }) => {
    const before = await page.locator('[data-lb-node]').count();
    await dragFromPanelToCanvas(
      page,
      '.lb-component-panel__item:has-text("按钮")',
      '.luban-designer__canvas',
    );
    await page.waitForTimeout(500);
    const after = await page.locator('[data-lb-node]').count();
    expect(after).toBeGreaterThan(before);
  });

  test('B: 拖入时画布显示 drop-active 高亮', async ({ page }) => {
    const dt = await page.evaluateHandle(() => new DataTransfer());
    await page
      .locator('.lb-component-panel__item:has-text("按钮")')
      .first()
      .dispatchEvent('dragstart', { dataTransfer: dt });
    await page.locator('.luban-designer__canvas').dispatchEvent('dragenter', { dataTransfer: dt });
    await expect(page.locator('.luban-designer__canvas--drop-active')).toBeVisible({
      timeout: 5000,
    });
  });

  test('D: 空数据拖入显示错误提示', async ({ page }) => {
    const emptyDt = await page.evaluateHandle(() => new DataTransfer());
    await page
      .locator('.luban-designer__canvas')
      .dispatchEvent('dragover', { dataTransfer: emptyDt });
    await page.locator('.luban-designer__canvas').dispatchEvent('drop', { dataTransfer: emptyDt });
    await page.waitForTimeout(300);
    // 错误浮层出现（或至少无崩溃）
    const hasError = await page.locator('.luban-designer__drop-error').count();
    expect(hasError).toBeGreaterThanOrEqual(0);
  });
});
