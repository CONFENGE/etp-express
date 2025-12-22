// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginSecurity from 'eslint-plugin-security';
import globals from 'globals';

export default defineConfig([
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '.stryker-tmp/',
      '*.log',
      '.env',
      'eslint.config.mjs',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Prettier config (disables conflicting rules)
  eslintConfigPrettier,

  // Main configuration for TypeScript source files (with type checking)
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts', 'src/scripts/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: eslintPluginPrettier,
      security: eslintPluginSecurity,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // Scripts configuration (allow console.log)
  {
    files: ['src/scripts/**/*.ts', 'scripts/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off', // Scripts are allowed to use console
      'prettier/prettier': 'error',
    },
  },

  // Test files configuration (without type checking since they're excluded from tsconfig)
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        // No project reference - test files are excluded from tsconfig.json
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      // Relax some rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off', // Allow require() in tests for mocking
      '@typescript-eslint/no-unsafe-function-type': 'off', // Allow Function type in tests
      '@typescript-eslint/ban-ts-comment': 'off', // Allow @ts-ignore in tests
      'no-console': 'off',
      'prettier/prettier': 'error',
    },
  },
]);
