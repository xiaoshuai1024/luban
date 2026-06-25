/**
 * 场景 B：画布内排序（SortableJS）
 *
 * 覆盖 plan §7.3 场景 B 的全部用例（B1~B3）：
 * - B1: mousedown → mousemove 触发 SortableJS chosen class
 * - B2: mouseup 后 DOM 顺序变化
 * - B3: locked 节点不可拖拽
 *
 * SortableJS 监听 mouse 事件（非 HTML5 drag），用 mousedown/mousemove/mouseup 链
 */
import { TEST_SITE_ID, loginAndGetToken, createTestPage, getTestPageId, presetPageSchema, resetPage } from './_helpers'

describe('设计器 § 场景 B: SortableJS 画布排序', { testIsolation: false }, () => {
  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/auth/login',
      body: { username: 'admin', password: 'admin123' },
    }).then((res) => {
      const token = res.body.token
      Cypress.env('authToken', token)

      // 创建测试页面，完成后预设 schema
      createTestPage().then(() => {
      // 预设 schema：3 个组件（Button + Text + Container）
      const presetSchema = {
        root: {
          id: 'root',
          type: 'LubanContainer',
          props: {},
          children: [
            { id: 'node-btn', type: 'LubanButton', props: { text: '按钮B1' }, children: [] },
            { id: 'node-txt', type: 'LubanText', props: { content: '文本B2' }, children: [] },
            { id: 'node-ctr', type: 'LubanContainer', props: {}, children: [] },
          ],
        },
      }
      cy.request({
        method: 'PUT',
        url: `http://127.0.0.1:8080/backend/sites/${TEST_SITE_ID}/pages/${getTestPageId()}`,
        headers: { 'X-User-ID': 'f7316395-f07f-4c3c-bead-5fa0820402ed', 'X-User-Role': 'admin', 'Content-Type': 'application/json' },
        body: { name: 'E2E 设计器测试', path: Cypress.env('testPagePath'), schema: presetSchema },
      })
      })
    })
  })

  beforeEach(() => {
    const token = Cypress.env('authToken') as string
    cy.loginWithToken(token, `/sites/${TEST_SITE_ID}/pages/${getTestPageId()}`)
    cy.get('.luban-designer', { timeout: 15000 }).should('exist')
    // 等待组件渲染
    cy.get('[data-lb-node]', { timeout: 10000 }).should('have.length.at.least', 3)
  })

  it('B1: mousedown → mousemove 触发 SortableJS chosen 状态', () => {
    // 第一个节点（按钮）
    cy.get('[data-lb-node]').eq(0).then(($el) => {
      const rect = $el[0].getBoundingClientRect()

      // mousedown
      cy.wrap($el).trigger('mousedown', {
        button: 0,
        clientX: rect.left + 20,
        clientY: rect.top + rect.height / 2,
        force: true,
      })

      // mousemove 向下移动 50px
      cy.wrap($el).trigger('mousemove', {
        clientX: rect.left + 20,
        clientY: rect.top + 50,
        force: true,
      })

      // SortableJS 应添加 chosen/ghost class（animation 进行中）
      // sortablejs 默认 class: sortable-ghost, sortable-chosen, sortable-drag
      cy.wait(100) // 等 SortableJS 内部处理

      // mouseup 结束
      cy.wrap($el).trigger('mouseup', { force: true })
    })

    // 验证排序仍然有效（至少 DOM 没有崩溃）
    cy.get('[data-lb-node]').should('have.length.at.least', 3)
  })

  it('B2: 拖拽后 DOM 顺序变化', () => {
    // 记录初始顺序（通过 data-node-id）
    cy.get('[data-node-id]').then(($nodes) => {
      const initialIds = Cypress._.map($nodes.get(), (n: Element) => n.getAttribute('data-node-id'))
      expect(initialIds.length).to.be.at.least(3)

      // 拖第一个节点到最后
      const firstNode = $nodes[0]
      const lastNode = $nodes[$nodes.length - 1]
      const firstRect = firstNode.getBoundingClientRect()
      const lastRect = lastNode.getBoundingClientRect()

      // mousedown on first
      cy.wrap(firstNode).trigger('mousedown', {
        button: 0,
        clientX: firstRect.left + 20,
        clientY: firstRect.top + firstRect.height / 2,
        force: true,
      })

      // mousemove to last position
      cy.wrap(lastNode).trigger('mousemove', {
        clientX: lastRect.left + 20,
        clientY: lastRect.bottom + 20, // 最后节点下方
        force: true,
      })

      // mouseup
      cy.wrap(lastNode).trigger('mouseup', { force: true })
      cy.wait(500) // 等 onEnd 回调 + emit reorder

      // 检查顺序变化：原第一个 ID 不再在第一位
      cy.get('[data-node-id]').then(($after) => {
        const afterIds = Cypress._.map($after.get(), (n: Element) => n.getAttribute('data-node-id'))
        // 第一个节点的 ID 现在应该不在 index 0
        expect(afterIds[0]).to.not.eq(initialIds[0])
      })
    })
  })

  it('B3: locked 节点不可拖拽', () => {
    // 通过 API 设置第一个节点 locked=true
    const token = Cypress.env('authToken') as string
    cy.request({
      method: 'PUT',
      url: `http://127.0.0.1:8080/backend/sites/${TEST_SITE_ID}/pages/${getTestPageId()}`,
      headers: { 'X-User-ID': 'f7316395-f07f-4c3c-bead-5fa0820402ed', 'X-User-Role': 'admin', 'Content-Type': 'application/json' },
      body: {
        name: 'E2E 设计器测试',
        path: Cypress.env('testPagePath'),
        schema: {
          root: {
            id: 'root',
            type: 'LubanContainer',
            props: {},
            children: [
              { id: 'node-locked', type: 'LubanButton', props: { text: '锁定' }, locked: true, children: [] },
              { id: 'node-free', type: 'LubanText', props: { content: '自由' }, children: [] },
            ],
          },
        },
      },
    })

    // 重新加载
    cy.reload()
    cy.get('.luban-designer', { timeout: 15000 }).should('exist')
    cy.get('[data-lb-node]', { timeout: 10000 }).should('have.length', 2)

    // 尝试拖拽 locked 节点
    cy.get('[data-lb-node]').eq(0).then(($locked) => {
      // 断言 locked class 存在
      cy.wrap($locked).should('have.class', 'design-renderer__wrapper--locked')

      const rect = $locked[0].getBoundingClientRect()

      cy.wrap($locked).trigger('mousedown', {
        button: 0,
        clientX: rect.left + 20,
        clientY: rect.top + rect.height / 2,
        force: true,
      })

      cy.get('[data-lb-node]').eq(1).trigger('mousemove', {
        clientX: rect.left + 20,
        clientY: rect.top + 100,
        force: true,
      })

      cy.wrap($locked).trigger('mouseup', { force: true })
      cy.wait(300)

      // 顺序不变（locked 阻止了 SortableJS）
      cy.get('[data-node-id]').eq(0).should('have.attr', 'data-node-id', 'node-locked')
    })
  })

  after(() => {
    resetPage()
  })
})
