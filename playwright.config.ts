import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Railway Testing Configuration (#1138):
 * - When E2E_BASE_URL is set, tests run against Railway production
 * - E2E_API_URL should be the base URL without /api/v1 (tests add this prefix)
 * - NestJS uses URI versioning with defaultVersion: '1' (routes are /api/v1/...)
 * - PLAYWRIGHT_WORKERS controls parallel execution (default: 4 for Railway)
 *
 * Performance Optimizations:
 * - Global setup performs single login, saving auth state
 * - Tests reuse storage state, eliminating per-test login (~1500ms saved/test)
 */

// Determine if we're testing against Railway (remote) or local
const isRemoteTesting = !!process.env.E2E_BASE_URL;

// Auth storage state path
const AUTH_FILE = path.join(__dirname, 'e2e/.auth/user.json');

export default defineConfig({
  testDir: './e2e',

  /* Global setup: login once, save storage state for all tests */
  globalSetup: require.resolve('./e2e/setup/global-setup'),

  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Workers: Use PLAYWRIGHT_WORKERS env var, or 1 for CI, or auto for local */
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : process.env.CI
      ? 1
      : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Extended timeouts for remote testing against Railway */
    actionTimeout: isRemoteTesting ? 30000 : 10000,
    navigationTimeout: isRemoteTesting ? 60000 : 30000,
  },

  /* Global timeout for each test - longer for remote testing */
  timeout: isRemoteTesting ? 120000 : 60000,

  /* Configure projects for major browsers */
  projects: [
    /**
     * Auth tests project - no storage state (tests login flow)
     * Runs auth tests without pre-authenticated state
     */
    {
      name: 'auth',
      testDir: './e2e/auth',
      use: {
        ...devices['Desktop Chrome'],
        // Auth tests must NOT use storage state - they test login
        storageState: { cookies: [], origins: [] },
      },
    },

    /**
     * Main tests project - uses storage state for authenticated tests
     * Skips login by reusing auth state from global setup
     */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reuse auth state from global setup (~1500ms saved per test)
        storageState: AUTH_FILE,
      },
      // Exclude visual regression tests and auth tests
      testIgnore: [/.*\.visual\.spec\.ts/, /auth\/.*/],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      testIgnore: [/.*\.visual\.spec\.ts/, /auth\/.*/],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
      testIgnore: [/.*\.visual\.spec\.ts/, /auth\/.*/],
    },

    /* Visual regression testing project */
    {
      name: 'visual',
      testDir: './e2e/visual',
      testMatch: /.*\.visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
        storageState: AUTH_FILE,
      },
      // Visual tests only run in CI with --project=visual
    },

    /* Test against mobile viewports. */
    // {
    // name: 'Mobile Chrome',
    // use: { ...devices['Pixel 5'] },
    // },
    // {
    // name: 'Mobile Safari',
    // use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    // name: 'Microsoft Edge',
    // use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    // name: 'Google Chrome',
    // use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  /* Skip webServer when testing against Railway (E2E_BASE_URL is set) */
  ...(isRemoteTesting
    ? {}
    : {
        webServer: {
          command: 'cd frontend && npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120000, // 2 minutes timeout for server to start
        },
      }),
});
