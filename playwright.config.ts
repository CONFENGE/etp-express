import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Railway Testing Configuration (#1138):
 * - When E2E_BASE_URL is set, tests run against Railway production
 * - E2E_API_URL should be the base URL without /api/v1 (tests add this prefix)
 * - NestJS uses URI versioning with defaultVersion: '1' (routes are /api/v1/...)
 * - PLAYWRIGHT_WORKERS controls parallel execution (default: 4 for Railway)
 */

// Determine if we're testing against Railway (remote) or local
const isRemoteTesting = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
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
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude visual regression tests (run separately with --project=visual)
      testIgnore: /.*\.visual\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /.*\.visual\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /.*\.visual\.spec\.ts/,
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
