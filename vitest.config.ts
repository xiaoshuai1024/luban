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
      ],
      thresholds: {
        lines: 5,
        functions: 5,
        branches: 5,
        statements: 5,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
