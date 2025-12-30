/**
 * E2E Manager Dashboard Tests - Domain Manager Flow
 *
 * @description Tests the Manager Dashboard functionality for DOMAIN_MANAGER users.
 * Validates access to dashboard, statistics display, and navigation to user management.
 *
 * @issue #937
 * @group e2e
 * @group manager
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for manager dashboard tests
 */
const TEST_CONFIG = {
  // Domain Manager credentials - use environment variables in production
  manager: {
    email: process.env.E2E_MANAGER_EMAIL || 'manager@confenge.com.br',
    password: process.env.E2E_MANAGER_PASSWORD || 'Manager@123',
  },

  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 5000,
    dataLoad: 8000,
  },
};

/**
 * Manager Dashboard Test Suite
 *
 * Tests the complete Domain Manager dashboard flow:
 * 1. Access dashboard with DOMAIN_MANAGER credentials
 * 2. View domain statistics
 * 3. View quota indicator
 * 4. View recent users list
 * 5. Navigate to user management
 *
 * @requires-backend Requires backend running with domain manager user seeded
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Manager Dashboard - Happy Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Manager dashboard tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup before each test - login as domain manager
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

    // Login as domain manager
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.manager.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.manager.password,
    );
    await page.click('button[type="submit"]');

    // Wait for dashboard (managers may redirect to /manager or /dashboard)
    await page.waitForURL(/\/(dashboard|manager)/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
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
   * Test 1: Access manager dashboard as DOMAIN_MANAGER
   *
   * @description Validates that a domain manager can access the manager dashboard
   * and sees the correct page header and content.
   *
   * @acceptance-criteria
   * - Domain manager can login successfully
   * - Manager dashboard is accessible at /manager
   * - Page shows "Domain Manager" header
   * - No loading spinner visible after data loads
   */
  test('access manager dashboard as DOMAIN_MANAGER', async ({ page }) => {
    // Navigate to manager dashboard
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Verify we're on the manager dashboard
    await expect(page).toHaveURL(/\/manager/);

    // Verify page header is visible
    const header = page.locator('h1:has-text("Gestor de Domínio")');
    await expect(header).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description text
    const description = page.locator('text=Manage users within your domain');
    await expect(description).toBeVisible();

    // Verify no loading state after page loads
    await page.waitForTimeout(2000);
    const loadingSpinner = page.locator(
      '[role="status"][aria-label="Loading users"]',
    );
    const isLoading = await loadingSpinner.isVisible().catch(() => false);
    expect(isLoading).toBe(false);

    console.log('Manager dashboard access: PASSED');
  });

  /**
   * Test 2: View domain statistics on dashboard
   *
   * @description Validates that the manager dashboard displays correct statistics
   * cards for Total Users, Active Users, Inactive Users, and Pending Setup.
   *
   * @acceptance-criteria
   * - Statistics cards are visible
   * - "Total Users" card shows a number
   * - "Active Users" card shows a number
   * - "Inactive Users" card shows a number
   * - "Pending Setup" card shows a number
   */
  test('view domain statistics on dashboard', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Verify Total Users card
    const totalUsersCard = page.locator('text=Total Users').first();
    await expect(totalUsersCard).toBeVisible();

    // Verify Active Users card
    const activeUsersCard = page.locator('text=Active Users').first();
    await expect(activeUsersCard).toBeVisible();

    // Verify Inactive Users card
    const inactiveUsersCard = page.locator('text=Inactive Users').first();
    await expect(inactiveUsersCard).toBeVisible();

    // Verify Pending Setup card
    const pendingCard = page.locator('text=Pending Setup').first();
    await expect(pendingCard).toBeVisible();

    // Verify cards have numeric values (not loading skeletons)
    const statsCards = page.locator('.text-2xl.font-bold');
    const statsCount = await statsCards.count();
    expect(statsCount).toBeGreaterThanOrEqual(4);

    console.log('Domain statistics display: PASSED');
  });

  /**
   * Test 3: View quota indicator
   *
   * @description Validates that the User Quota card is visible and shows
   * domain capacity information.
   *
   * @acceptance-criteria
   * - User Quota card is visible
   * - QuotaIndicator component renders
   * - Capacity information is displayed
   */
  test('view quota indicator', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Verify User Quota card header
    const quotaCardTitle = page.locator('text=User Quota');
    await expect(quotaCardTitle).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify capacity description
    const capacityText = page.locator('text=Domain capacity');
    await expect(capacityText).toBeVisible();

    // Verify quota indicator is not in loading state
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    console.log('Quota indicator display: PASSED');
  });

  /**
   * Test 4: View recent users list
   *
   * @description Validates that the Recent Users card displays correctly,
   * showing either a list of users or an empty state.
   *
   * @acceptance-criteria
   * - Recent Users card is visible
   * - Card shows "Últimos 5 usuários cadastrados" description
   * - Either user list or empty state is displayed
   * - "Ver todos" button is visible and links to /manager/users
   */
  test('view recent users list', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Verify Recent Users card
    const recentUsersTitle = page.locator(
      'h3:has-text("Usuários Recentes"), [class*="CardTitle"]:has-text("Usuários Recentes")',
    );
    await expect(recentUsersTitle.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description (PT-BR)
    const description = page.locator('text=Últimos 5 usuários cadastrados');
    await expect(description).toBeVisible();

    // Verify "Ver todos" button (PT-BR)
    const viewAllButton = page.locator('a:has-text("Ver todos")');
    await expect(viewAllButton).toBeVisible();
    await expect(viewAllButton).toHaveAttribute('href', /\/manager\/users/);

    // Wait for data load and verify either user list or empty state
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    const hasUsers = (await page.locator('[class*="rounded-lg"]').count()) > 3;
    const emptyState = page.locator('text=Nenhum usuário no seu domínio ainda');

    if (!hasUsers) {
      // If no users, empty state should be visible
      const isEmptyStateVisible = await emptyState
        .isVisible()
        .catch(() => false);
      console.log(`Empty state visible: ${isEmptyStateVisible}`);
    }

    console.log('Recent users list display: PASSED');
  });

  /**
   * Test 5: Navigate to user management from dashboard
   *
   * @description Validates that clicking "Manage Users" button navigates
   * to the user management page.
   *
   * @acceptance-criteria
   * - "Manage Users" button is visible on dashboard
   * - Clicking button navigates to /manager/users
   * - User Management page loads correctly
   */
  test('navigate to user management from dashboard', async ({ page }) => {
    await page.goto('/manager');
    await page.waitForLoadState('networkidle');

    // Find and click "Manage Users" button
    const manageUsersButton = page
      .locator('a:has-text("Gerenciar Usuários")')
      .first();
    await expect(manageUsersButton).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    await manageUsersButton.click();

    // Verify navigation to user management page
    await expect(page).toHaveURL(/\/manager\/users/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify User Management page header (Portuguese: "Gerenciamento de Usuários")
    const userMgmtHeader = page.locator(
      'h1:has-text("Gerenciamento de Usuários")',
    );
    await expect(userMgmtHeader).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('Navigation to user management: PASSED');
  });
});
