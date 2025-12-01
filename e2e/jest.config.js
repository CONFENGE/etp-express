/**
 * Jest Configuration for E2E Tests
 *
 * @description Configuração do Jest para testes end-to-end com Puppeteer e TypeScript.
 * Usa ts-jest para transpilação de TypeScript e configurações específicas para E2E.
 *
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  // Preset do ts-jest para suportar TypeScript
  preset: 'ts-jest',

  // Ambiente de testes (node para Puppeteer, não jsdom)
  testEnvironment: 'node',

  // Root do projeto de testes
  rootDir: '.',

  // Padrões de arquivos de teste
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],

  // Timeout padrão para testes (60 segundos)
  testTimeout: 60000,

  // Transformação de arquivos TypeScript
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          skipLibCheck: true,
        },
      },
    ],
  },

  // Módulos que não devem ser transformados (node_modules exceto se necessário)
  transformIgnorePatterns: ['node_modules/(?!(puppeteer)/)'],

  // Módulos a serem ignorados
  modulePathIgnorePatterns: [
    '<rootDir>/screenshots/',
    '<rootDir>/jest.config.temp.json',
  ],

  // Extensões de arquivos reconhecidas
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Verbose output
  verbose: true,

  // Detectar testes em paralelo (false para Puppeteer, evita conflitos de browser)
  maxWorkers: 1,

  // Detectar handles abertos (sockets, timers) e forçar encerramento
  detectOpenHandles: true,

  // Forçar saída após testes concluídos
  forceExit: true,

  // Cobertura de código (opcional)
  collectCoverage: false,
  collectCoverageFrom: [
    'utils/**/*.ts',
    '!utils/**/*.spec.ts',
    '!utils/**/*.test.ts',
  ],

  // Reporters de teste
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'e2e-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // Global setup/teardown (se necessário)
  // globalSetup: './jest.global-setup.js',
  // globalTeardown: './jest.global-teardown.js',
};
