/**
 * 设计器 E2E 测试共享常量与工具
 *
 * 注意：BFF 的 [pageId] 动态路由在 Next.js 16 下有 params Promise 兼容问题（500），
 * E2E 直接调 Java 后端（8080）绕过此问题。
 */
export const TEST_SITE_ID = '33111bfc-778d-4efc-a1fa-5c49f0437307'
export const BFF_BASE = 'http://127.0.0.1:3000'
export const BACKEND_BASE = 'http://127.0.0.1:8080/backend'
export const ENGINE_BASE = 'http://localhost:5174'

// Java 后端需要的 user headers
const TEST_USER_HEADERS = {
  'X-User-ID': 'f7316395-f07f-4c3c-bead-5fa0820402ed',
  'X-User-Role': 'admin',
  'Content-Type': 'application/json',
}

/**
 * 获取真实 admin token（通过 BFF login）
 */
export function loginAndGetToken(): Cypress.Chainable<string> {
  return cy
    .request({
      method: 'POST',
      url: `${BFF_BASE}/api/auth/login`,
      body: { username: 'admin', password: 'admin123' },
    })
    .then((res) => res.body.token as string)
}

/**
 * 创建一个临时测试页面（直接调 Java 后端），将 pageId 存入 env
 * 幂等：如已创建则复用
 */
export function createTestPage(): Cypress.Chainable<string> {
  return cy.then(() => {
    const existing = Cypress.env('testPageId') as string | undefined
    if (existing) return cy.wrap(existing)

    const uniquePath = `/e2e-${Date.now()}`
    return cy
      .request({
        method: 'POST',
        url: `${BACKEND_BASE}/sites/${TEST_SITE_ID}/pages`,
        headers: TEST_USER_HEADERS,
        body: { name: 'E2E 设计器测试', path: uniquePath },
      })
      .then((res) => {
        const pageId = res.body.id as string
        Cypress.env('testPageId', pageId)
        Cypress.env('testPagePath', uniquePath)
        return cy.wrap(pageId)
      })
  })
}

/**
 * 获取测试页面 id（须先调用 createTestPage）
 */
export function getTestPageId(): string {
  return Cypress.env('testPageId') as string
}

/**
 * 预设页面 schema（直接调 Java 后端 PUT）
 */
export function presetPageSchema(schema: object): Cypress.Chainable<void> {
  return cy.then(() => {
    const pageId = getTestPageId()
    const pagePath = Cypress.env('testPagePath') as string
    cy.request({
      method: 'PUT',
      url: `${BACKEND_BASE}/sites/${TEST_SITE_ID}/pages/${pageId}`,
      headers: TEST_USER_HEADERS,
      body: { name: 'E2E 设计器测试', path: pagePath, schema },
    })
  })
}

/**
 * 重置页面为空白
 */
export function resetPage(): Cypress.Chainable<void> {
  const empty = { root: { id: 'root', type: 'LubanContainer', props: {}, children: [] } }
  return presetPageSchema(empty)
}
