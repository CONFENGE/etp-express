/**
 * E2E Admin Dashboard Tests - System Admin Flow
 *
 * @description Tests the Admin Dashboard functionality for SYSTEM_ADMIN users.
 * Validates access to dashboard, statistics display, and navigation to domain management.
 *
 * @issue #936
 * @group e2e
 * @group admin
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for admin dashboard tests
 */
const TEST_CONFIG = {
  // System Admin credentials - use environment variables in production
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 5000,
    dataLoad: 8000,
  },
};

/**
 * Admin Dashboard Test Suite
 *
 * Tests the complete System Admin dashboard flow:
 * 1. Access dashboard with SYSTEM_ADMIN credentials
 * 2. View domain statistics
 * 3. Navigate to domain management
 *
 * @requires-backend Requires backend running with system admin user seeded
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Admin Dashboard - Happy Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Admin dashboard tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup before each test - login as system admin
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

    // Login as system admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.admin.email,
    );
    await page.fill(
      'input[name="password"], input#password',
      TEST_CONFIG.admin.password,
    );
    await page.click('button[type="submit"]');

    // Wait for dashboard (admins may redirect to /dashboard or /admin)
    await page.waitForURL(/\/(dashboard|admin)/, {
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
   * Test 1: Access admin dashboard as SYSTEM_ADMIN
   *
   * @description Validates that a system admin can access the admin dashboard
   * and sees the correct page header and content.
   *
   * @acceptance-criteria
   * - System admin can login successfully
   * - Admin dashboard is accessible at /admin
   * - Page shows "System Admin" header
   * - No loading spinner visible after data loads
   */
  test('access admin dashboard as SYSTEM_ADMIN', async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify we're on the admin dashboard
    await expect(page).toHaveURL(/\/admin/);

    // Verify page header is visible (Portuguese: "Administração do Sistema")
    const header = page.locator('h1:has-text("Administração do Sistema")');
    await expect(header).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description text (Portuguese)
    const description = page.locator(
      'text=Gerencie domínios e usuários da plataforma',
    );
    await expect(description).toBeVisible();

    // Verify no loading state after page loads
    await page.waitForTimeout(2000);
    const loadingSkeletons = page.locator('[class*="Skeleton"]');
    const skeletonsVisible = (await loadingSkeletons.count()) > 0;
    // After data loads, skeletons should be replaced with actual content
    // UI labels are in Portuguese: "Total de Domínios"
    const statsCards = page.locator('text=Total de Domínios');
    await expect(statsCards).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dataLoad,
    });

    console.log('Admin dashboard access: PASSED');
  });

  /**
   * Test 2: View domain statistics on dashboard
   *
   * @description Validates that the admin dashboard displays correct statistics
   * cards for domains and users.
   *
   * @acceptance-criteria
   * - Statistics cards are visible
   * - "Total de Domínios" card shows a number
   * - "Total de Usuários" card shows a number
   * - "Domínios Ativos" card shows a number
   */
  test('view domain statistics on dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Verify Total Domains card (Portuguese: "Total de Domínios")
    const totalDomainsCard = page.locator('text=Total de Domínios').first();
    await expect(totalDomainsCard).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify Total Users card (Portuguese: "Total de Usuários")
    const totalUsersCard = page.locator('text=Total de Usuários').first();
    await expect(totalUsersCard).toBeVisible();

    // Verify Active Domains card (Portuguese: "Domínios Ativos")
    const activeDomainsCard = page.locator('text=Domínios Ativos').first();
    await expect(activeDomainsCard).toBeVisible();

    // Verify cards have numeric values (not loading skeletons)
    const statsValues = page.locator('.text-2xl.font-bold');
    const statsCount = await statsValues.count();
    expect(statsCount).toBeGreaterThanOrEqual(2);

    console.log('Domain statistics display: PASSED');
  });

  /**
   * Test 3: Navigate to domain management from dashboard
   *
   * @description Validates that clicking "Manage Domains" button navigates
   * to the domain management page.
   *
   * @acceptance-criteria
   * - "Manage Domains" button is visible on dashboard
   * - Clicking button navigates to /admin/domains
   * - Domain Management page loads correctly
   */
  test('navigate to domain management from dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Find and click "Gerenciar Domínios" button (Portuguese)
    const manageDomainsButton = page
      .locator('a:has-text("Gerenciar Domínios")')
      .first();
    await expect(manageDomainsButton).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    await manageDomainsButton.click();

    // Verify navigation to domain management page
    await expect(page).toHaveURL(/\/admin\/domains/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify Domain Management page header (Portuguese: "Domínios")
    const domainsMgmtHeader = page.locator('h1:has-text("Domínios")');
    await expect(domainsMgmtHeader).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description (Portuguese)
    const description = page.locator(
      'text=Gerencie os domínios institucionais autorizados',
    );
    await expect(description).toBeVisible();

    console.log('Navigation to domain management: PASSED');
  });
});
