/**
 * luban engine Playwright E2E 共享 helpers
 *
 * 迁移自 cypress 的 _helpers.ts + support/commands.ts。
 * 提供：真实登录、测试页管理、设计器 fixture。
 */
import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

export const TEST_SITE_ID = '33111bfc-778d-4efc-a1fa-5c49f0437307';
export const BFF_BASE = process.env.LUBAN_BFF_BASE || 'http://127.0.0.1:3000';
export const BACKEND_BASE = process.env.LUBAN_BACKEND_BASE || 'http://127.0.0.1:8081/backend';
export const ENGINE_BASE = process.env.LUBAN_E2E_BASE_URL || 'http://127.0.0.1:5173';

// Java 后端需要的 user headers
export const TEST_USER_HEADERS = {
  'X-User-ID': 'f7316395-f07f-4c3c-bead-5fa0820402ed',
  'X-User-Role': 'admin',
  'Content-Type': 'application/json',
};

/** 真实登录拿 token + user 信息（POST BFF /api/auth/login） */
export async function loginAndGetToken(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${BFF_BASE}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  expect(res.status(), 'BFF login 须 200').toBe(200);
  const body = await res.json();
  // 缓存 user 供 loginAndVisit 写入 luban_user（路由守卫读 role 判断 isAdmin）
  cachedUser = body.user ?? { username: 'admin', name: '管理员', role: 'admin' };
  return body.token as string;
}

let cachedUser: { username?: string; name?: string; role?: string } | null = null;

/**
 * 在 page 注入 token + user 并访问目标路径（替代 cypress 的 loginWithToken）。
 * 用 addInitScript 确保：导航前 localStorage 的 luban_token 与 luban_user 均就绪。
 * luban_user 含 role:'admin'，否则 requiresAdmin 路由守卫会重定向到 /dashboard。
 */
export async function loginAndVisit(page: Page, token: string, visitPath: string) {
  const user = cachedUser ?? { username: 'admin', name: '管理员', role: 'admin' };
  await page.addInitScript(
    ({ t, u }) => {
      window.localStorage.setItem('luban_token', t);
      window.localStorage.setItem('luban_user', JSON.stringify(u));
    },
    { t: token, u: user },
  );
  await page.goto(`${ENGINE_BASE}${visitPath}`);
}

/** Schema 类型（与前端 types/schema.ts 对齐） */
export interface NodeSchema {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  children?: NodeSchema[];
}
export interface PageSchema {
  formState?: Record<string, unknown>;
  root: NodeSchema;
}

/**
 * 创建临时测试页（直接调 Java 后端），返回 pageId。
 * 幂等：同 spec 内复用。
 */
export async function createTestPage(ctx: APIRequestContext): Promise<string> {
  const uniquePath = `/e2e-${Date.now()}`;
  const res = await ctx.post(`${BACKEND_BASE}/sites/${TEST_SITE_ID}/pages`, {
    headers: TEST_USER_HEADERS,
    data: { name: 'E2E 设计器测试', path: uniquePath },
  });
  expect(res.status(), 'createTestPage 须 2xx').toBeLessThan(300);
  const body = await res.json();
  return body.id as string;
}

/** 预设页面 schema（直接调 Java 后端 PUT；自动 GET 当前 path 避免 path 冲突） */
export async function presetPageSchema(
  ctx: APIRequestContext,
  pageId: string,
  schema: PageSchema,
  pagePath?: string,
): Promise<void> {
  // 未提供 path 时，GET 当前页面拿真实 path（避免 PUT 时 path 冲突 409）
  let path = pagePath;
  if (!path) {
    const getRes = await ctx.get(`${BACKEND_BASE}/sites/${TEST_SITE_ID}/pages/${pageId}`, {
      headers: TEST_USER_HEADERS,
    });
    const body = await getRes.json().catch(() => ({}));
    path = body.path ?? '/e2e-test';
  }
  const res = await ctx.put(`${BACKEND_BASE}/sites/${TEST_SITE_ID}/pages/${pageId}`, {
    headers: TEST_USER_HEADERS,
    data: { name: 'E2E 设计器测试', path, schema },
  });
  expect(res.status(), 'presetPageSchema 须 2xx').toBeLessThan(300);
}

/** 重置页面为空白 */
export async function resetPage(ctx: APIRequestContext, pageId: string): Promise<void> {
  const empty: PageSchema = {
    root: { id: 'root', type: 'LubanContainer', props: {}, children: [] },
  };
  await presetPageSchema(ctx, pageId, empty);
}

/**
 * 设计器 fixture：登录 + 建测试页 + 预设 schema + 访问编辑器。
 * 返回 { page, token, pageId }，供 designer spec 直接用。
 */
export const designerTest = base.extend<
  { designerSetup: { page: Page; token: string; pageId: string } } & Record<string, never>
>({
  designerSetup: async ({ page, request }, use) => {
    const token = await loginAndGetToken(request);
    const pageId = await createTestPage(request);
    await use({ page, token, pageId });
    // afterAll: 重置页面
    await resetPage(request, pageId).catch(() => {});
  },
});

/**
 * 拖拽辅助：从组件面板项拖到画布（HTML5 drag 事件链）。
 * 替代 cypress 的 dragFromPanelToCanvas / 手写 trigger 链。
 */
export async function dragFromPanelToCanvas(
  page: Page,
  panelItemSelector: string,
  canvasSelector: string,
) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.locator(panelItemSelector).first().dispatchEvent('dragstart', { dataTransfer });
  await page.locator(canvasSelector).dispatchEvent('dragover', { dataTransfer });
  await page.locator(canvasSelector).dispatchEvent('drop', { dataTransfer });
}

/** SortableJS 拖拽排序：mousedown → mousemove → mouseup */
export async function sortableReorder(page: Page, sourceSelector: string, offsetY = 100) {
  const box = await page.locator(sourceSelector).first().boundingBox();
  if (!box) throw new Error(`sortableReorder: ${sourceSelector} 无 boundingBox`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + offsetY, { steps: 5 });
  await page.mouse.up();
}

export { base as test, expect };
