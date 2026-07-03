import { test, expect, loginAndVisit, loginAndGetToken, TEST_SITE_ID } from './helpers';

test.describe('Pages management @J-page-crud', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
  });

  test.beforeEach(async ({ page }) => {
    // 直接进 TEST_SITE_ID 的 pages 列表（绕过 sites 列表导航，更稳定）
    await loginAndVisit(page, token, `/sites/${TEST_SITE_ID}/pages`);
  });

  test('loads page list for a site', async ({ page }) => {
    await expect(page).toHaveURL(/\/sites\/.+\/pages$/);
    await expect(page.getByRole('button', { name: '新建页面' })).toBeVisible({ timeout: 10000 });
  });

  test('opens new page editor', async ({ page }) => {
    await page.getByRole('button', { name: '新建页面' }).click();
    await expect(page).toHaveURL(/\/sites\/.+\/pages\/new$/, { timeout: 15000 });
    // 新建态：保存 + 返回按钮可见（PageEditor 已加载）
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('button', { name: '返回列表' }).or(page.getByText('返回')),
    ).toBeVisible({ timeout: 5000 });
  });
});
