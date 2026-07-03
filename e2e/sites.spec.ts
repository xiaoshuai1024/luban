import { test, expect, loginAndVisit, loginAndGetToken, BFF_BASE, TEST_SITE_ID } from './helpers';

test.describe('Sites management @J-site-crud', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginAndVisit(page, token, '/sites');
  });

  test('loads site list and toolbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: '新建站点' })).toBeVisible();
    // 表格至少一行（TEST_SITE_ID 已 seed）；Element Plus 异步渲染，放宽等待
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });

  test('site detail page accessible', async ({ page }) => {
    await loginAndVisit(page, token, `/sites/${TEST_SITE_ID}`);
    // 验证详情页可达（URL 命中 + 未被重定向到 login/dashboard）
    await expect(page).toHaveURL(new RegExp(`/sites/${TEST_SITE_ID}`), { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('site pages page accessible', async ({ page }) => {
    await loginAndVisit(page, token, `/sites/${TEST_SITE_ID}/pages`);
    await expect(page).toHaveURL(/\/sites\/.+\/pages$/, { timeout: 10000 });
    await expect(page.getByRole('button', { name: '新建页面' })).toBeVisible({ timeout: 10000 });
  });

  test('create site via UI then cleanup', async ({ page, request }) => {
    const name = `E2E站点-${Date.now()}`;
    await page.getByRole('button', { name: '新建站点' }).click();
    await expect(page.locator('.el-dialog')).toBeVisible();
    // 站点名称输入框（placeholder="站点名称"）
    await page.locator('.el-dialog input[placeholder="站点名称"]').fill(name);
    await page.locator('.el-dialog').getByRole('button', { name: '确定' }).click();
    // 创建成功 toast（核心断言；表格刷新可能因异步稍慢）
    await expect(page.locator('.el-message')).toContainText('创建成功', { timeout: 10000 });

    // 清理（API 删除）
    const listRes = await request.get(`${BFF_BASE}/api/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sites = await listRes.json();
    const arr = Array.isArray(sites) ? sites : sites.list || sites.data || [];
    const created = arr.find((s: { name: string }) => s.name === name);
    if (created) {
      await request.delete(`${BFF_BASE}/api/sites/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
