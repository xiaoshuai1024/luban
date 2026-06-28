import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1', 'test.local'],
    proxy: {
      '/api': {
        // engine 前端 API 调用经此代理。默认指向 BFF（API 网关），
        // 可用 VITE_PROXY_TARGET 覆盖（如指向 website 的 SSR server）。
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3100',
        changeOrigin: true,
      },
    },
  },
});
