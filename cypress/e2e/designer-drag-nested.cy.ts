/**
 * 场景 C：跨嵌套容器拖拽
 *
 * 覆盖 plan §7.3 场景 C 的全部用例（C1~C3）：
 * - C1: Col1 → Col2 跨容器移动节点
 * - C2: 组件库拖入到指定 Col 容器内部
 * - C3: 不允许跨类型拖拽（canAcceptChild 拦截）
 *
 * SortableJS group='luban-nodes' 实现跨容器拖拽，所有容器共享同一个 group
 */
import { TEST_SITE_ID, loginAndGetToken, createTestPage, getTestPageId, presetPageSchema, resetPage } from './_helpers'

describe('设计器 § 场景 C: 跨嵌套容器拖拽', { testIsolation: false }, () => {
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
      // 预设 schema：Row 容器含两个 Col，Col1 有按钮
      const presetSchema = {
        root: {
          id: 'root',
          type: 'LubanContainer',
          props: {},
          children: [
            {
              id: 'row-1',
              type: 'LubanRow',
              props: {},
              children: [
                {
                  id: 'col-1',
                  type: 'LubanCol',
                  props: { span: 12 },
                  children: [
                    { id: 'btn-in-col1', type: 'LubanButton', props: { text: 'Col1按钮' }, children: [] },
                  ],
                },
                {
                  id: 'col-2',
                  type: 'LubanCol',
                  props: { span: 12 },
                  children: [],
                },
              ],
            },
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
    // 等待 Row/Col 渲染（root + row + col1 + col2 + btn = 至少 4 个非 root 节点）
    cy.get('[data-lb-node]', { timeout: 10000 }).should('have.length.at.least', 4)
  })

  it('C1: 从 Col1 拖按钮到 Col2', () => {
    // 确认初始状态：按钮存在
    cy.get('[data-node-id="btn-in-col1"]').should('exist')

    // 获取按钮和 Col2 的位置
    cy.get('[data-node-id="btn-in-col1"]').first().then(($btn) => {
      const btnRect = $btn[0].getBoundingClientRect()

      cy.get('[data-node-id="col-2"]').first().then(($col2) => {
        const col2Rect = $col2[0].getBoundingClientRect()

        // SortableJS 拖拽：mousedown on btn → mousemove to col2 → mouseup
        cy.get('[data-node-id="btn-in-col1"]').first().trigger('mousedown', {
          button: 0,
          clientX: btnRect.left + 20,
          clientY: btnRect.top + btnRect.height / 2,
          force: true,
        })

        cy.get('[data-node-id="col-2"]').first().trigger('mousemove', {
          clientX: col2Rect.left + col2Rect.width / 2,
          clientY: col2Rect.top + 20,
          force: true,
        })

        cy.get('[data-node-id="col-2"]').first().trigger('mouseup', { force: true })
        cy.wait(500)

        // 断言：按钮从 col-1 移到 col-2
        cy.get('[data-node-id="col-1"]').first().find('[data-node-id="btn-in-col1"]').should('not.exist')
        cy.get('[data-node-id="col-2"]').first().find('[data-node-id="btn-in-col1"]').should('exist')
      })
    })
  })

  it('C2: 从组件库拖新组件到 Col2 内部', () => {
    // 记录 col-2 当前子节点数
    cy.get('[data-node-id="col-2"]').first().find('[data-lb-node]').then(($before) => {
      const beforeCount = $before.length

      // HTML5 drag from panel → drop on col-2
      cy.get('.lb-component-panel__item:contains("文本")').then(($el) => {
        const dataTransfer = new DataTransfer()

        cy.wrap($el).trigger('dragstart', { dataTransfer, force: true })

        // drop 到 col-2 容器
        cy.get('[data-node-id="col-2"]').first().trigger('dragover', { dataTransfer, force: true })
        cy.get('[data-node-id="col-2"]').first().trigger('drop', { dataTransfer, force: true })

        cy.wait(300)

        // 断言 col-2 子节点增加
        cy.get('[data-node-id="col-2"]').first().find('[data-lb-node]').should('have.length', beforeCount + 1)
      })
    })
  })

  it('C3: 不允许将非容器组件拖入 LubanButton 内部', () => {
    // 预设 schema：画布有 Button 和 Text
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
              { id: 'btn-non-container', type: 'LubanButton', props: { text: '我不是容器' }, children: [] },
              { id: 'txt-orphan', type: 'LubanText', props: { content: '文本' }, children: [] },
            ],
          },
        },
      },
    })
    cy.reload()
    cy.get('.luban-designer', { timeout: 15000 }).should('exist')
    cy.get('[data-lb-node]', { timeout: 10000 }).should('have.length', 2)

    // 尝试拖 Text 到 Button 内部
    cy.get('[data-node-id="txt-orphan"]').first().then(($txt) => {
      const txtRect = $txt[0].getBoundingClientRect()

      cy.get('[data-node-id="btn-non-container"]').first().then(($btn) => {
        const btnRect = $btn[0].getBoundingClientRect()

        cy.get('[data-node-id="txt-orphan"]').first().trigger('mousedown', {
          button: 0,
          clientX: txtRect.left + 20,
          clientY: txtRect.top + txtRect.height / 2,
          force: true,
        })

        cy.get('[data-node-id="btn-non-container"]').first().trigger('mousemove', {
          clientX: btnRect.left + btnRect.width / 2,
          clientY: btnRect.top + btnRect.height / 2,
          force: true,
        })

        cy.get('[data-node-id="btn-non-container"]').first().trigger('mouseup', { force: true })
        cy.wait(300)

        // 断言：Text 没有变成 Button 的子节点（Button 不是容器）
        cy.get('[data-node-id="btn-non-container"]').first().find('[data-node-id="txt-orphan"]').should('not.exist')
        // Text 仍在 root 层级
        cy.get('[data-node-id="txt-orphan"]').first().should('exist')
      })
    })
  })

  after(() => {
    resetPage()
  })
})
