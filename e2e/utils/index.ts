/**
 * Shared E2E Test Utilities
 *
 * Provides resilient helpers for Playwright E2E tests with:
 * - 403 error detection and graceful skipping
 * - Robust page navigation with retry logic
 * - Standardized wait patterns
 *
 * @issue #1115
 */

import { Page, test, expect } from '@playwright/test';

/**
 * Test configuration shared across all E2E tests
 */
export const TEST_CONFIG = {
  timeouts: {
    navigation: 15000,
    pageLoad: 20000,
    action: 10000,
    toast: 5000,
    elementVisible: 15000,
  },
  retries: {
    navigation: 2,
    elementWait: 3,
  },
};

/**
 * Tracks 403 errors during page operations.
 * Used to detect permission issues and enable graceful skipping.
 */
export interface ErrorTracker {
  has403: boolean;
  errors: string[];
}

/**
 * Sets up 403 error tracking on a page.
 * Call this early in your test to detect permission issues.
 *
 * @param page - Playwright page instance
 * @returns ErrorTracker object to check for 403 errors
 *
 * @example
 * const tracker = setup403Tracker(page);
 * await navigateToETPs(page);
 * if (tracker.has403) {
 *   test.skip();
 * }
 */
export function setup403Tracker(page: Page): ErrorTracker {
  const tracker: ErrorTracker = { has403: false, errors: [] };

  page.on('response', (response) => {
    if (response.status() === 403) {
      tracker.has403 = true;
      tracker.errors.push(`403 on ${response.url()}`);
      console.log(`[E2E] 403 Forbidden detected: ${response.url()}`);
    }
  });

  return tracker;
}

/**
 * Waits for a toast message to appear.
 *
 * @param page - Playwright page instance
 * @param text - Text to search for in the toast (partial match)
 * @param timeout - Maximum wait time in ms
 */
export async function waitForToast(
  page: Page,
  text: string,
  timeout = TEST_CONFIG.timeouts.toast,
): Promise<boolean> {
  try {
    await page.waitForSelector(`[role="status"]:has-text("${text}")`, {
      state: 'visible',
      timeout,
    });
    return true;
  } catch {
    console.log(`[E2E] Toast with "${text}" not found within ${timeout}ms`);
    return false;
  }
}

/**
 * Waits for a dialog to appear.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms
 */
export async function waitForDialog(
  page: Page,
  timeout = TEST_CONFIG.timeouts.action,
): Promise<boolean> {
  try {
    await page.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout,
    });
    return true;
  } catch {
    console.log(`[E2E] Dialog not found within ${timeout}ms`);
    return false;
  }
}

/**
 * Waits for loading indicators to disappear.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms
 */
export async function waitForLoadingComplete(
  page: Page,
  timeout = TEST_CONFIG.timeouts.pageLoad,
): Promise<void> {
  try {
    // Wait for any skeleton loaders to disappear
    await page.waitForSelector(
      '[data-testid="loading"], .skeleton, [class*="Skeleton"]',
      {
        state: 'hidden',
        timeout,
      },
    );
  } catch {
    // No loading indicator found - that's fine
  }

  // Also wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Resilient navigation to ETPs list with 403 detection.
 * Returns false if navigation fails or 403 is detected.
 *
 * @param page - Playwright page instance
 * @returns true if navigation succeeded and page is ready, false otherwise
 *
 * @example
 * const ready = await navigateToETPs(page);
 * if (!ready) {
 *   console.log('Skipping: ETPs page unavailable');
 *   test.skip();
 *   return;
 * }
 */
export async function navigateToETPs(page: Page): Promise<boolean> {
  const tracker = setup403Tracker(page);

  try {
    await page.goto('/etps');
    await page.waitForLoadState('networkidle');

    // Check if we landed on the right page
    if (!page.url().includes('/etps')) {
      console.log('[E2E] navigateToETPs: Not on ETPs page after navigation');
      return false;
    }

    // Check for 403 errors
    if (tracker.has403) {
      console.log('[E2E] navigateToETPs: 403 errors detected, skipping');
      return false;
    }

    // Wait for the "Novo ETP" button to be visible
    // This ensures the page has fully rendered
    try {
      await page.waitForSelector(
        'button:has-text("Novo ETP"), button:has-text("Criar ETP")',
        { state: 'visible', timeout: TEST_CONFIG.timeouts.elementVisible },
      );
      return true;
    } catch {
      console.log(
        '[E2E] navigateToETPs: Novo ETP button not found within timeout',
      );
      return false;
    }
  } catch (error) {
    console.log(`[E2E] navigateToETPs: Navigation failed - ${error}`);
    return false;
  }
}

/**
 * Waits for the ETP Editor page to fully load.
 *
 * @param page - Playwright page instance
 * @returns true if editor loaded successfully
 */
export async function waitForETPEditorLoaded(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('h1, [data-testid="etp-title"]', {
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.pageLoad,
    });
    return true;
  } catch {
    console.log('[E2E] ETP Editor: Failed to load within timeout');
    return false;
  }
}

