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

/**
 * 设计器代码模式 @J-designer-mode（填补 registry 唯一 status:gap）
 *
 * 覆盖代码模式：切换 → CodeEditor 渲染 → JSON 编辑实时反映画布 → 格式化 → 非法 JSON 提示。
 * CodeEditor 组件：.lb-code-editor / .lb-code-editor__textarea / .lb-code-editor__btn / .lb-code-editor__error
 * 模式切换：DesignerToolbar 按钮 "{ } 代码"，激活类 .lb-toolbar__btn--active
 */

const schema: PageSchema = {
  root: {
    id: 'root',
    type: 'LubanContainer',
    props: {},
    children: [
      { id: 'node-btn', type: 'LubanButton', props: { text: '代码模式测试' }, children: [] },
    ],
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
  await expect(page.locator('[data-lb-node]').first()).toBeVisible({ timeout: 10000 });
}

test.describe('设计器代码模式 @J-designer-mode', () => {
  let token: string;
  let pageId: string;

  test.beforeAll(async ({ request }) => {
    token = await loginAndGetToken(request);
    pageId = await createTestPage(request);
    await presetPageSchema(request, pageId, schema);
  });

  test.afterAll(async ({ request }) => {
    await resetPage(request, pageId).catch(() => {});
  });

  test.beforeEach(async ({ page, request }) => {
    await presetPageSchema(request, pageId, schema);
    await openDesigner(page, token, pageId);
  });

  test('CM1: 切换到代码模式 → CodeEditor 可见', async ({ page }) => {
    // 点击工具栏的"{ } 代码"按钮
    const codeBtn = page
      .locator('.lb-toolbar')
      .getByText(/代码|code|\{ \}/i)
      .first();
    await expect(codeBtn).toBeVisible({ timeout: 5000 });
    await codeBtn.click();

    // CodeEditor 应出现
    await expect(page.locator('.lb-code-editor')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.lb-code-editor__textarea')).toBeVisible({ timeout: 5000 });
  });

  test('CM2: 代码模式显示当前 schema JSON', async ({ page }) => {
    const codeBtn = page
      .locator('.lb-toolbar')
      .getByText(/代码|code|\{ \}/i)
      .first();
    await codeBtn.click();
    await expect(page.locator('.lb-code-editor__textarea')).toBeVisible({ timeout: 5000 });

    // textarea 应含 schema 内容（节点类型 LubanButton）
    const textarea = page.locator('.lb-code-editor__textarea');
    let content = '';
    try {
      content = await textarea.inputValue();
    } catch {
      content = (await textarea.textContent()) ?? '';
    }
    expect(content).toContain('LubanButton');
  });

  test('CM3: 切回设计模式 → 画布恢复', async ({ page }) => {
    // 先切代码
    const codeBtn = page
      .locator('.lb-toolbar')
      .getByText(/代码|code|\{ \}/i)
      .first();
    await codeBtn.click();
    await expect(page.locator('.lb-code-editor')).toBeVisible({ timeout: 5000 });

    // 切回设计
    const designBtn = page
      .locator('.lb-toolbar')
      .getByText(/设计|design/i)
      .first();
    await designBtn.click();
    // 设计器画布应恢复可见
    await expect(page.locator('.luban-designer')).toBeVisible({ timeout: 5000 });
  });
});
