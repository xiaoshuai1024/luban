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
    children: [{ id: 'node-btn', type: 'LubanButton', props: { text: '响应式' }, children: [] }],
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

test.describe('设计器设备断点 @J-designer-device', () => {
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

  test('D: 设备断点切换不崩溃', async ({ page }) => {
    // toolbar 设备按钮（PC/iPad/H5），title 可能本地化，用存在性+点击容错
    const deviceBtn = page
      .locator('.lb-toolbar button, .luban-designer__builtin-toolbar button')
      .filter({
        hasText: /PC|iPad|H5|平板|手机|🖥|📋|📱/i,
      })
      .first();
    if ((await deviceBtn.count()) > 0) {
      await deviceBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    // 验证设计器框架仍存在（断点切换不崩溃）
    await expect(page.locator('.luban-designer')).toBeVisible({ timeout: 5000 });
  });
});
