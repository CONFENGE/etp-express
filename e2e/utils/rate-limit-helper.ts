/**
 * Rate Limit Helper for E2E Tests
 *
 * Provides utilities to handle API rate limiting during E2E test execution.
 * Implements exponential backoff, smart delays, and retry logic to prevent
 * 429 Too Many Requests errors in CI environments.
 *
 * @module e2e/utils/rate-limit-helper
 * @issue #1186
 */

import { Page, Response } from '@playwright/test';

/**
 * Default configuration for rate limit handling
 * Optimized for Railway production rate limits while minimizing CI time
 * @issue #1186
 */
export const RATE_LIMIT_CONFIG = {
  /** Maximum number of retries on 429 errors */
  maxRetries: 3,
  /** Base delay in ms before first retry (doubles with each retry) */
  baseDelayMs: 5000,
  /** Maximum delay between retries */
  maxDelayMs: 30000,
  /** Delay between tests that make auth API calls (reduced from 2000ms) */
  interTestDelayMs: 1000,
  /** Delay after login attempt to respect rate limits (reduced from 1500ms) */
  postLoginDelayMs: 500,
};

/**
 * Delays execution by specified milliseconds
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay
 *
 * @param attempt - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = RATE_LIMIT_CONFIG.baseDelayMs,
  maxDelay: number = RATE_LIMIT_CONFIG.maxDelayMs,
): number {
  // Exponential backoff: base * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (0-20% of delay) to prevent thundering herd
  const jitter = exponentialDelay * Math.random() * 0.2;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Checks if a response is a rate limit error
 *
 * @param response - Playwright Response object
 * @returns True if response status is 429
 */
export function isRateLimitError(response: Response | null): boolean {
  return response?.status() === 429;
}

/**
 * Extracts Retry-After header value if present
 *
 * @param response - Playwright Response object
 * @returns Retry-After value in seconds, or null if not present
 */
export function getRetryAfter(response: Response | null): number | null {
  if (!response) return null;

  const retryAfter = response.headers()['retry-after'];
  if (!retryAfter) return null;

  const seconds = parseInt(retryAfter, 10);
  return isNaN(seconds) ? null : seconds;
}

/**
 * Waits for rate limit to reset based on response headers
 *
 * @param response - Playwright Response that returned 429
 * @param fallbackDelay - Fallback delay if Retry-After header is not present
 */
export async function waitForRateLimitReset(
  response: Response | null,
  fallbackDelay: number = RATE_LIMIT_CONFIG.baseDelayMs,
): Promise<void> {
  const retryAfter = getRetryAfter(response);

  if (retryAfter !== null) {
    console.log(`Rate limited. Retry-After header: ${retryAfter}s. Waiting...`);
    await delay(retryAfter * 1000 + 500); // Add 500ms buffer
  } else {
    console.log(
      `Rate limited. No Retry-After header. Waiting ${fallbackDelay}ms...`,
    );
    await delay(fallbackDelay);
  }
}

/**
 * Retries an async operation with exponential backoff on rate limit errors
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay for exponential backoff
 * @returns Result of the function or throws after max retries
 *
 * @example
 * ```ts
 * await retryOnRateLimit(async () => {
 *   await page.click('button[type="submit"]');
 *   await expect(page).toHaveURL(/\/dashboard/);
 * });
 * ```
 */
export async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT_CONFIG.maxRetries,
  baseDelay: number = RATE_LIMIT_CONFIG.baseDelayMs,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message?.toLowerCase() || '';

      // Check if error is related to rate limiting
      const isRateLimitRelated =
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('limite de gerações excedido');

      if (isRateLimitRelated && attempt < maxRetries) {
        const backoffDelay = calculateBackoffDelay(attempt, baseDelay);
        console.log(
          `Rate limit detected (attempt ${attempt + 1}/${maxRetries + 1}). ` +
            `Waiting ${Math.round(backoffDelay / 1000)}s before retry...`,
        );
        await delay(backoffDelay);
      } else if (!isRateLimitRelated) {
        // Not a rate limit error, don't retry
        throw error;
      }
    }
  }

  throw new Error(
    `Max retries (${maxRetries}) exceeded. Last error: ${lastError?.message}`,
  );
}

