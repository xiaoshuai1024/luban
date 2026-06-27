import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/mocks/**',
        'src/__tests__/**',
        'src/main.ts',
        'src/__mocks__/**',
        'src/composables/**',
        'src/views/page/PageEditor.vue',
      ],
      thresholds: {
        lines: 76,
        functions: 52,
        branches: 83,
        statements: 76,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 测试环境 mock luban-low-code（实际包通过 link 安装但 vitest 解析不了）
      'luban-low-code': fileURLToPath(
        new URL('./src/__mocks__/luban-low-code.ts', import.meta.url),
      ),
    },
  },
});
