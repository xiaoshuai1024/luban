import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    setupNodeEvents(on, _config) {
      // @4tw/cypress-drag-drop 插件提供 .drag() 命令
      on('task', {})
    },
    // 真实 drag-drop 需要的浏览器配置
    experimentalFetchPolyfill: true,
  },
  // 拖拽测试需要更大的视口确保元素可见
  viewportWidth: 1440,
  viewportHeight: 900,
})
