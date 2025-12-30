/**
 * E2E Wait Utilities
 *
 * Shared wait helpers for Playwright E2E tests.
 * Use these INSTEAD of page.waitForTimeout() which causes flaky tests.
 *
 * @example
 * import { waitForToast, waitForApiResponse } from '../utils/waits';
 *
 * // Instead of: await page.waitForTimeout(500);
 * await waitForToast(page, 'sucesso');
 */

import { Page, Response, expect } from '@playwright/test';

/**
 * Wait for a toast notification to appear
 *
 * @param page - Playwright page object
 * @param text - Optional text the toast should contain
 * @param options - Additional options
 * @returns Promise that resolves when toast is visible
 *
 * @example
 * await waitForToast(page, 'sucesso');
 * await waitForToast(page, 'ETP criado');
 * await waitForToast(page); // Any toast
 */
export async function waitForToast(
  page: Page,
  text?: string,
  options: { timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout || 5000;

  // Toast uses role="status" in shadcn/ui Sonner implementation
  const selector = text
    ? `[role="status"]:has-text("${text}")`
    : '[role="status"]';

  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for a toast to disappear
 *
 * @param page - Playwright page object
 * @param timeout - How long to wait (default 6000ms, slightly longer than toast duration)
 */
export async function waitForToastDismiss(
  page: Page,
  timeout: number = 6000,
): Promise<void> {
  await page
    .waitForSelector('[role="status"]', { state: 'hidden', timeout })
    .catch(() => {
      // Toast may have already dismissed, that's OK
    });
}

/**
 * Wait for an API response matching URL pattern
 *
 * @param page - Playwright page object
 * @param urlPattern - String or RegExp to match against URL
 * @param method - HTTP method to match (default: any)
 * @returns Promise<Response> - The matched response
 *
 * @example
 * const response = await waitForApiResponse(page, /\/api\/etps/, 'POST');
 * expect(response.status()).toBe(201);
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  method?: string,
): Promise<Response> {
  return page.waitForResponse((response) => {
    const urlMatches =
      typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url());

    const methodMatches =
      !method || response.request().method() === method.toUpperCase();

    return urlMatches && methodMatches;
  });
}

/**
 * Wait for loading state to complete (skeletons, spinners)
 *
 * @param page - Playwright page object
 * @param timeout - How long to wait (default 10000ms)
 */
export async function waitForLoadingComplete(
  page: Page,
  timeout: number = 10000,
): Promise<void> {
  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '[data-testid="loading-spinner"]',
    '[class*="Skeleton"]',
    '[class*="skeleton"]',
    '[role="progressbar"]',
  ];

  await Promise.all(
    loadingSelectors.map((selector) =>
      page.waitForSelector(selector, { state: 'hidden', timeout }).catch(() => {
        // Selector may not exist, that's OK
      }),
    ),
  );
}

/**
 * Wait for a dialog/modal to appear
 *
 * @param page - Playwright page object
 * @param options - Additional options
 */
export async function waitForDialog(
  page: Page,
  options: { title?: string; timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout || 5000;

  if (options.title) {
    await page.waitForSelector(`[role="dialog"]:has-text("${options.title}")`, {
      state: 'visible',
      timeout,
    });
  } else {
    await page.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout,
    });
  }
}

/**
 * Wait for dialog to close
 *
 * @param page - Playwright page object
 * @param timeout - How long to wait (default 5000ms)
 */
export async function waitForDialogClose(
  page: Page,
  timeout: number = 5000,
): Promise<void> {
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout });
}

/**
 * Wait for navigation to complete with network idle
 *
 * @param page - Playwright page object
 * @param urlPattern - Expected URL pattern
 * @param timeout - How long to wait (default 10000ms)
 */
export async function waitForNavigation(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000,
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
  await page.waitForLoadState('networkidle');
}

/**
 * Perform click and wait for API response in parallel
 * This is the recommended pattern to replace:
 *   await page.click(...);
 *   await page.waitForTimeout(500);
 *
 * @param page - Playwright page object
 * @param clickSelector - Selector to click
 * @param apiPattern - URL pattern for the expected API call
 * @param method - Expected HTTP method
 * @returns Promise<Response> - The API response
 *
 * @example
 * const response = await clickAndWaitForApi(
 *   page,
 *   'button:has-text("Criar ETP")',
 *   /\/api\/etps/,
 *   'POST'
 * );
 * expect(response.status()).toBe(201);
 */
export async function clickAndWaitForApi(
  page: Page,
  clickSelector: string,
  apiPattern: string | RegExp,
  method: string = 'GET',
): Promise<Response> {
  const [response] = await Promise.all([
    waitForApiResponse(page, apiPattern, method),
    page.click(clickSelector),
  ]);
  return response;
}
