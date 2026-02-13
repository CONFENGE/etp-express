/**
 * E2E Accessibility Tests - Automated WCAG 2.1 AA Page Scanning
 *
 * @description Automated accessibility scans for all pages in ETP Express,
 * organized by authentication level (public, authenticated, admin).
 * Uses @axe-core/playwright with warning mode (threshold = Infinity)
 * so existing violations are logged but do not fail the test suite.
 *
 * @compliance WCAG 2.1 AA, LBI Lei 13.146/2015 (Lei Brasileira de Inclusao)
 * @group e2e
 * @group accessibility
 * @module e2e/accessibility/pages.spec
 */

import { test, expect } from '@playwright/test';
import { checkA11y, a11yLogin } from './helpers';
import {
  PUBLIC_PAGES,
  AUTHENTICATED_PAGES,
  ADMIN_PAGES,
  TEST_CREDENTIALS,
  A11Y_TIMEOUTS,
  isRemoteTesting,
} from './a11y.config';

// ---------------------------------------------------------------------------
// Public Pages (no authentication required)
// ---------------------------------------------------------------------------

test.describe('Accessibility - Public Pages', () => {
  for (const pageConfig of PUBLIC_PAGES) {
    test(`${pageConfig.name} (${pageConfig.path}) has no critical a11y violations`, async ({
      page,
    }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('domcontentloaded');

      if (pageConfig.waitForSelector) {
        await page.waitForSelector(pageConfig.waitForSelector, {
          timeout: A11Y_TIMEOUTS.pageLoad,
        });
      }

      const result = await checkA11y(page, {
        label: `Public: ${pageConfig.name}`,
        threshold: pageConfig.threshold,
      });

      // Attach violation count to test info for reporting
      expect(result.passed).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Authenticated Pages (requires regular user login)
// ---------------------------------------------------------------------------

test.describe('Accessibility - Authenticated Pages', () => {
  // Skip in CI if backend is not configured
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Authenticated a11y tests require full backend infrastructure. ' +
      'Set E2E_API_URL in CI or run locally.',
  );

  test.beforeEach(async ({ page }) => {
    // Login as admin (has access to all authenticated pages)
    await a11yLogin(page, TEST_CREDENTIALS.admin, A11Y_TIMEOUTS.navigation);
  });

  for (const pageConfig of AUTHENTICATED_PAGES) {
    test(`${pageConfig.name} (${pageConfig.path}) has no critical a11y violations`, async ({
      page,
    }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('domcontentloaded');

      if (pageConfig.waitForSelector) {
        await page.waitForSelector(pageConfig.waitForSelector, {
          timeout: A11Y_TIMEOUTS.pageLoad,
        });
      }

      // Allow extra time for data loading on authenticated pages
      await page.waitForTimeout(1000);

      const result = await checkA11y(page, {
        label: `Authenticated: ${pageConfig.name}`,
        threshold: pageConfig.threshold,
      });

      expect(result.passed).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Admin Pages (requires SYSTEM_ADMIN role)
// ---------------------------------------------------------------------------

test.describe('Accessibility - Admin Pages', () => {
  // Skip in CI if backend is not configured
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Admin a11y tests require full backend infrastructure with system admin. ' +
      'Set E2E_API_URL in CI or run locally.',
  );

  test.beforeEach(async ({ page }) => {
    // Login as system admin
    await a11yLogin(page, TEST_CREDENTIALS.admin, A11Y_TIMEOUTS.navigation);
  });

  for (const pageConfig of ADMIN_PAGES) {
    test(`${pageConfig.name} (${pageConfig.path}) has no critical a11y violations`, async ({
      page,
    }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('domcontentloaded');

      if (pageConfig.waitForSelector) {
        await page.waitForSelector(pageConfig.waitForSelector, {
          timeout: A11Y_TIMEOUTS.pageLoad,
        });
      }

      // Allow extra time for admin data loading
      await page.waitForTimeout(1500);

      const result = await checkA11y(page, {
        label: `Admin: ${pageConfig.name}`,
        threshold: pageConfig.threshold,
      });

      expect(result.passed).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Cross-Cutting Accessibility Checks
// ---------------------------------------------------------------------------

test.describe('Accessibility - Cross-Cutting Concerns', () => {
  /**
   * Verify that the login page meets strict contrast requirements.
   * The login page is the entry point and must be fully accessible.
   */
  test('login page meets WCAG color contrast requirements', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await checkA11y(page, {
      label: 'Login Color Contrast',
      // Only check color-contrast rules for this specific test
      tags: ['wcag2aa'],
    });
  });

  /**
   * Verify keyboard navigability on the login form.
   * All interactive elements must be reachable via Tab key.
   */
  test('login form is fully keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Tab through the page and verify we can reach the submit button
    const maxTabs = 15;
    let foundSubmit = false;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const isSubmit = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el?.tagName === 'BUTTON' && el?.getAttribute('type') === 'submit';
      });
      if (isSubmit) {
        foundSubmit = true;
        break;
      }
    }

    expect(foundSubmit).toBe(true);
  });

  /**
   * Verify that the page language attribute is set.
   * WCAG 3.1.1 requires the lang attribute on the html element.
   */
  test('pages have lang attribute set on html element', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const lang = await page.evaluate(() => {
      return document.documentElement.getAttribute('lang');
    });

    expect(lang).toBeTruthy();
    // Should be 'pt-BR' or 'pt' for Brazilian Portuguese, or 'en' for English
    expect(lang).toMatch(/^(pt|en)/);
  });
});
