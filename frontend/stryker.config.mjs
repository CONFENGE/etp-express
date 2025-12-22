// @ts-check
/** @type {import('@stryker-mutator/api').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  coverageAnalysis: 'perTest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  mutate: [
    // Critical components for mutation testing
    'src/components/**/*.tsx',
    'src/hooks/**/*.ts',
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    // Exclude test files and non-critical files
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/*.stories.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.tsx',
    '!src/App.tsx',
    '!src/vite-env.d.ts',
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
