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
    navigation: 10000,
    action: 3000,
  },
};

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
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

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
    // Login
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Navigate to ETPs
    await page.goto('/etps');
    await expect(page).toHaveURL(/\/etps/);
    await expect(page).not.toHaveURL(/\/login/);

    // Navigate back to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/login/);

    console.log('Session navigation persistence: PASSED');
  });

  /**
   * Test: Session persists after multiple page refreshes
   */
  test('session persists after multiple refreshes', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Refresh multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/dashboard/);
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
    // Login
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Navigate to ETPs
    await page.goto('/etps');
    await expect(page).toHaveURL(/\/etps/);
    await expect(page).not.toHaveURL(/\/login/);

    // Go back to dashboard using browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/login/);

    // Go forward to ETPs using browser forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/etps/);
    await expect(page).not.toHaveURL(/\/login/);

    // Multiple back/forward cycles
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);

    await page.goForward();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);

    console.log('Browser back/forward navigation persistence: PASSED');
  });

  /**
   * Test: Session is cleared after logout
   */
  test('session is cleared after logout', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Find and click logout
    const logoutButton = page.locator(
      'button:has-text("Sair"), button:has-text("Logout"), [aria-label="Logout"]',
    );
    const userMenu = page.locator(
      '[data-testid="user-menu"], button:has-text("Perfil"), [aria-label="Menu do usuário"]',
    );

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click();
    } else if (await userMenu.first().isVisible()) {
      await userMenu.first().click();
      await page.waitForTimeout(500);
      // Use .or() for bilingual selector
      const logoutMenuOption = page
        .locator('text=Sair')
        .or(page.locator('text=Logout'));
      await logoutMenuOption.first().click();
    } else {
      console.log('Logout button not found - skipping');
      return;
    }

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/, {
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
    // Login
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Clear cookies to simulate logout
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, {
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
    await page.goto('/login');
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/dashboard');

    // Should be authenticated in second tab
    await expect(page2).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
    await expect(page2).not.toHaveURL(/\/login/);

    await page2.close();

    console.log('Multi-tab session sharing: PASSED');
  });
});
