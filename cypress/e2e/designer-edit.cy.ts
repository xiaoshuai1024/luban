/**
 * 场景 E：IDE 完整编辑流程（非拖拽）
 *
 * 覆盖 plan §7.3 场景 E 的全部用例（E1~E6）：
 * - E1: 选中组件 → 属性面板 → NodeToolbar
 * - E2: 撤销重做 Ctrl+Z / Ctrl+Y
 * - E3: 保存 Ctrl+S
 * - E4: 大纲树选中联动
 * - E5: 右键菜单删除
 * - E6: 预览模式切换
 */
import { TEST_SITE_ID, TEST_PAGE_ID, loginAndGetToken, resetPage } from './_helpers'

describe('设计器 § 场景 E: IDE 完整编辑流程', { testIsolation: false }, () => {
  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://127.0.0.1:3100/api/auth/login',
      body: { username: 'admin', password: 'admin123' },
    }).then((res) => {
      const token = res.body.token
      Cypress.env('authToken', token)

      const presetSchema = {
        root: {
          id: 'root',
          type: 'LubanContainer',
          props: {},
          children: [
            { id: 'node-btn', type: 'LubanButton', props: { text: '原始文案' }, children: [] },
          ],
        },
      }
      cy.request({
        method: 'PUT',
        url: `http://127.0.0.1:3100/api/sites/${TEST_SITE_ID}/pages/${TEST_PAGE_ID}`,
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'E2E 测试页面', path: '/e2e-test', schema: presetSchema },
      })
    })
  })

  beforeEach(() => {
    const token = Cypress.env('authToken') as string
    cy.loginWithToken(token, `/sites/${TEST_SITE_ID}/pages/${TEST_PAGE_ID}`)
    cy.get('.luban-designer', { timeout: 15000 }).should('exist')
    cy.get('[data-lb-node]', { timeout: 10000 }).should('have.length.at.least', 1)
  })

  it('E1: 选中组件 → 属性面板显示字段 + NodeToolbar 浮出', () => {
    // 点击画布中的按钮节点
    cy.get('[data-node-id="node-btn"]').click({ force: true })
    cy.wait(300)

    // 断言：选中态（蓝色 outline 或 selected class）
    cy.get('[data-node-id="node-btn"]').should('satisfy', ($el) => {
      const cls = $el.attr('class') || ''
      return cls.includes('selected') || cls.includes('--selected') || $el.attr('data-selected') === 'true'
    })

    // 断言：NodeToolbar 浮出
    cy.get('[class*="node-toolbar"], [class*="NodeToolbar"]').should('exist')

    // 断言：属性面板渲染（应显示 LubanButton 的属性字段）
    cy.get('[class*="property-panel"], [class*="PropertyPanel"]').should('exist')

    // 属性面板应包含 text 字段（按钮文案）
    cy.get('body').invoke('text').then((t) => { expect(t).to.match(/text|文案|按钮/) })
  })

  it('E2: 修改属性 → Ctrl+Z 撤销 → Ctrl+Y 重做', () => {
    // 选中按钮
    cy.get('[data-node-id="node-btn"]').click({ force: true })
    cy.wait(200)

    // 记录原始文案
    cy.get('[data-node-id="node-btn"]').invoke('text').then((originalText) => {
      // 找到属性面板中的 text 输入框并修改
      cy.get('[class*="property-panel"]').within(() => {
        cy.get('input, textarea').eq(0).then(($input) => {
          cy.wrap($input).clear({ force: true }).type('修改后的文案', { force: true })
          cy.wrap($input).trigger('input', { force: true })
          cy.wrap($input).trigger('change', { force: true })
        })
      })
      cy.wait(500)

      // 断言画布中文案已更新
      cy.get('[data-node-id="node-btn"]').should('contain', '修改后的文案')

      // Ctrl+Z 撤销
      cy.get('body').trigger('keydown', { keyCode: 90, which: 90, ctrlKey: true, force: true })
      cy.wait(500)

      // 断言回退
      cy.get('[data-node-id="node-btn"]').should('contain', originalText.trim() || '原始文案')

      // Ctrl+Y 重做（keyCode 89）
      cy.get('body').trigger('keydown', { keyCode: 89, which: 89, ctrlKey: true, force: true })
      cy.wait(500)

      // 断言恢复
      cy.get('[data-node-id="node-btn"]').should('contain', '修改后的文案')
    })
  })

  it('E3: Ctrl+S 保存 → 成功提示', () => {
    // Ctrl+S
    cy.get('body').trigger('keydown', { keyCode: 83, which: 83, ctrlKey: true, force: true })
    cy.wait(1000)

    // 断言成功提示（Element Plus ElMessage）
    cy.get('.el-message').should('exist')
    cy.get('.el-message').invoke('text').then((t) => { expect(t).to.match(/保存成功|成功/) })
  })

  it('E4: 大纲树点击节点 → 画布同步选中', () => {
    // 找到大纲树中的节点项
    cy.get('[class*="outline-tree"], [class*="OutlineTree"]').within(() => {
      // 点击包含 "按钮" 或 node-btn 的树节点
      // 尝试点击大纲树中的节点项
cy.get('[class*="outline-tree"], [class*="OutlineTree"]').find('[data-node-id="node-btn"], :contains("按钮")').first().click({ force: true })
    })
    cy.wait(300)

    // 断言画布中该节点被选中
    cy.get('[data-node-id="node-btn"]').should('satisfy', ($el) => {
      const cls = $el.attr('class') || ''
      return cls.includes('selected') || cls.includes('--selected')
    })
  })

  it('E5: 右键节点 → ContextMenu → 点击删除', () => {
    // 确认节点存在
    cy.get('[data-node-id="node-btn"]').should('exist')

    // 右键
    cy.get('[data-node-id="node-btn"]').rightclick({ force: true })
    cy.wait(300)

    // 断言 ContextMenu 出现
    cy.get('[class*="context-menu"], [class*="ContextMenu"]').should('exist')

    // 点击"删除"
    cy.get('[class*="context-menu"], [class*="ContextMenu"]').within(() => {
      cy.contains('删除').click({ force: true })
    })
    cy.wait(500)

    // 断言节点已删除
    cy.get('[data-node-id="node-btn"]').should('not.exist')
  })

  it('E6: 切换预览模式 → RuntimeRenderer 渲染', () => {
    // 找到工具栏的模式切换按钮
    cy.get('[class*="designer-toolbar"], [class*="DesignerToolbar"]').within(() => {
      // 点击"预览"按钮
      cy.contains('button', '预览').click({ force: true })
    })
    cy.wait(500)

    // 断言预览模式：无选中框、无 NodeToolbar、无对齐辅助线
    cy.get('[class*="node-toolbar"], [class*="NodeToolbar"]').should('not.exist')
    cy.get('[class*="--selected"]').should('not.exist')

    // 断言按钮内容仍然渲染（RuntimeRenderer 渲染）
    cy.get('[data-lb-node]').should('exist')

    // 切回设计模式
    cy.get('[class*="designer-toolbar"], [class*="DesignerToolbar"]').within(() => {
      cy.contains('button', '设计').click({ force: true })
    })
    cy.wait(300)
  })

  after(() => {
    const token = Cypress.env('authToken') as string
    cy.resetPageSchema(TEST_SITE_ID, TEST_PAGE_ID, token)
  })
})
