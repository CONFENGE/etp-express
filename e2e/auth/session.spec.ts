/**
 * E2E Session Management Tests
 *
 * @description Tests session persistence, expiration, and recovery scenarios.
 *
 * @issue #932, #947
 * @group e2e
 * @group auth
 * @priority P1
 *
 * @acceptance-criteria (Issue #947)
 * - Sessão persiste: Dashboard -> ETPs -> Dashboard
 * - Sessão persiste: Múltiplas abas do browser compartilham sessão
 * - Sessão persiste: Page refresh em rota protegida
 * - Sessão persiste: Browser back/forward navigation
 * - Sessão limpa: Após logout explícito
 */

import { test, expect } from '@playwright/test';
import {
  delay,
  setupRateLimitMonitoring,
  rateLimitConfig,
} from '../utils/rate-limit-helper';

const TEST_CONFIG = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
  timeouts: {
    navigation: 15000, // Increased for Railway latency (~200-500ms additional)
    action: 5000, // Increased for Railway
  },
};

/**
 * Helper function for Railway-compatible login
 * Uses robust selectors with data-testid fallback
 * @issue #1172
 */
async function loginWithRobustSelectors(page: any, email: string, password: string) {
  await page.goto('/login');

  // Email input with fallback selectors
  const emailInput = page
    .locator('[data-testid="email-input"]')
    .or(page.locator('input[name="email"]'))
    .or(page.locator('input#email'));
  await emailInput.fill(email);

  // Password input with fallback selectors
  const passwordInput = page
    .locator('[data-testid="password-input"]')
    .or(page.locator('input[name="password"]'))
    .or(page.locator('input#password'));
  await passwordInput.fill(password);

  // Submit and wait for dashboard with Railway timeout
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, {
    timeout: TEST_CONFIG.timeouts.navigation,
  });
}

test.describe('Session Management', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Session tests require full backend infrastructure.',
  );

  /**
   * Setup before each test
   * Includes rate limit delay to prevent 429 errors in CI
   * @issue #1186
   */
  test.beforeEach(async ({ page }) => {
    // Add delay between tests to respect rate limits (5 req/min on /auth/login)
    await delay(rateLimitConfig.AUTH_TEST_DELAY);

    // Setup rate limit monitoring for debugging
    setupRateLimitMonitoring(page);
  });

  /**
   * Test: Session cookie is set after login
   */
  test('session cookie is set after login', async ({ page, context }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Verify JWT cookie is set
    const cookies = await context.cookies();
    const jwtCookie = cookies.find((c) => c.name === 'jwt');

    expect(jwtCookie).toBeDefined();
    expect(jwtCookie?.httpOnly).toBe(true);

    console.log('Session cookie verification: PASSED');
  });

  /**
   * Test: Session persists across page navigations
   */
  test('session persists across page navigations', async ({ page }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Navigate to ETPs with Railway timeout
    await page.goto('/etps');
    await page.waitForURL(/\/etps/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    // Navigate back to dashboard
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    console.log('Session navigation persistence: PASSED');
  });

  /**
   * Test: Session persists after multiple page refreshes
   */
  test('session persists after multiple refreshes', async ({ page }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Refresh multiple times - use waitForURL instead of networkidle
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForURL(/\/dashboard/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });
      await expect(page).not.toHaveURL(/\/login/);
    }

    console.log('Multiple refresh persistence: PASSED');
  });

  /**
   * Test: Session persists with browser back/forward navigation
   * @issue #947 - AC: Browser back/forward navigation
   */
  test('session persists with browser back/forward navigation', async ({
    page,
  }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Navigate to ETPs
    await page.goto('/etps');
    await page.waitForURL(/\/etps/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    // Go back to dashboard using browser back - use waitForURL instead of networkidle
    await page.goBack();
    await page.waitForURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    // Go forward to ETPs using browser forward
    await page.goForward();
    await page.waitForURL(/\/etps/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    // Multiple back/forward cycles
    await page.goBack();
    await page.waitForURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    await page.goForward();
    await page.waitForURL(/\/etps/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page).not.toHaveURL(/\/login/);

    console.log('Browser back/forward navigation persistence: PASSED');
  });

  /**
   * Test: Session is cleared after logout
   */
  test('session is cleared after logout', async ({ page, context }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Robust logout with data-testid and Railway-compatible waits
    // Step 1: Click user menu trigger
    const userMenuTrigger = page
      .locator('[data-testid="user-menu-trigger"]')
      .or(page.locator('button:has-text("Perfil")'))
      .or(page.locator('[aria-label*="menu"]'));

    await userMenuTrigger.first().waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });
    await userMenuTrigger.first().click();

    // Step 2: Wait for dropdown menu to be visible
    await page.waitForTimeout(300); // Small delay for animation

    // Step 3: Click logout button with data-testid
    const logoutButton = page
      .locator('[data-testid="logout-button"]')
      .or(page.locator('text=Sair'))
      .or(page.locator('text=Logout'));

    await logoutButton.first().waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });
    await logoutButton.first().click();

    // Verify redirect to login with Railway timeout
    await page.waitForURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify cookie is cleared
    const cookies = await context.cookies();
    const jwtCookie = cookies.find((c) => c.name === 'jwt');
    expect(jwtCookie).toBeUndefined();

    console.log('Session cleared after logout: PASSED');
  });

  /**
   * Test: Cannot access protected routes after logout
   */
  test('cannot access protected routes after logout', async ({ page }) => {
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Clear cookies to simulate logout
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should be redirected to login with Railway timeout
    await page.waitForURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Protected route after logout: PASSED');
  });
});

/**
 * Browser Tab/Window Tests
 */
test.describe('Multi-Tab Session', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Multi-tab tests require full backend infrastructure.',
  );

  /**
   * Setup before each test - rate limit awareness
   * @issue #1186
   */
  test.beforeEach(async ({ page }) => {
    await delay(rateLimitConfig.AUTH_TEST_DELAY);
    setupRateLimitMonitoring(page);
  });

  /**
   * Test: Session is shared across tabs
   */
  test('session is shared across browser tabs', async ({ page, context }) => {
    // Login in first tab
    await loginWithRobustSelectors(
      page,
      TEST_CONFIG.admin.email,
      TEST_CONFIG.admin.password,
    );

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/dashboard');

    // Should be authenticated in second tab with Railway timeout
    await page2.waitForURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page2).not.toHaveURL(/\/login/);

    await page2.close();

    console.log('Multi-tab session sharing: PASSED');
  });
});