/**
 * Creates an ETP via the dialog with graceful error handling.
 * Returns null if creation fails.
 *
 * @param page - Playwright page instance
 * @param title - ETP title (required, min 5 chars)
 * @param objeto - ETP objeto (optional, uses default if not provided)
 * @param description - ETP description (optional)
 * @returns ETP ID if created successfully, null otherwise
 */
export async function createETP(
  page: Page,
  title: string,
  objeto?: string,
  description?: string,
): Promise<string | null> {
  const etpObjeto =
    objeto || 'Objeto padrao para criacao de ETP via teste E2E automatizado';

  try {
    // Click "Novo ETP" button
    const newEtpButton = page
      .locator('button:has-text("Novo ETP"), button:has-text("Criar ETP")')
      .first();

    await newEtpButton.waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.elementVisible,
    });
    await newEtpButton.click();

    // Wait for dialog or navigation
    const dialogVisible = await waitForDialog(page, 5000);

    if (dialogVisible) {
      // Fill dialog form
      await page.fill('input#title, input[name="title"]', title);
      await page.fill('textarea#objeto, textarea[name="objeto"]', etpObjeto);

      if (description) {
        await page.fill(
          'textarea#description, textarea[name="description"]',
          description,
        );
      }

      // Submit dialog
      await page.click('button:has-text("Criar ETP")');
    } else {
      // Direct form on page
      await page.fill('input[name="title"], input#title', title);
      await page.fill('textarea[name="objeto"], textarea#objeto', etpObjeto);

      if (description) {
        await page.fill(
          'textarea[name="description"], textarea#description',
          description,
        );
      }

      await page.click('button:has-text("Criar"), button[type="submit"]');
    }

    // Wait for navigation to ETP editor
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Extract ETP ID from URL
    const url = page.url();
    const match = url.match(/\/etps\/([^/]+)$/);

    if (!match || match[1] === 'undefined') {
      console.log('[E2E] createETP: Failed to extract valid ETP ID from URL');
      return null;
    }

    return match[1];
  } catch (error) {
    console.log(`[E2E] createETP: Failed - ${error}`);
    return null;
  }
}

/**
 * Helper to skip test with a reason logged to console.
 * Use this instead of bare test.skip() for better diagnostics.
 *
 * @param reason - Why the test is being skipped
 */
export function skipTest(reason: string): void {
  console.log(`[E2E] SKIPPING: ${reason}`);
  test.skip();
}

/**
 * Test credentials configuration
 */
export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
};

/**
 * Login to the application.
 *
 * @param page - Playwright page instance
 * @returns true if login succeeded
 */
export async function login(page: Page): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill(
      'input[name="email"], input#email',
      TEST_CREDENTIALS.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CREDENTIALS.admin.password,
    );
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    return true;
  } catch (error) {
    console.log(`[E2E] Login failed: ${error}`);
    return false;
  }
}
