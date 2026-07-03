/** @type {import('dependency-cruiser').IConfiguration} */
// Engine 模块依赖边界配置
// 对齐 docs/ARCH_LINT_STANDARDS.md §5 + eslint-plugin-boundaries 规则
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      // 降为 warn：request→mocks→api 开发态 mock 注入形成已知循环（setupMock 是 dev-only），
      // 真实循环依赖仍会报警告可见，但不阻断 CI
      severity: 'warn',
      comment: '检测循环依赖（request→mocks→api 开发态循环已豁免为 warn）',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: '检测孤立模块（无被引用）',
      from: {
        orphan: true,
        pathNot: '\\.(spec|test|d)\\.ts$',
      },
      to: {},
    },
    {
      name: 'no-reverse-layer-deps',
      severity: 'error',
      comment: '禁止反向分层依赖（views 不应被 stores/api 引用）',
      from: { path: 'src/(stores|api|utils|types|mocks)/' },
      to: { path: 'src/(views|layouts)/' },
    },
    {
      name: 'no-types-importing-business',
      severity: 'error',
      comment: 'types 层为叶子节点，不应引用业务层',
      from: { path: 'src/types/' },
      to: { path: 'src/(api|stores|views|layouts|utils|mocks)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
      archi: { collapsePattern: 'node_modules/[^/]+' },
    },
  },
};
