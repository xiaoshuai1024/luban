/**
 * 场景 A：组件库拖入画布（HTML5 drag）
 *
 * 覆盖 plan §7.3 场景 A 的全部用例（A1~A6）：
 * - A1: dragstart 设 dataTransfer 数据
 * - A2: drop 后画布出现新节点
 * - A3: drop-active 高亮 class
 * - A4: 插入指示线
 * - A5: drop-preview ghost
 * - A6: 空数据拖入错误提示
 *
 * 真实事件链：trigger('dragstart', { dataTransfer }) → trigger('dragover') → trigger('drop')
 */
import '@4tw/cypress-drag-drop'
import { TEST_SITE_ID, TEST_PAGE_ID, loginAndGetToken, resetPage } from './_helpers'

describe('设计器 § 场景 A: 组件库拖入画布', { testIsolation: false }, () => {
  before(() => {
    // 获取真实 token（通过 BFF login API）
    cy.request({
      method: 'POST',
      url: 'http://127.0.0.1:3100/api/auth/login',
      body: { username: 'admin', password: 'admin123' },
    }).then((res) => {
      const token = res.body.token
      Cypress.env('authToken', token)

      // 重置页面 schema
      cy.resetPageSchema(TEST_SITE_ID, TEST_PAGE_ID, token)
    })
  })

  beforeEach(() => {
    const token = Cypress.env('authToken') as string
    cy.loginWithToken(token, `/sites/${TEST_SITE_ID}/pages/${TEST_PAGE_ID}`)
    // 等待 PageEditor + LubanDesigner 加载
    cy.get('.luban-designer', { timeout: 15000 }).should('exist')
  })

  it('A1: dragstart 事件正确设置 dataTransfer', () => {
    // 组件面板应有 LubanButton 项
    cy.get('[data-palette-type="LubanButton"]', { timeout: 10000 }).should('exist')

    // 触发 dragstart 并检查 dataTransfer
    cy.get('[data-palette-type="LubanButton"]').then(($el) => {
      const dataTransfer = new DataTransfer()

      cy.wrap($el)
        .trigger('dragstart', { dataTransfer, force: true })
        .then(() => {
          // dataTransfer 应包含 application/json 类型
          expect(dataTransfer.types).to.include('application/json')
          const raw = dataTransfer.getData('application/json')
          const data = JSON.parse(raw)
          expect(data).to.have.property('type', 'LubanButton')
        })
    })
  })

  it('A2: 拖入画布后出现新节点 [data-lb-node]', () => {
    // 记录拖入前的节点数
    cy.get('[data-lb-node]').then(($before) => {
      const beforeCount = $before.length

      // 执行拖拽
      cy.dragFromPanelToCanvas('[data-palette-type="LubanButton"]', '.luban-designer__canvas')

      // 等待 DOM 更新
      cy.wait(300)

      // 断言节点数增加
      cy.get('[data-lb-node]').should('have.length', beforeCount + 1)

      // 断言新节点的类型
      cy.get('[data-lb-node]')
        .last()
        .invoke('attr', 'data-lb-type')
        .should('eq', 'LubanButton')
    })
  })

  it('A3: 拖入时画布显示 drop-active 高亮', () => {
    cy.get('[data-palette-type="LubanButton"]').then(($el) => {
      const dataTransfer = new DataTransfer()

      // dragenter → 触发 drop-active class
      cy.wrap($el).trigger('dragstart', { dataTransfer, force: true })
      cy.get('.luban-designer__canvas').trigger('dragenter', { dataTransfer, force: true })

      // 断言高亮 class 存在
      cy.get('.luban-designer__canvas--drop-active').should('exist')

      // dragleave → class 移除
      cy.get('.luban-designer__canvas').trigger('dragleave', { force: true })
      cy.get('.luban-designer__canvas--drop-active').should('not.exist')
    })
  })

  it('A4: 拖入组件间隙显示插入指示线', () => {
    // 先拖入一个组件确保有间隙
    cy.dragFromPanelToCanvas('[data-palette-type="LubanText"]', '.luban-designer__canvas')
    cy.wait(200)

    // 再拖入第二个，应在间隙显示指示线
    cy.get('[data-palette-type="LubanButton"]').then(($el) => {
      const dataTransfer = new DataTransfer()

      cy.wrap($el).trigger('dragstart', { dataTransfer, force: true })

      // dragover 时应显示插入指示线
      cy.get('.luban-designer__canvas').trigger('dragover', {
        dataTransfer,
        force: true,
        clientY: 200, // 画布中间位置
      })

      // 断言插入指示线存在（蓝色横线）
      cy.get('.luban-designer__insert-line').should('exist')

      // 清理：drop 完成
      cy.get('.luban-designer__canvas').trigger('drop', { dataTransfer, force: true })
    })
  })

  it('A5: 拖入时显示 drop-preview ghost（组件类型名）', () => {
    cy.get('[data-palette-type="LubanText"]').then(($el) => {
      const dataTransfer = new DataTransfer()

      cy.wrap($el).trigger('dragstart', { dataTransfer, force: true })

      // dragover 触发 updateDropPreview
      cy.get('.luban-designer__canvas').trigger('dragover', {
        dataTransfer,
        force: true,
        clientX: 400,
        clientY: 300,
      })

      // drop-preview ghost 应显示 "+ LubanText"
      cy.get('.luban-designer__drop-preview').should('contain', 'LubanText')

      // 清理
      cy.get('.luban-designer__canvas').trigger('drop', { dataTransfer, force: true })
    })
  })

  it('A6: 空 dataTransfer 拖入显示错误提示', () => {
    const emptyDataTransfer = new DataTransfer()
    // 不设任何数据 → getData 返回空

    cy.get('.luban-designer__canvas').then(($canvas) => {
      cy.wrap($canvas).trigger('dragover', { dataTransfer: emptyDataTransfer, force: true })
      cy.wrap($canvas).trigger('drop', { dataTransfer: emptyDataTransfer, force: true })

      // 断言错误浮层出现
      cy.get('.luban-designer__drop-error').should('exist')
      cy.get('.luban-designer__drop-error').should('contain', '未检测到组件数据')
    })
  })

  after(() => {
    // 清理：重置页面
    const token = Cypress.env('authToken') as string
    cy.resetPageSchema(TEST_SITE_ID, TEST_PAGE_ID, token)
  })
})
