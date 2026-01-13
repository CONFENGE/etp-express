/**
 * Global Setup for Playwright Tests
 *
 * Performs a single login before all tests and saves the authentication state.
 * Tests then reuse this state, eliminating the need to login in every test.
 *
 * Performance improvement: ~1500ms saved per test
 *
 * @module e2e/setup/global-setup
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

async function globalSetup(config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

  // Get credentials from environment
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[Global Setup] E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD not set. ' +
        'Tests will perform individual logins.',
    );
    return;
  }

  console.log(`[Global Setup] Logging in as ${email} to ${baseURL}...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill credentials
    await page.fill('input[name="email"], input#email', email);
    await page.fill('input[name="password"], input#password', password);

    // Submit and wait for dashboard
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, {
      timeout: process.env.CI ? 60000 : 30000,
    });

    console.log('[Global Setup] Login successful. Saving storage state...');

    // Save storage state for reuse
    await context.storageState({ path: AUTH_FILE });

    console.log(`[Global Setup] Storage state saved to ${AUTH_FILE}`);
  } catch (error) {
    console.error('[Global Setup] Login failed:', error);
    // Don't fail the entire test run - tests can fall back to individual login
    console.warn(
      '[Global Setup] Tests will fall back to individual logins.',
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
