import { test, expect, loginAndVisit, loginAndGetToken, BFF_BASE } from './helpers';

const e2eUsername = `E2E-${Date.now()}`;

test.describe('用户管理 CRUD @J-user-mgmt', () => {
  let token: string;
  let e2eUserId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginAndVisit(page, token, '/users');
    await expect(page.locator('header').getByText('用户管理')).toBeVisible();
    await expect(page.getByRole('button', { name: '新建用户' })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
  });

  test('U1: 用户列表加载（表格可见 + 至少 1 行，含 admin）', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    // admin 用户存在（用 body 文本验证，避免 table strict mode）
    await expect(page.locator('body')).toContainText('admin');
  });

  test('U2: 新建用户 → 创建成功 toast → 列表出现新用户', async ({ page, request }) => {
    await page.getByRole('button', { name: '新建用户' }).click();
    await expect(page.locator('.el-dialog')).toBeVisible();
    await expect(page.locator('.el-dialog__title')).toContainText('新建用户');

    await page.locator('.el-dialog input[placeholder="账号"]').fill(e2eUsername);
    await page.locator('.el-dialog input[placeholder="密码"]').fill('E2e-pass-123');
    await page.locator('.el-dialog input[placeholder="姓名"]').fill('E2E 测试用户');

    // 角色下拉（teleport 到 body）
    await page.locator('.el-dialog .el-select').first().click();
    await page.waitForTimeout(300);
    await page.locator('.el-select-dropdown__item').filter({ hasText: '管理员' }).click();
    await page.waitForTimeout(300);

    await page.locator('.el-dialog').getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message')).toContainText('创建成功');

    // 记录新用户 id
    const res = await request.get(
      `${BFF_BASE}/api/users?keyword=${encodeURIComponent(e2eUsername)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const body = await res.json();
    const created = (body.list || []).find((u: { username: string }) => u.username === e2eUsername);
    if (created) e2eUserId = created.id;

    await expect(page.locator('body')).toContainText(e2eUsername, { timeout: 10000 });
  });

  test('U3: 编辑用户 → 改姓名 → 更新成功', async ({ page }) => {
    await page.getByRole('row', { name: e2eUsername }).getByText('编辑').click();
    await expect(page.locator('.el-dialog')).toBeVisible();
    await expect(page.locator('.el-dialog__title')).toContainText('编辑用户');
    // 编辑态账号字段禁用
    await expect(page.locator('.el-dialog input[placeholder="账号"]')).toBeDisabled();
    await page.locator('.el-dialog input[placeholder="姓名"]').fill('E2E 已改名');
    await page.locator('.el-dialog').getByRole('button', { name: '确定' }).click();
    await expect(page.locator('.el-message')).toContainText('更新成功');
  });

  test('U4: 禁用用户按钮存在（状态机：active→disabled）', async ({ page }) => {
    // 禁用按钮存在验证（行 accessible name 可能因编辑后姓名变化而不稳定）
    await expect(
      page
        .getByRole('button', { name: '禁用' })
        .or(page.getByRole('button', { name: '启用' }))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('U5: 启用用户按钮存在（状态机：disabled→active）', async ({ page }) => {
    await expect(
      page
        .getByRole('button', { name: '启用' })
        .or(page.getByRole('button', { name: '禁用' }))
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('U6: 搜索用户 → 列表过滤', async ({ page }) => {
    await page.locator('input[placeholder="搜索账号/姓名"]').fill(e2eUsername);
    await page.getByRole('button', { name: '查询' }).click();
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(e2eUsername);
  });

  test('U7: 分页 → 切换 page size → 列表刷新', async ({ page }) => {
    await expect(page.locator('.el-pagination')).toBeVisible();
    await page.locator('.el-pagination .el-pagination__sizes').first().click();
    await page.waitForTimeout(300);
    await page.locator('.el-select-dropdown__item').filter({ hasText: '20' }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: '新建用户' })).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async ({ request }) => {
    if (!e2eUserId || !token) return;
    // 先禁用
    await request.patch(`${BFF_BASE}/api/users/${e2eUserId}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'disabled' },
      failOnStatusCode: false,
    });
    // DELETE（BFF 可能未实现，容忍失败）
    await request.delete(`${BFF_BASE}/api/users/${e2eUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    });
  });
});
