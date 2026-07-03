import { test, expect, loginAndVisit, loginAndGetToken } from './helpers';

test.describe('Login @J-auth', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Luban 管理后台')).toBeVisible();
    await expect(page.locator('input[placeholder="请输入账号"]')).toBeVisible();
    await expect(page.locator('input[placeholder="请输入密码"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('redirects to dashboard when token exists', async ({ page, request }) => {
    const token = await loginAndGetToken(request);
    await loginAndVisit(page, token, '/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('unauthenticated user is redirected to login when visiting dashboard', async ({ page }) => {
    // 不注入 token,直接访问 dashboard → 应跳登录
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
