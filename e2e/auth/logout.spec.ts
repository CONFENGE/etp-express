/**
 * E2E Logout Flow Tests - Complete Validation
 *
 * @description Tests the complete logout flow including cookie clearing,
 * localStorage cleanup, and protected route access denial.
 *
 * @issue #950
 * @group e2e
 * @group auth
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for logout flow tests
 */
const TEST_CONFIG = {
  // Test credentials - use environment variables in production
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Timeouts
  timeouts: {
    navigation: 10000, // 10s for navigation
    action: 3000, // 3s for standard actions
  },
};

/**
 * Helper to perform login before logout tests
 *
 * Also disables the onboarding tour to prevent it from blocking UI interactions.
 * The tour overlay has high z-index and blocks clicks when active.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1148
 */
async function loginUser(
  page: import('@playwright/test').Page,
  credentials: { email: string; password: string },
) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Mark tour as completed before login to prevent tour overlay from blocking UI
  // The tour uses localStorage with key 'etp-express-tour'
  await page.evaluate(() => {
    localStorage.setItem(
      'etp-express-tour',
      JSON.stringify({ state: { hasCompletedTour: true }, version: 0 }),
    );
  });

  await page.fill('input[name="email"], input#email', credentials.email);
  await page.fill(
    'input[name="password"], input#password',
    credentials.password,
  );
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/, {
    timeout: TEST_CONFIG.timeouts.navigation,
  });

  // Wait for the page to fully render after login
  await page.waitForLoadState('networkidle');
}

/**
 * Helper to find and click logout button
 *
 * Uses stable data-testid selectors for reliability across environments.
 * The function waits for elements to be ready and uses force click when
 * necessary to handle Radix UI portal/focus management quirks.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1130
 * @see https://github.com/CONFENGE/etp-express/issues/1148
 */
async function performLogout(page: import('@playwright/test').Page) {
  // Primary selector: Use stable data-testid attributes
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
  // Use waitFor to ensure element is attached and stable
  try {
    await userMenuTrigger.waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Scroll into view and wait for any animations to settle
    await userMenuTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    // Click to open the dropdown menu
    // Note: Radix UI may set aria-hidden on closed menu triggers, but they remain clickable
    await userMenuTrigger.click({ timeout: TEST_CONFIG.timeouts.action });

    // Wait for dropdown content to appear
    await logoutButton.waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });
    await page.waitForTimeout(100);

    // Click logout button
    await logoutButton.click({ timeout: TEST_CONFIG.timeouts.action });
    return;
  } catch {
    // Primary selector failed, try fallbacks
    console.log('·Primary logout selectors not available, trying fallbacks...');
  }

  // Fallback: Direct logout button (if visible without menu)
  try {
    await legacyLogoutButton.waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });
    await legacyLogoutButton.click({ timeout: TEST_CONFIG.timeouts.action });
    return;
  } catch {
    // Continue to next fallback
  }

  // Fallback: Legacy user menu
  try {
    await legacyUserMenu.waitFor({
      state: 'visible',
      timeout: TEST_CONFIG.timeouts.action,
    });
    await legacyUserMenu.click({ timeout: TEST_CONFIG.timeouts.action });
    await page.waitForTimeout(300);
    await page.click('text=Sair', { timeout: TEST_CONFIG.timeouts.action });
    return;
  } catch {
    // All fallbacks failed
  }

  throw new Error(
    'Logout button not found. Ensure data-testid="user-menu-trigger" and data-testid="logout-button" are present.',
  );
}

