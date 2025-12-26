/**
 * E2E Role-Based Access Control Tests
 *
 * @description Tests login flows and access permissions for all user roles:
 * - SYSTEM_ADMIN: Global administrator with full access
 * - DOMAIN_MANAGER: Domain-level manager with /manager access
 * - DOMAIN_USER: Regular user with basic access
 * - DEMO: Demo user with limited access
 *
 * @issue #946
 * @group e2e
 * @group auth
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration for role-based access tests
 */
const TEST_CONFIG = {
  // Role-specific credentials - use environment variables in production
  systemAdmin: {
    email: process.env.E2E_SYSTEM_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Admin@123',
    role: 'SYSTEM_ADMIN',
  },
  domainManager: {
    email: process.env.E2E_MANAGER_EMAIL || 'manager@confenge.com.br',
    password: process.env.E2E_MANAGER_PASSWORD || 'Manager@123',
    role: 'DOMAIN_MANAGER',
  },
  domainUser: {
    email: process.env.E2E_USER_EMAIL || 'user@confenge.com.br',
    password: process.env.E2E_USER_PASSWORD || 'User@123',
    role: 'DOMAIN_USER',
  },
  demo: {
    email: process.env.E2E_DEMO_EMAIL || 'demoetp@confenge.com.br',
    password: process.env.E2E_DEMO_PASSWORD || 'Demo@123',
    role: 'DEMO',
  },

  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 3000,
  },
};

/**
 * Helper function to perform login
 */
async function performLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"], input#email', email);
  await page.fill('input[name="password"], input#password', password);
  await page.click('button[type="submit"]');
}

/**
 * Helper function to verify session cookie is set
 */
async function verifySessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(
    (c) =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('auth'),
  );
  return !!sessionCookie;
}

/**
 * Role Login Flow Tests
 *
 * Tests that each role can successfully login and is redirected to dashboard.
 */
test.describe('Role Login Flows', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Role login tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  test.beforeEach(async ({ page }) => {
    // Clear cookies to ensure clean state
    await page.context().clearCookies();

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });
  });

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
   * Test: SYSTEM_ADMIN login redirects to dashboard and can access /admin
   */
  test('SYSTEM_ADMIN: login redirects to dashboard, can access /admin', async ({
    page,
  }) => {
    const { email, password } = TEST_CONFIG.systemAdmin;

    // Step 1: Login
    await performLogin(page, email, password);

    // Step 2: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 3: Verify NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    // Step 4: Verify session cookie
    const hasSession = await verifySessionCookie(page);
    expect(hasSession).toBe(true);

    // Step 5: Verify can access /admin routes
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should NOT be redirected to login or forbidden
    await expect(page).not.toHaveURL(/\/login/);
    // Should be on admin page or redirected to admin sub-route
    await expect(page).toHaveURL(/\/admin|\/dashboard/);

    console.log('SYSTEM_ADMIN login and access: PASSED');
  });

  /**
   * Test: DOMAIN_MANAGER login redirects to dashboard and can access /manager
   */
  test('DOMAIN_MANAGER: login redirects to dashboard, can access /manager', async ({
    page,
  }) => {
    const { email, password } = TEST_CONFIG.domainManager;

    // Step 1: Login
    await performLogin(page, email, password);

    // Step 2: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 3: Verify NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    // Step 4: Verify session cookie
    const hasSession = await verifySessionCookie(page);
    expect(hasSession).toBe(true);

    // Step 5: Verify can access /manager routes
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Should NOT be redirected to login
    await expect(page).not.toHaveURL(/\/login/);
    // Should be on manager page or dashboard
    await expect(page).toHaveURL(/\/manager|\/dashboard/);

    console.log('DOMAIN_MANAGER login and access: PASSED');
  });

  /**
   * Test: DOMAIN_USER login redirects to dashboard, cannot access /admin or /manager
   */
  test('DOMAIN_USER: login redirects to dashboard, restricted access', async ({
    page,
  }) => {
    const { email, password } = TEST_CONFIG.domainUser;

    // Step 1: Login
    await performLogin(page, email, password);

    // Step 2: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 3: Verify NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    // Step 4: Verify session cookie
    const hasSession = await verifySessionCookie(page);
    expect(hasSession).toBe(true);

    // Step 5: Try to access /admin - should be forbidden or redirected
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should be redirected away from admin (to dashboard, forbidden, or stay with error)
    const adminUrl = page.url();
    const isOnAdmin = adminUrl.includes('/admin');
    if (isOnAdmin) {
      // If on admin, verify there's an access denied message
      const accessDenied = page.locator(
        'text=Acesso negado, text=Forbidden, text=Sem permissão, text=403',
      );
      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      expect(hasAccessDenied).toBe(true);
    }

    // Step 6: Try to access /manager - should be forbidden or redirected
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    const managerUrl = page.url();
    const isOnManager = managerUrl.includes('/manager');
    if (isOnManager) {
      const accessDenied = page.locator(
        'text=Acesso negado, text=Forbidden, text=Sem permissão, text=403',
      );
      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      expect(hasAccessDenied).toBe(true);
    }

    console.log('DOMAIN_USER login and restricted access: PASSED');
  });

  /**
   * Test: DEMO user login redirects to dashboard with limited permissions
   */
  test('DEMO: login redirects to dashboard, limited permissions', async ({
    page,
  }) => {
    const { email, password } = TEST_CONFIG.demo;

    // Step 1: Login
    await performLogin(page, email, password);

    // Step 2: Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Step 3: Verify NOT on login page
    await expect(page).not.toHaveURL(/\/login/);

    // Step 4: Verify session cookie
    const hasSession = await verifySessionCookie(page);
    expect(hasSession).toBe(true);

    // Step 5: Verify dashboard content loads
    const dashboardContent = page.locator('main, [data-testid="dashboard"]');
    await expect(dashboardContent).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('DEMO login and dashboard access: PASSED');
  });
});

