// @ts-check
/**
 * Engine ESLint v9 flat config
 * 对齐 docs/ARCH_LINT_STANDARDS.md §2 基线
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default tseslint.config(
  // === 基础推荐 ===
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vuePlugin.configs['flat/recommended'],

  // === Prettier 兼容（关闭冲突规则，放最后） ===
  prettierConfig,

  // === 全局配置 ===
  {
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
  },

  // === TypeScript/Vue 规则 ===
  {
    files: ['**/*.{ts,tsx,vue,js,jsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // === 测试文件豁免（放最后，覆盖前面的 boundaries 规则） ===
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/__tests__/**', 'src/mocks/**'],
    rules: {
      'boundaries/no-unknown': 'off',
      'boundaries/no-ignored': 'off',
      'boundaries/element-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // === 架构边界（eslint-plugin-boundaries） ===
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'types', pattern: 'src/types/**', mode: 'full' },
        { type: 'utils', pattern: 'src/utils/**', mode: 'full' },
        { type: 'api', pattern: 'src/api/**', mode: 'full' },
        { type: 'stores', pattern: 'src/stores/**', mode: 'full' },
        { type: 'mocks', pattern: 'src/mocks/**', mode: 'full' },
        { type: 'layouts', pattern: 'src/layouts/**', mode: 'full' },
        { type: 'views', pattern: 'src/views/**', mode: 'full' },
        { type: 'router', pattern: 'src/router/**', mode: 'full' },
        { type: 'styles', pattern: 'src/styles/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/no-unknown': 'error',
      'boundaries/no-ignored': 'error',
      'boundaries/element-types': [
        'error',
        {
          // 依赖方向：稳定层 → 易变层（types 最稳定，views 最易变）
          default: 'disallow',
          rules: [
            { from: 'types', allow: [] },
            { from: 'utils', allow: ['types'] },
            { from: 'api', allow: ['types', 'utils', 'mocks'] },
            { from: 'stores', allow: ['types', 'api'] },
            { from: 'mocks', allow: ['types', 'api'] },
            { from: 'layouts', allow: ['stores', 'api', 'types'] },
            { from: 'views', allow: ['stores', 'api', 'types', 'utils', 'layouts', 'views'] },
            { from: 'router', allow: ['api', 'layouts', 'views'] },
            { from: 'styles', allow: [] },
          ],
        },
      ],
    },
  },

  // === TypeScript/Vue 规则 ===
  {
    files: ['**/*.{ts,tsx,vue,js,jsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // === 忽略文件 ===
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'cypress/**',
      '*.config.ts',
      '*.config.mjs',
    ],
  },
);