/**
 * Logout Flow Test Suite
 *
 * @requires-backend Requires backend running on localhost:3001
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Logout Flow - Complete Validation', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Logout flow tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Capture errors for debugging
   */
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`[Page Error]: ${error.message}`);
    });
  });

  /**
   * Capture screenshot on test failure
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
   * Test: Logout button redirects to /login
   *
   * @description Validates that clicking the logout button redirects
   * the user to the login page.
   *
   * @acceptance-criteria
   * - User is logged in and on dashboard
   * - User clicks logout button
   * - User is redirected to /login page
   */
  test('logout button redirects to /login', async ({ page }) => {
    // Step 1: Login first
    await loginUser(page, TEST_CONFIG.admin);

    // Step 2: Perform logout
    await performLogout(page);

    // Step 3: Verify redirect to /login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 4: Verify NOT on dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);

    console.log('Logout redirect to /login: PASSED');
  });

  /**
   * Test: JWT cookie is cleared after logout
   *
   * @description Validates that the httpOnly JWT cookie is removed
   * after logout, preventing session hijacking.
   *
   * @acceptance-criteria
   * - User is logged in (JWT cookie exists)
   * - User clicks logout
   * - JWT cookie is removed/cleared
   */
  test('JWT cookie is cleared after logout', async ({ page, context }) => {
    // Step 1: Login first
    await loginUser(page, TEST_CONFIG.admin);

    // Step 2: Verify JWT cookie exists before logout
    const cookiesBefore = await context.cookies();
    const jwtCookieBefore = cookiesBefore.find(
      (c) => c.name === 'jwt' || c.name === 'accessToken' || c.name === 'token',
    );

    // Note: JWT cookie might be httpOnly and not accessible via JS
    // We verify by checking if authentication still works
    console.log(
      `Cookies before logout: ${cookiesBefore.map((c) => c.name).join(', ')}`,
    );

    // Step 3: Perform logout
    await performLogout(page);

    // Step 4: Wait for logout to complete
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 5: Verify JWT cookie is cleared
    const cookiesAfter = await context.cookies();
    const jwtCookieAfter = cookiesAfter.find(
      (c) => c.name === 'jwt' || c.name === 'accessToken' || c.name === 'token',
    );

    console.log(
      `Cookies after logout: ${cookiesAfter.map((c) => c.name).join(', ')}`,
    );

    // JWT cookie should either be removed or have empty/expired value
    if (jwtCookieAfter) {
      expect(
        jwtCookieAfter.value === '' ||
          jwtCookieAfter.expires < Date.now() / 1000,
      ).toBe(true);
    }

    console.log('JWT cookie cleared after logout: PASSED');
  });

  /**
   * Test: Accessing /dashboard after logout redirects to /login
   *
   * @description After logout, any attempt to access protected routes
   * should redirect the user back to the login page.
   *
   * @acceptance-criteria
   * - User logs out successfully
   * - User tries to navigate to /dashboard directly
   * - User is redirected to /login
   */
  test('accessing /dashboard after logout redirects to /login', async ({
    page,
  }) => {
    // Step 1: Login first
    await loginUser(page, TEST_CONFIG.admin);

    // Step 2: Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Step 3: Perform logout
    await performLogout(page);

    // Step 4: Wait for redirect to login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 5: Try to access /dashboard directly
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Step 6: Verify redirect back to /login
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 7: Verify NOT on dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);

    console.log('Protected route access denied after logout: PASSED');
  });

  /**
   * Test: localStorage auth-storage is cleared after logout
   *
   * @description Validates that the Zustand persisted auth state
   * in localStorage is properly cleared after logout.
   *
   * @acceptance-criteria
   * - User is logged in (auth-storage exists in localStorage)
   * - User clicks logout
   * - auth-storage in localStorage is cleared or shows unauthenticated state
   */
  test('localStorage auth-storage is cleared after logout', async ({
    page,
  }) => {
    // Step 1: Login first
    await loginUser(page, TEST_CONFIG.admin);

    // Step 2: Verify auth-storage exists and has authenticated state before logout
    const authStorageBefore = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });

    console.log(`auth-storage before logout: ${authStorageBefore}`);

    if (authStorageBefore) {
      const parsed = JSON.parse(authStorageBefore);
      expect(parsed.state?.isAuthenticated).toBe(true);
      expect(parsed.state?.user).toBeTruthy();
    }

    // Step 3: Perform logout
    await performLogout(page);

    // Step 4: Wait for logout to complete
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 5: Verify auth-storage is cleared or shows unauthenticated state
    const authStorageAfter = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });

    console.log(`auth-storage after logout: ${authStorageAfter}`);

    if (authStorageAfter) {
      const parsed = JSON.parse(authStorageAfter);
      // isAuthenticated should be false after logout
      expect(parsed.state?.isAuthenticated).toBe(false);
      // user should be null after logout
      expect(parsed.state?.user).toBeNull();
    }

    console.log('localStorage auth-storage cleared after logout: PASSED');
  });

  /**
   * Test: Logout clears session even with network error
   *
   * @description If the backend logout call fails, the frontend should
   * still clear local state to prevent stale sessions.
   *
   * @acceptance-criteria
   * - User is logged in
   * - Backend logout endpoint returns error (simulated)
   * - Frontend still clears auth state
   * - User is redirected to /login
   */
  test('logout clears session even with network error', async ({ page }) => {
    // Step 1: Login first
    await loginUser(page, TEST_CONFIG.admin);

    // Step 2: Intercept logout API call to simulate failure
    await page.route('**/auth/logout', (route) => {
      route.abort('failed');
    });

    // Step 3: Perform logout (will fail network call)
    await performLogout(page);

    // Step 4: Should still redirect to login despite API failure
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 5: Verify localStorage is cleared
    const authStorageAfter = await page.evaluate(() => {
      return localStorage.getItem('auth-storage');
    });

    if (authStorageAfter) {
      const parsed = JSON.parse(authStorageAfter);
      expect(parsed.state?.isAuthenticated).toBe(false);
    }

    console.log('Logout with network error: PASSED');
  });
});

