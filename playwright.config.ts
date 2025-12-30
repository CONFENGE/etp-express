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
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - increased to 2 for stability */
  retries: process.env.CI ? 2 : 0,
  /* Enable parallelism in CI for faster execution */
  workers: process.env.CI ? 4 : undefined,
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

    /* Disable onboarding tour in E2E tests to prevent overlay blocking clicks */
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.E2E_BASE_URL || 'http://localhost:5173',
          localStorage: [
            {
              name: 'etp-express-tour',
              value: JSON.stringify({ hasCompletedTour: true }),
            },
          ],
        },
      ],
    },
  },

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
  /* In CI, we start backend + frontend manually before running tests */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd frontend && npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120000, // 2 minutes timeout for server to start
      },
});
