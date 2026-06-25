import '@4tw/cypress-drag-drop'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Set JWT token in localStorage and optionally visit a path
       */
      loginWithToken(token?: string, visitPath?: string): Chainable<void>

      /**
       * 模拟 HTML5 drag：从组件面板项拖到画布
       * 底层用 dragstart + drop 事件链（带真实 DataTransfer）
       */
      dragFromPanelToCanvas(panelItemSelector: string, canvasSelector: string): Chainable<void>

      /**
       * 模拟 SortableJS 拖拽排序：mousedown → mousemove → mouseup
       */
      sortableReorder(sourceSelector: string, targetSelector: string, offsetY?: number): Chainable<void>

      /**
       * 断言拖拽时的视觉反馈元素存在
       */
      assertDragVisualFeedback(type: 'drop-active' | 'insert-line' | 'drop-preview' | 'drop-hint'): Chainable<void>

      /**
       * 重置页面 schema 为空白页面（通过 API）
       */
      resetPageSchema(siteId: string, pageId: string, token: string): Chainable<void>
    }
  }
}

const MOCK_TOKEN = 'mock-jwt-token'

// 真实登录获取 token
function loginUser(): void {
  cy.request({
    method: 'POST',
    url: 'http://127.0.0.1:3000/api/auth/login',
    body: { username: 'admin', password: 'admin123' },
  }).then((res) => {
    Cypress.env('authToken', res.body.token)
    cy.window().then((win) => {
      win.localStorage.setItem('luban_token', res.body.token)
    })
  })
}

Cypress.Commands.add('loginWithToken', (token?: string, visitPath = '/dashboard') => {
  // 用 cy.session 缓存登录状态（自动管理 localStorage 跨 visit 持久化）
  const useRealLogin = !token || token === MOCK_TOKEN

  if (useRealLogin) {
    cy.session(
      'admin-user',
      () => {
        // cy.session 内部会在 blank page 上执行，然后保存 localStorage snapshot
        cy.request({
          method: 'POST',
          url: 'http://127.0.0.1:3000/api/auth/login',
          body: { username: 'admin', password: 'admin123' },
        }).then((res) => {
          Cypress.env('authToken', res.body.token)
          // cy.session 自动保存 window state（含 localStorage）
          cy.window().then((win) => {
            win.localStorage.setItem('luban_token', res.body.token)
          })
        })
      },
      {
        cacheAcrossSpecs: true,
      }
    )
  } else {
    // 用传入的 token
    cy.window().then((win) => {
      win.localStorage.setItem('luban_token', token)
    })
  }

  // visit 目标路径（cy.session 会自动恢复 localStorage）
  if (visitPath) {
    cy.visit(visitPath, {
      onBeforeLoad(win) {
        // 双保险：确保 token 在导航前注入
        const t = token && token !== MOCK_TOKEN ? token : win.localStorage.getItem('luban_token')
        if (t) win.localStorage.setItem('luban_token', t)
      },
    })
  }
})

/**
 * 模拟 HTML5 拖拽：dragstart → dragover → drop 事件链
 * 用真实的 DataTransfer 对象确保浏览器行为一致性
 */
Cypress.Commands.add('dragFromPanelToCanvas', (panelItemSelector: string, canvasSelector: string) => {
  cy.get(panelItemSelector).then(($el) => {
    const dataTransfer = new DataTransfer()

    // 1. 在组件面板项上触发 dragstart
    cy.wrap($el)
      .trigger('dragstart', {
        dataTransfer,
        force: true,
      })
      .then(() => {
        // 2. 在画布上触发 dragover（LubanDesigner 需要此事件计算插入位置）
        cy.get(canvasSelector)
          .trigger('dragover', { dataTransfer, force: true })
          .then(() => {
            // 3. 在画布上触发 drop（触发 add-node）
            cy.get(canvasSelector).trigger('drop', { dataTransfer, force: true })
          })
      })
  })
})

/**
 * 模拟 SortableJS 拖拽排序
 * SortableJS 监听 mousedown/mousemove/mouseup，不是 HTML5 drag 事件
 */
Cypress.Commands.add('sortableReorder', (sourceSelector: string, targetSelector: string, offsetY = 100) => {
  cy.get(sourceSelector).then(($source) => {
    const sourceRect = $source[0].getBoundingClientRect()

    // mousedown 在源元素上
    cy.get(sourceSelector).trigger('mousedown', {
      button: 0,
      clientX: sourceRect.left + sourceRect.width / 2,
      clientY: sourceRect.top + sourceRect.height / 2,
      force: true,
    })

    // mousemove 到目标位置
    cy.get(targetSelector).trigger('mousemove', {
      clientX: sourceRect.left + sourceRect.width / 2,
      clientY: sourceRect.top + offsetY,
      force: true,
    })

    // mouseup 完成拖拽
    cy.get(targetSelector).trigger('mouseup', { force: true })
  })
})

/**
 * 断言拖拽时的视觉反馈元素
 */
Cypress.Commands.add('assertDragVisualFeedback', (type: 'drop-active' | 'insert-line' | 'drop-preview' | 'drop-hint') => {
  const selectorMap = {
    'drop-active': '.luban-designer__canvas--drop-active',
    'insert-line': '.luban-designer__insert-line',
    'drop-preview': '.luban-designer__drop-preview',
    'drop-hint': '.luban-designer__drop-hint',
  }
  cy.get(selectorMap[type]).should('exist')
})

/**
 * 重置页面 schema 为空白页面
 */
Cypress.Commands.add('resetPageSchema', (siteId: string, pageId: string, token: string) => {
  const emptySchema = { root: { id: 'root', type: 'LubanContainer', props: {}, children: [] } }
  cy.request({
    method: 'PUT',
    url: `http://127.0.0.1:3000/api/sites/${siteId}/pages/${pageId}`,
    headers: { Authorization: `Bearer ${token}` },
    body: { name: 'E2E 测试页面', path: '/e2e-test', schema: emptySchema },
  })
})