/**
 * Logout Edge Cases
 */
test.describe('Logout Edge Cases', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Edge case tests require full backend infrastructure.',
  );

  /**
   * Test: Multiple logout clicks are handled gracefully
   */
  test('multiple logout clicks are handled gracefully', async ({ page }) => {
    await loginUser(page, TEST_CONFIG.admin);

    // Primary selector: Use stable data-testid attributes
    const userMenuTrigger = page.locator('[data-testid="user-menu-trigger"]');
    const logoutButton = page.locator('[data-testid="logout-button"]');

    // Fallback selectors for backwards compatibility
    const legacyLogoutButton = page.locator(
      'button:has-text("Sair"), button:has-text("Logout"), [aria-label="Logout"]',
    );
    const legacyUserMenu = page.locator(
      'button:has-text("Perfil"), [aria-label="Menu do usuário"]',
    );

    // Click logout multiple times rapidly
    // Use try/catch with waitFor for more reliable element detection
    try {
      await userMenuTrigger.waitFor({
        state: 'visible',
        timeout: TEST_CONFIG.timeouts.action,
      });
      await userMenuTrigger.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      await userMenuTrigger.click({ timeout: TEST_CONFIG.timeouts.action });
      await logoutButton.waitFor({
        state: 'visible',
        timeout: TEST_CONFIG.timeouts.action,
      });
      await page.waitForTimeout(100);
      await logoutButton.click({ timeout: TEST_CONFIG.timeouts.action });
      // Try clicking again while redirecting
      await logoutButton.click({ timeout: 500 }).catch(() => {
        // Expected to potentially fail - button may be gone during redirect
      });
    } catch {
      // Fallback: Direct logout button
      try {
        await legacyLogoutButton.waitFor({
          state: 'visible',
          timeout: TEST_CONFIG.timeouts.action,
        });
        await legacyLogoutButton.click({
          timeout: TEST_CONFIG.timeouts.action,
        });
        await legacyLogoutButton.click({ timeout: 500 }).catch(() => {
          // Expected to potentially fail
        });
      } catch {
        // Fallback: Legacy user menu
        await legacyUserMenu.waitFor({
          state: 'visible',
          timeout: TEST_CONFIG.timeouts.action,
        });
        await legacyUserMenu.click({ timeout: TEST_CONFIG.timeouts.action });
        await page.waitForTimeout(300);
        await page.click('text=Sair', { timeout: TEST_CONFIG.timeouts.action });
      }
    }

    // Should still end up on login page without errors
    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Multiple logout clicks handled: PASSED');
  });

  /**
   * Test: Protected routes redirect after logout (all routes)
   */
  test('all protected routes redirect after logout', async ({ page }) => {
    await loginUser(page, TEST_CONFIG.admin);
    await performLogout(page);

    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Test multiple protected routes
    const protectedRoutes = ['/dashboard', '/etps', '/profile', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });
    }

    console.log('All protected routes redirect after logout: PASSED');
  });
});
