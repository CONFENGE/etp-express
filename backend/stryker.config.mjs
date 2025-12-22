// @ts-check
/** @type {import('@stryker-mutator/api').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  coverageAnalysis: 'perTest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  // Ignore patterns for sandbox creation (avoid copying coverage folder)
  ignorePatterns: ['coverage', 'coverage-demo', 'dist', 'node_modules', '.stryker-tmp', '.stryker-cache', 'reports'],
  mutate: [
    // Critical modules for mutation testing (correct paths under src/modules/)
    'src/modules/auth/**/*.ts',
    'src/modules/etps/**/*.ts',
    'src/modules/sections/**/*.ts',
    // Exclude test files, mocks, and non-logic files
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.mock.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/index.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  concurrency: 4,
  timeoutMS: 60000,
  incremental: true,
  incrementalFile: '.stryker-cache/stryker-incremental.json',
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
  clearTextReporter: {
    allowColor: true,
    logTests: true,
    maxTestsToLog: 3,
  },
  disableTypeChecks: '{test,src}/**/*.{js,ts,jsx,tsx,html,vue,mts,cts}',
};

export default config;
