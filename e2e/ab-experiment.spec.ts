import { test, expect } from '@playwright/test';

/**
 * AB 实验管理 E2E（e2e-coverage T10）。
 *
 * 状态：AB 实验后端（AbExperiment Service/Controller）+ BFF 路由已交付，
 * 但 engine 无 AB 实验管理 UI 页面（无路由/视图）。
 * 完整管理 UI 属于后续迭代（P-006 团队/组织功能范畴）。
 *
 * @smoke 用例：API 可达性
 * @core 用例：管理界面（skip——UI 未实现）
 */
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('AB Experiment @smoke', () => {
  test('AB 实验 API 可达', async ({ request }) => {
    // 验证 BFF AB 实验 API 端点可达（后端 + BFF 已交付）
    const res = await request.get(
      `${process.env.LUBAN_E2E_BFF_URL ?? 'http://127.0.0.1:3100'}/api/ab/experiments`,
    );
    // 200 或 401（无 siteId query 时）—— 只要不是 500 即可达
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('AB Experiment Management UI @core', () => {
  test('实验管理界面', async () => {
    // AB 实验管理 UI 未实现（后端+BFF 已交付，engine 无前端页面）
    // 属 P-006 后续迭代
    test.skip(true, 'AB 实验管理 UI 未实现（后端+BFF 已交付，engine 无前端页面）');
  });
});
