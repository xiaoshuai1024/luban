import { test, expect, loginAndVisit, loginAndGetToken } from './helpers';

test.describe('Navigation @J-nav @J-user-mgmt @J-settings @J-dashboard', () => {
  // 不用全局 beforeEach（各 test 自行 loginAndVisit，避免多次 addInitScript 冲突）

  test('dashboard is accessible', async ({ page, request }) => {
    const token = await loginAndGetToken(request);
    await loginAndVisit(page, token, '/dashboard');
    await expect(page.getByText('站点数')).toBeVisible();
  });

  test('sites list page loads', async ({ page, request }) => {
    const token = await loginAndGetToken(request);
    await loginAndVisit(page, token, '/sites');
    await expect(page.getByRole('button', { name: '新建站点' })).toBeVisible();
  });

  test('users list page loads', async ({ page, request }) => {
    const token = await loginAndGetToken(request);
    await loginAndVisit(page, token, '/users');
    await expect(page.getByRole('button', { name: '新建用户' })).toBeVisible();
  });

  test('settings page loads', async ({ page, request }) => {
    const token = await loginAndGetToken(request);
    await loginAndVisit(page, token, '/settings');
    await expect(page.locator('.el-tabs__item').first()).toBeVisible();
  });
});
