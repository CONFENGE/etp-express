/**
 * Visual Regression Tests - Critical Pages
 *
 * @description Tests visual consistency of critical pages using Playwright screenshots.
 * These tests compare current page renders against baseline snapshots to detect
 * unintended visual changes.
 *
 * @issue #809
 * @group visual
 * @priority P3
 *
 * Run locally:
 *   npx playwright test --project=visual
 *
 * Update baselines:
 *   npx playwright test --project=visual --update-snapshots
 */

import { test, expect } from '@playwright/test';

/**
 * Visual test configuration
 */
const VISUAL_CONFIG = {
  // Visual comparison threshold (0-1, where 0 is exact match)
  // 1% tolerance to account for minor anti-aliasing differences
  threshold: 0.01,

  // Test credentials (use env vars in CI)
  testUser: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Wait for animations/transitions to complete
  animationWaitMs: 500,
};

/**
 * Helper to wait for page to be visually stable
 */
async function waitForVisualStability(page: import('@playwright/test').Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for any CSS transitions/animations
  await page.waitForTimeout(VISUAL_CONFIG.animationWaitMs);

  // Hide any dynamic content that might cause flakiness
  await page.addStyleTag({
    content: `
      /* Hide dynamic elements for visual testing */
      [data-testid="current-time"],
      [data-testid="timestamp"],
      .animate-pulse,
      .animate-spin {
        visibility: hidden !important;
      }
    `,
  });
}

test.describe('Visual Regression - Public Pages', () => {
  /**
   * Login Page - Initial State
   *
   * Validates visual consistency of the login page including:
   * - Form layout and styling
   * - Logo and branding
   * - Input fields and buttons
   * - Footer links
   */
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });

  /**
   * Login Page - Error State
   *
   * Validates visual consistency of login form with validation errors
   */
  test('login page shows validation errors correctly', async ({ page }) => {
    await page.goto('/login');

    // Trigger validation by submitting empty form
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('login-page-errors.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Authenticated Pages', () => {
  // Skip in CI - these tests require a running backend for authentication
  // Use full E2E tests for authenticated page testing
  test.skip(
    !!process.env.CI,
    'Authenticated visual tests require backend - run locally',
  );

  // Login before each test in this suite
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill credentials
    await page.getByLabel(/email/i).fill(VISUAL_CONFIG.testUser.email);
    // Use specific input selector to avoid matching "Mostrar senha" button
    await page
      .locator('input[type="password"]')
      .fill(VISUAL_CONFIG.testUser.password);

    // Submit and wait for navigation
    await page.getByRole('button', { name: /entrar|login/i }).click();

    // Wait for successful login (redirect to dashboard or ETPs)
    await page.waitForURL(/\/(dashboard|etps|home)/i, { timeout: 10000 });
  });

  /**
   * Dashboard - Main View
   *
   * Validates visual consistency of the dashboard including:
   * - Navigation sidebar
   * - Main content area
   * - Stats/metrics cards
   * - Quick actions
   */
  test('dashboard renders correctly', async ({ page }) => {
    // Navigate to dashboard explicitly
    await page.goto('/dashboard');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });

  /**
   * ETPs List - Empty or With Data
   *
   * Validates visual consistency of the ETPs listing page
   */
  test('etps list page renders correctly', async ({ page }) => {
    await page.goto('/etps');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('etps-list.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });

  /**
   * ETP Editor - Empty Form
   *
   * Validates visual consistency of the ETP editor in its initial state
   */
  test('etp editor renders correctly', async ({ page }) => {
    // First, create or navigate to an existing ETP
    await page.goto('/etps');
    await waitForVisualStability(page);

    // Try to find and click "New ETP" button
    const newEtpButton = page.getByRole('button', { name: /novo|new|criar/i });
    if (await newEtpButton.isVisible()) {
      await newEtpButton.click();
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('etp-editor-new.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.threshold,
        fullPage: true,
      });
    } else {
      // If there are existing ETPs, click on the first one
      const firstEtp = page.locator('[data-testid="etp-card"]').first();
      if (await firstEtp.isVisible()) {
        await firstEtp.click();
        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot('etp-editor-existing.png', {
          maxDiffPixelRatio: VISUAL_CONFIG.threshold,
          fullPage: true,
        });
      }
    }
  });
});

test.describe('Visual Regression - Responsive Layouts', () => {
  /**
   * Mobile Login Page (Public - runs in CI)
   *
   * Validates responsive layout on mobile viewport
   */
  test('login page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });

  /**
   * Tablet Dashboard (Requires Auth - skipped in CI)
   *
   * Validates responsive layout on tablet viewport
   */
  test('dashboard is responsive on tablet', async ({ page }) => {
    // Skip in CI - requires backend for authentication
    test.skip(!!process.env.CI, 'Requires backend for authentication');

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(VISUAL_CONFIG.testUser.email);
    // Use specific input selector to avoid matching "Mostrar senha" button
    await page
      .locator('input[type="password"]')
      .fill(VISUAL_CONFIG.testUser.password);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await page.waitForURL(/\/(dashboard|etps|home)/i, { timeout: 10000 });

    await page.goto('/dashboard');
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      fullPage: true,
    });
  });
});
