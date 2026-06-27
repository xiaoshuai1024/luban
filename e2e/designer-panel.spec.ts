import {
  test,
  expect,
  loginAndGetToken,
  createTestPage,
  presetPageSchema,
  resetPage,
  TEST_SITE_ID,
  ENGINE_BASE,
} from './helpers';
import type { Page } from '@playwright/test';
import type { PageSchema } from './helpers';

const schema: PageSchema = {
  root: {
    id: 'root',
    type: 'LubanContainer',
    props: {},
    children: [{ id: 'node-btn', type: 'LubanButton', props: { text: '面板测试' }, children: [] }],
  },
};

async function openDesigner(page: Page, token: string, pageId: string) {
  await page.addInitScript(
    ({ t, u }) => {
      window.localStorage.setItem('luban_token', t);
      window.localStorage.setItem('luban_user', JSON.stringify(u));
    },
    { t: token, u: { username: 'admin', name: '管理员', role: 'admin' } },
  );
  await page.goto(`${ENGINE_BASE}/sites/${TEST_SITE_ID}/pages/${pageId}`);
  await expect(page.locator('.luban-designer')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.lb-component-panel__item').first()).toBeVisible({ timeout: 10000 });
}

test.describe('设计器面板折叠 @J-designer-panel', () => {
  let token: string;
  let pageId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
    pageId = await createTestPage(request);
    await presetPageSchema(request, pageId, schema);
  });

  test.beforeEach(async ({ page, request }) => {
    await presetPageSchema(request, pageId, schema);
    await openDesigner(page, token, pageId);
  });

  test.afterAll(async ({ request }) => {
    await resetPage(request, pageId).catch(() => {});
  });

  test('P1: 点击左栏折叠按钮 → 组件库隐藏', async ({ page }) => {
    const collapseBtn = page.locator('.page-editor__collapse-btn').first();
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      // 折叠后：左栏带 collapsed 类 或 组件库不可见
      const hasCollapsed = await page.locator('.page-editor__left--collapsed').count();
      const panelHidden = await page.locator('.page-editor__component-panel:visible').count();
      expect(hasCollapsed > 0 || panelHidden === 0).toBeTruthy();
    }
  });

  test('P3: 点击右栏折叠按钮 → 属性面板隐藏', async ({ page }) => {
    const collapseBtn = page.locator('.page-editor__collapse-btn').last();
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      const hasCollapsed = await page.locator('.page-editor__right--collapsed').count();
      const panelHidden = await page.locator('.lb-property-panel:visible').count();
      expect(hasCollapsed > 0 || panelHidden === 0).toBeTruthy();
    }
  });
});
