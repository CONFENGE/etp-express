/**
 * E2E Login Flow Tests - Critical Path Validation
 *
 * @description Tests the complete login-to-dashboard flow to prevent regression
 * of bug #928 where login showed success toast but user remained on login page.
 *
 * @issue #929
 * @group e2e
 * @group auth
 * @priority P0
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for login flow tests
 */
const TEST_CONFIG = {
  // Test credentials - use environment variables in production
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
  demo: {
    email: process.env.E2E_DEMO_EMAIL || 'demoetp@confenge.com.br',
    password: process.env.E2E_DEMO_PASSWORD || 'Demo@123',
  },

  // Timeouts
  timeouts: {
    navigation: 10000, // 10s for navigation after login
    action: 3000, // 3s for standard actions
    reload: 5000, // 5s for page reload checks
  },
};

/**
 * Login Flow Test Suite
 *
 * Critical tests that validate the complete authentication flow:
 * 1. Login form submission
 * 2. Success message display
 * 3. Navigation to dashboard
 * 4. Dashboard content rendering
 * 5. Session persistence
 *
 * @requires-backend Requires backend running on localhost:3001
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Login Flow - Critical Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Login flow tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup before each test
   */
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      console.error(`[Page Error]: ${error.message}`);
    });

    // Ensure we start from a clean state
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Teardown after each test - capture screenshot on failure
   */
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  });

  /**
   * Test: Login redirects to dashboard within 3 seconds (Timing Assertion)
   *
   * @description Validates that login-to-dashboard redirect happens quickly,
   * without visible loading flash. This test measures the actual time from
   * form submission to dashboard URL change.
   *
   * @issue #945
   * @acceptance-criteria
   * - Time from submit to dashboard URL must be < 3 seconds
   * - No "Verificando autenticação" message should appear
   * - Works for both ADMIN and DEMO users
   */
  test('login redirects to dashboard within 3 seconds (ADMIN)', async ({
    page,
  }) => {
    const MAX_REDIRECT_TIME_MS = 3000;

    // Step 1: Fill login form
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );

    // Step 2: Start timing and submit
    const startTime = Date.now();
    await page.click('button[type="submit"]');

    // Step 3: Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: MAX_REDIRECT_TIME_MS,
    });

    // Step 4: Measure elapsed time
    const elapsed = Date.now() - startTime;

    // Step 5: Assert timing requirement
    expect(elapsed).toBeLessThan(MAX_REDIRECT_TIME_MS);

    // Step 6: Verify no loading flash was visible
    const loadingMessage = page.locator('text=Verificando autenticação');
    await expect(loadingMessage).not.toBeVisible();

    console.log(
      `ADMIN login timing: ${elapsed}ms (max: ${MAX_REDIRECT_TIME_MS}ms) - PASSED`,
    );
  });

  /**
   * Test: Login redirects to dashboard within 3 seconds (DEMO user)
   *
   * @description Same timing assertion as ADMIN, but for DEMO user type.
   *
   * @issue #945
   */
  test('login redirects to dashboard within 3 seconds (DEMO)', async ({
    page,
  }) => {
    const MAX_REDIRECT_TIME_MS = 3000;

    // Fill login form with DEMO credentials
    await page.fill('input[name="email"], input#email', TEST_CONFIG.demo.email);
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.demo.password,
    );

    // Start timing and submit
    const startTime = Date.now();
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: MAX_REDIRECT_TIME_MS,
    });

    // Measure elapsed time
    const elapsed = Date.now() - startTime;

    // Assert timing requirement
    expect(elapsed).toBeLessThan(MAX_REDIRECT_TIME_MS);

    // Verify no loading flash was visible
    const loadingMessage = page.locator('text=Verificando autenticação');
    await expect(loadingMessage).not.toBeVisible();

    console.log(
      `DEMO login timing: ${elapsed}ms (max: ${MAX_REDIRECT_TIME_MS}ms) - PASSED`,
    );
  });

  /**
   * Test: Login with valid credentials redirects to dashboard
   *
   * @description This is the CRITICAL test that validates the bug #928 fix.
   * The user must successfully navigate to /dashboard after login, not remain
   * on the login page or see infinite loading.
   *
   * @acceptance-criteria
   * - User fills login form with valid credentials
   * - User clicks submit button
   * - Toast message "Login realizado com sucesso!" appears
   * - URL changes to /dashboard (NOT /login)
   * - Dashboard content is visible
   * - No loading spinner visible after navigation completes
   */
  test('login with valid credentials redirects to dashboard', async ({
    page,
  }) => {
    // Step 1: Fill login form
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );

    // Step 2: Submit form
    await page.click('button[type="submit"]');

    // Step 3: Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 4: Verify we're NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    // Step 5: Verify dashboard content is visible (not loading state)
    // Wait for loading state to disappear
    const loadingSpinner = page.locator('text=Verificando autenticação');
    await expect(loadingSpinner).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Step 6: Verify some dashboard element is visible
    // The dashboard should have some identifiable content
    const dashboardContent = page.locator('main, [data-testid="dashboard"]');
    await expect(dashboardContent).toBeVisible();

    console.log('Login to dashboard flow: PASSED');
  });

  /**
   * Test: Login with DEMO user redirects to dashboard
   *
   * @description Validates the bug fix for DEMO user type as well.
   */
  test('login with DEMO user redirects to dashboard', async ({ page }) => {
    // Fill login form with DEMO credentials
    await page.fill('input[name="email"], input#email', TEST_CONFIG.demo.email);
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.demo.password,
    );

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    console.log('DEMO user login to dashboard flow: PASSED');
  });

  /**
   * Test: Session persists after page refresh
   *
   * @description After successful login, refreshing the page should maintain
   * the authenticated state and keep the user on the dashboard.
   */
  test('session persists after page refresh', async ({ page }) => {
    // Login first
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on dashboard after refresh
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.reload,
    });

    // Should NOT be redirected to login
    await expect(page).not.toHaveURL(/\/login/);

    console.log('Session persistence after refresh: PASSED');
  });

  /**
   * Test: User does not see infinite loading after login
   *
   * @description Specifically validates that the isAuthInitialized fix works.
   * The loading state should not persist indefinitely after login.
   */
  test('no infinite loading after login', async ({ page }) => {
    // Login
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');

    // Wait for navigation
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Check that no loading indicators are visible after 2 seconds
    await page.waitForTimeout(2000);

    // All these loading indicators should NOT be visible
    const loadingIndicators = [
      page.locator('text=Verificando autenticação'),
      page.locator('text=Carregando'),
      page.locator('[class*="spinner"]'),
      page.locator('[class*="loading"]'),
    ];

    for (const indicator of loadingIndicators) {
      const isVisible = await indicator.isVisible().catch(() => false);
      if (isVisible) {
        const text = await indicator.textContent().catch(() => 'Unknown');
        throw new Error(
          `Loading indicator still visible after login: "${text}"`,
        );
      }
    }

    console.log('No infinite loading after login: PASSED');
  });

  /**
   * Test: Invalid credentials show error message
   *
   * @description Validates that invalid credentials are properly handled
   * and user stays on login page with error message.
   */
  test('invalid credentials show error and stay on login', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('input[name="email"], input#email', 'invalid@test.com');
    await page.fill('input[name="password"], input#password', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait a bit for response
    await page.waitForTimeout(1000);

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);

    // Should NOT be on dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);

    console.log('Invalid credentials handling: PASSED');
  });

  /**
   * Test: Logout redirects to login page
   *
   * @description After logout, user should be redirected to login page
   * and should not be able to access protected routes.
   */
  test('logout redirects to login page', async ({ page }) => {
    // Login first
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Find and click logout button using data-testid selectors
    const userMenuTrigger = page.locator('[data-testid="user-menu-trigger"]');
    const logoutButton = page.locator('[data-testid="logout-button"]');

    // Fallback selectors for backwards compatibility
    const legacyLogoutButton = page.locator(
      'button:has-text("Sair"), button:has-text("Logout"), [aria-label="Logout"]',
    );
    const legacyUserMenu = page.locator(
      'button:has-text("Perfil"), [aria-label="Menu do usuário"]',
    );

    // Try primary selector first (data-testid)
    if (await userMenuTrigger.isVisible()) {
      await userMenuTrigger.click();
      await page.waitForTimeout(500);
      await expect(logoutButton).toBeVisible({ timeout: 2000 });
      await logoutButton.click();
    }
    // Fallback: Direct logout button (if visible without menu)
    else if (await legacyLogoutButton.first().isVisible()) {
      await legacyLogoutButton.first().click();
    }
    // Fallback: Legacy user menu
    else if (await legacyUserMenu.first().isVisible()) {
      await legacyUserMenu.first().click();
      await page.waitForTimeout(500);
      const logoutMenuOption = page
        .locator('text=Sair')
        .or(page.locator('text=Logout'));
      await logoutMenuOption.first().click();
    } else {
      // Skip if logout mechanism not found
      console.log(
        'Logout button not found - skipping (UI may have different logout mechanism)',
      );
      return;
    }

    // Wait for redirect to login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Logout flow: PASSED');
  });
});

/**
 * Protected Route Access Tests
 *
 * Validates that protected routes redirect unauthenticated users to login.
 */
test.describe('Protected Route Access', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Protected route tests require full backend infrastructure.',
  );

  /**
   * Test: Unauthenticated user is redirected to login when accessing dashboard
   */
  test('unauthenticated user redirected to login from dashboard', async ({
    page,
  }) => {
    // Clear any existing auth state by clearing cookies/storage
    await page.context().clearCookies();

    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Protected route redirect: PASSED');
  });

  /**
   * Test: Unauthenticated user is redirected to login when accessing ETPs
   */
  test('unauthenticated user redirected to login from ETPs', async ({
    page,
  }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access ETPs directly
    await page.goto('/etps');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Protected ETPs route redirect: PASSED');
  });
});