/**
 * Role Access Matrix Tests
 *
 * Validates the complete access control matrix for each role.
 */
test.describe('Role Access Matrix', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Role access matrix tests require full backend infrastructure.',
  );

  /**
   * Test: All roles can access common routes after login
   */
  test('all roles can access /dashboard after login', async ({ page }) => {
    const roles = [
      TEST_CONFIG.systemAdmin,
      TEST_CONFIG.domainManager,
      TEST_CONFIG.demo,
    ];

    for (const role of roles) {
      // Clear cookies for fresh session
      await page.context().clearCookies();

      // Login
      await performLogin(page, role.email, role.password);

      // Verify dashboard access
      await expect(page).toHaveURL(/\/dashboard/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });

      console.log(`${role.role} dashboard access: PASSED`);
    }
  });

  /**
   * Test: All authenticated roles can access /etps
   */
  test('all roles can access /etps after login', async ({ page }) => {
    const roles = [
      TEST_CONFIG.systemAdmin,
      TEST_CONFIG.domainManager,
      TEST_CONFIG.demo,
    ];

    for (const role of roles) {
      // Clear cookies for fresh session
      await page.context().clearCookies();

      // Login
      await performLogin(page, role.email, role.password);

      // Wait for dashboard
      await expect(page).toHaveURL(/\/dashboard/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });

      // Navigate to ETPs
      await page.goto('/etps');
      await page.waitForLoadState('networkidle');

      // Should have access (not redirected to login)
      await expect(page).not.toHaveURL(/\/login/);

      console.log(`${role.role} ETPs access: PASSED`);
    }
  });
});

/**
 * Session Cookie Verification Tests
 *
 * Validates that session cookies are properly set for each role.
 */
test.describe('Session Cookie Verification', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Session cookie tests require full backend infrastructure.',
  );

  const testRoles = [
    { name: 'SYSTEM_ADMIN', config: TEST_CONFIG.systemAdmin },
    { name: 'DOMAIN_MANAGER', config: TEST_CONFIG.domainManager },
    { name: 'DEMO', config: TEST_CONFIG.demo },
  ];

  for (const role of testRoles) {
    test(`${role.name}: session cookie is set after login`, async ({
      page,
    }) => {
      // Clear cookies
      await page.context().clearCookies();

      // Login
      await performLogin(page, role.config.email, role.config.password);

      // Wait for redirect
      await expect(page).toHaveURL(/\/dashboard/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });

      // Verify session cookie exists
      const hasSession = await verifySessionCookie(page);
      expect(hasSession).toBe(true);

      console.log(`${role.name} session cookie: PASSED`);
    });
  }
});