/**
 * Creates a rate-limit aware login helper
 *
 * Wraps login logic with automatic retry and proper delays to avoid
 * triggering rate limits on the /auth/login endpoint.
 *
 * @param page - Playwright Page object
 * @param credentials - Login credentials
 * @param options - Optional configuration
 * @returns Promise that resolves when login is successful
 *
 * @example
 * ```ts
 * await rateLimitAwareLogin(page, {
 *   email: 'admin@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export async function rateLimitAwareLogin(
  page: Page,
  credentials: { email: string; password: string },
  options: {
    navigationTimeout?: number;
    retries?: number;
    preLoginDelay?: number;
  } = {},
): Promise<void> {
  const {
    navigationTimeout = 10000,
    retries = RATE_LIMIT_CONFIG.maxRetries,
    preLoginDelay = RATE_LIMIT_CONFIG.postLoginDelayMs,
  } = options;

  // Add delay before login to respect rate limits between tests
  if (preLoginDelay > 0) {
    await delay(preLoginDelay);
  }

  await retryOnRateLimit(async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.fill('input[name="email"], input#email', credentials.email);
    await page.fill(
      'input[name="password"], input#password',
      credentials.password,
    );

    // Submit and wait for navigation
    await page.click('button[type="submit"]');

    // Wait for successful navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: navigationTimeout });
  }, retries);

  // Post-login delay to allow rate limit window to progress
  await delay(RATE_LIMIT_CONFIG.postLoginDelayMs);
}

/**
 * Sets up rate limit monitoring on a page
 *
 * Listens for 429 responses and logs them for debugging.
 * Also captures rate limit headers for analysis.
 *
 * @param page - Playwright Page object
 * @returns Cleanup function to remove listeners
 *
 * @example
 * ```ts
 * test.beforeEach(async ({ page }) => {
 *   setupRateLimitMonitoring(page);
 * });
 * ```
 */
export function setupRateLimitMonitoring(page: Page): () => void {
  const handler = (response: Response) => {
    if (response.status() === 429) {
      const url = response.url();
      const retryAfter = response.headers()['retry-after'] || 'not set';
      console.warn(
        `[Rate Limit Warning] 429 response from ${url}. Retry-After: ${retryAfter}`,
      );
    }
  };

  page.on('response', handler);

  return () => {
    page.off('response', handler);
  };
}

/**
 * Wraps a test describe block to add inter-test delays
 *
 * Use this for test suites that make many API calls to avoid
 * hitting rate limits between tests.
 *
 * @param delayMs - Delay in milliseconds between tests
 * @returns Object with beforeEach hook configuration
 *
 * @example
 * ```ts
 * test.describe('Auth Tests', () => {
 *   const { beforeEach } = withRateLimitDelay(2000);
 *   test.beforeEach(beforeEach);
 *
 *   test('login test', async ({ page }) => { ... });
 * });
 * ```
 */
export function withRateLimitDelay(
  delayMs: number = RATE_LIMIT_CONFIG.interTestDelayMs,
) {
  return {
    beforeEach: async () => {
      await delay(delayMs);
    },
  };
}

/**
 * Configuration object for rate-limit aware test setup
 *
 * Provides consistent delays and retry logic across test suites.
 * Optimized for Railway production rate limits (5 req/min on /auth/login)
 * while minimizing CI execution time.
 *
 * @issue #1186
 */
export const rateLimitConfig = {
  /**
   * Standard delay between auth tests (in ms)
   * Prevents exceeding 5 req/min limit on /auth/login
   * Reduced from 2000ms to 1000ms to balance rate limit protection with CI speed
   */
  AUTH_TEST_DELAY: 1000,

  /**
   * Delay after each login attempt (in ms)
   * Allows rate limit window to progress
   * Reduced from 1500ms to 500ms for faster execution
   */
  POST_LOGIN_DELAY: 500,

  /**
   * Maximum retries for rate-limited operations
   */
  MAX_RETRIES: 3,

  /**
   * Base backoff delay (doubles with each retry)
   */
  BASE_BACKOFF_MS: 5000,
};
