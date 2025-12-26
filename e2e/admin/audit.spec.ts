/**
 * E2E Admin Audit Logs Export Tests - System Admin Flow
 *
 * @description Tests the Audit Logs Export functionality for SYSTEM_ADMIN users.
 * Validates the export interface for LGPD compliance reporting.
 *
 * @issue #936
 * @group e2e
 * @group admin
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for audit logs export tests
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
    export: 15000,
  },
};

/**
 * Audit Logs Export Test Suite
 *
 * Tests audit logs export functionality:
 * 1. Access audit logs export page
 * 2. Configure export options
 * 3. Export audit logs
 *
 * @requires-backend Requires backend running with system admin user seeded
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Admin Audit Logs Export - Happy Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Audit logs export tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
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

    // Wait for dashboard
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
   * Test: Export audit logs
   *
   * @description Validates that a system admin can access the audit logs export
   * page and export logs in different formats.
   *
   * @acceptance-criteria
   * - Audit logs export page is accessible
   * - Page shows "Export Audit Logs" header
   * - Export format selector is visible (JSON/CSV)
   * - Date range filters are visible
   * - Action type filter is visible
   * - Export button is visible and enabled
   * - LGPD compliance info card is visible
   */
  test('export audit logs', async ({ page }) => {
    // Navigate to audit logs export page
    await page.goto('/admin/audit');
    await page.waitForLoadState('networkidle');

    // Verify page header
    const header = page.locator('h1:has-text("Export Audit Logs")');
    await expect(header).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description about LGPD
    const description = page.locator('text=LGPD compliance');
    await expect(description).toBeVisible();

    // Verify Export Options card is visible
    const exportOptionsCard = page.locator('text=Export Options');
    await expect(exportOptionsCard).toBeVisible();

    // Verify format selector is visible
    const formatLabel = page.locator('label:has-text("Export Format")');
    await expect(formatLabel).toBeVisible();

    // Verify format select trigger
    const formatSelect = page.locator('#format');
    await expect(formatSelect).toBeVisible();

    // Verify action type filter is visible
    const actionLabel = page.locator('label:has-text("Action Type")');
    await expect(actionLabel).toBeVisible();

    // Verify date filters are visible
    const startDateLabel = page.locator('label:has-text("Start Date")');
    await expect(startDateLabel).toBeVisible();

    const endDateLabel = page.locator('label:has-text("End Date")');
    await expect(endDateLabel).toBeVisible();

    // Verify export button is visible
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();

    // Verify LGPD info card is visible
    const lgpdInfoCard = page.locator('text=About LGPD Compliance Exports');
    await expect(lgpdInfoCard).toBeVisible();

    // Test changing format to CSV
    await formatSelect.click();
    const csvOption = page.locator('[role="option"]:has-text("CSV")');
    await expect(csvOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await csvOption.click();

    // Verify export button text updates
    const exportCsvButton = page.locator('button:has-text("Export CSV")');
    await expect(exportCsvButton).toBeVisible();

    // Test changing back to JSON
    await formatSelect.click();
    const jsonOption = page.locator('[role="option"]:has-text("JSON")');
    await jsonOption.click();

    // Verify export button text updates
    const exportJsonButton = page.locator('button:has-text("Export JSON")');
    await expect(exportJsonButton).toBeVisible();

    // Test action type filter
    const actionSelect = page.locator('#action');
    await actionSelect.click();

    // Verify some action options are available
    const loginOption = page.locator('[role="option"]:has-text("Login")');
    await expect(loginOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Close dropdown
    await page.keyboard.press('Escape');

    console.log('Export audit logs: PASSED');
  });
});
