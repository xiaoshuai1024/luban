import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'luban-base': fileURLToPath(
        new URL('../../../packages/ui/luban-ui/packages/luban-base/src/index.ts', import.meta.url)
      ),
    },
  },
  preview: {
    port: 4200,
    host: true,
  },
  server: {
    allowedHosts: ['localhost', '127.0.0.1', 'test.local'],
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      // AI 助手服务（FastAPI :8000）。SSE 流式：vite proxy 基于 http-proxy，
      // 流式响应无需额外缓冲配置；前端走相对路径 /ai/... 与 /api 一致。
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // WS /ai/agent 多步 agent
      },
      '/healthz': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
