/**
 * 设计器 E2E 测试共享常量
 * 避免 const 变量跨 spec 文件重复声明（TS2451）
 */
export const TEST_SITE_ID = '33111bfc-778d-4efc-a1fa-5c49f0437307'
export const TEST_PAGE_ID = 'e2e-designer-test'
export const BFF_BASE = 'http://127.0.0.1:3100'
export const ENGINE_BASE = 'http://localhost:5173'

/**
 * 获取真实 admin token（通过 BFF login）
 * 在 before() 中调用并存入 Cypress.env('authToken')
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
 * 预设页面 schema
 */
export function presetPageSchema(schema: object): Cypress.Chainable<void> {
  return cy.then(() => {
    const token = Cypress.env('authToken') as string
    cy.request({
      method: 'PUT',
      url: `${BFF_BASE}/api/sites/${TEST_SITE_ID}/pages/${TEST_PAGE_ID}`,
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'E2E 测试页面', path: '/e2e-test', schema },
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
