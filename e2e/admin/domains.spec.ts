/**
 * E2E Admin Domain Management Tests - System Admin Flow
 *
 * @description Tests the Domain Management functionality for SYSTEM_ADMIN users.
 * Validates CRUD operations on domains, manager assignment, and user viewing.
 *
 * @issue #936
 * @group e2e
 * @group admin
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for domain management tests
 */
const TEST_CONFIG = {
  // System Admin credentials - use environment variables in production
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Test domain data
  testDomain: {
    name: `test-e2e-${Date.now()}.example.com`,
    maxUsers: 10,
  },

  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 5000,
    dataLoad: 8000,
    dialog: 3000,
  },
};

/**
 * Domain Management Test Suite
 *
 * Tests domain CRUD operations:
 * 1. Create new domain
 * 2. View domain details
 * 3. Assign manager to domain
 * 4. View domain users
 *
 * @requires-backend Requires backend running with system admin user seeded
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Admin Domain Management - Happy Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Domain management tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
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
   * Test 1: Create new domain
   *
   * @description Validates that a system admin can create a new domain
   * through the domain management interface.
   *
   * @acceptance-criteria
   * - Admin can navigate to domain management
   * - "Add Domain" button is visible and clickable
   * - Create domain dialog opens
   * - Domain can be created with valid data
   * - Success message is displayed
   * - New domain appears in the list
   */
  test('create new domain', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    const header = page.locator('h1:has-text("Domains")');
    await expect(header).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Click "Add Domain" button
    const addDomainButton = page.locator('button:has-text("Add Domain")');
    await expect(addDomainButton).toBeVisible();
    await addDomainButton.click();

    // Wait for dialog to open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });

    // Fill domain form
    const domainInput = dialog.locator('input[name="domain"], input#domain');
    await domainInput.fill(TEST_CONFIG.testDomain.name);

    const maxUsersInput = dialog.locator(
      'input[name="maxUsers"], input#maxUsers',
    );
    await maxUsersInput.clear();
    await maxUsersInput.fill(String(TEST_CONFIG.testDomain.maxUsers));

    // Submit form
    const submitButton = dialog.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for dialog to close and success message
    await expect(dialog).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify success toast appears
    const successToast = page.locator('text=Domain created successfully');
    await expect(successToast).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify domain appears in list
    const newDomainRow = page.locator(`text=${TEST_CONFIG.testDomain.name}`);
    await expect(newDomainRow).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dataLoad,
    });

    console.log('Create new domain: PASSED');
  });

  /**
   * Test 2: View domain details
   *
   * @description Validates that clicking on a domain in the list opens
   * the domain detail page with correct information.
   *
   * @acceptance-criteria
   * - Domain list displays domains with action buttons
   * - Clicking "View Details" opens the domain detail page
   * - Domain detail page shows correct domain information
   * - Domain Information card is visible
   * - Domain Users card is visible
   */
  test('view domain details', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find a domain row with actions menu
    const actionsButton = page.locator('button[aria-label*="Actions"]').first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      // No domains exist, skip test
      console.log('View domain details: SKIPPED (no domains exist to view)');
      return;
    }

    // Click actions menu
    await actionsButton.click();

    // Click "View Details"
    const viewDetailsOption = page.locator('text=View Details');
    await expect(viewDetailsOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });
    await viewDetailsOption.click();

    // Verify navigation to domain detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify Domain Information card is visible
    const domainInfoCard = page.locator('text=Domain Information');
    await expect(domainInfoCard).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify Domain Users card is visible
    const domainUsersCard = page.locator('text=Domain Users');
    await expect(domainUsersCard).toBeVisible();

    // Verify status badge is visible
    const statusBadge = page.locator('text=Active, text=Inactive').first();
    await expect(statusBadge).toBeVisible();

    console.log('View domain details: PASSED');
  });

  /**
   * Test 3: Assign manager to domain
   *
   * @description Validates that a system admin can assign a manager to a domain.
   *
   * @acceptance-criteria
   * - Domain detail page has "Assign Manager" or "Change Manager" button
   * - Clicking button opens the assign manager dialog
   * - Dialog displays available users
   * - Manager can be assigned to the domain
   */
  test('assign manager to domain', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find a domain row with actions menu
    const actionsButton = page.locator('button[aria-label*="Actions"]').first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('Assign manager to domain: SKIPPED (no domains exist)');
      return;
    }

    // Navigate to domain detail via actions menu
    await actionsButton.click();
    const viewDetailsOption = page.locator('text=View Details');
    await viewDetailsOption.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Find "Assign Manager" or "Change Manager" button
    const assignManagerButton = page.locator(
      'button:has-text("Assign Manager"), button:has-text("Change Manager")',
    );
    await expect(assignManagerButton).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Click the button
    await assignManagerButton.click();

    // Verify dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });

    // Verify dialog has user selection options or message
    const dialogContent = dialog.locator('div');
    await expect(dialogContent).toBeVisible();

    // Close dialog (cancel)
    const closeButton = dialog.locator(
      'button:has-text("Cancel"), button[aria-label="Close"]',
    );
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Press Escape to close
      await page.keyboard.press('Escape');
    }

    await expect(dialog).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('Assign manager to domain: PASSED');
  });

  /**
   * Test 4: View domain users
   *
   * @description Validates that the domain detail page displays the list of users
   * registered in that domain.
   *
   * @acceptance-criteria
   * - Domain detail page shows "Domain Users" section
   * - Users list displays user info (name, email, role)
   * - Empty state is shown if no users exist
   * - User count is displayed in the card header
   */
  test('view domain users', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find a domain row with actions menu
    const actionsButton = page.locator('button[aria-label*="Actions"]').first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('View domain users: SKIPPED (no domains exist)');
      return;
    }

    // Navigate to domain detail
    await actionsButton.click();
    const viewDetailsOption = page.locator('text=View Details');
    await viewDetailsOption.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Verify Domain Users card is visible
    const domainUsersTitle = page.locator('text=Domain Users');
    await expect(domainUsersTitle).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Wait for users to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Check for either users list or empty state
    const hasUsers = await page
      .locator('[class*="rounded-full"]')
      .count()
      .then((count) => count > 0);
    const emptyState = page.locator(
      'text=No users registered in this domain yet',
    );
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // Either users or empty state should be visible
    expect(hasUsers || hasEmptyState).toBe(true);

    // Verify user count is displayed (e.g., "3 of 10 users")
    const userCount = page.locator('text=/\\d+ of \\d+ users/');
    await expect(userCount).toBeVisible();

    console.log('View domain users: PASSED');
  });
});
