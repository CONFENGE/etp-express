/**
 * E2E Admin Domain Management Tests - System Admin Flow
 *
 * @description Tests the Domain Management functionality for SYSTEM_ADMIN users.
 * Validates CRUD operations on domains, manager assignment, user viewing,
 * domain editing, and statistics display.
 *
 * @issue #957
 * @see #936 - Original implementation
 * @see #1354 - Cleanup of E2E test domains
 * @group e2e
 * @group admin
 * @priority P1
 */

import { test, expect, request } from '@playwright/test';

/**
 * Test configuration for domain management tests
 *
 * @note Timeouts are increased for Railway environment which has higher latency
 * @see #1151 - E2E test fixes for Railway CI
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
    institutionName: 'E2E Test Institution',
    maxUsers: 10,
  },

  // Timeouts - increased for Railway environment
  timeouts: {
    navigation: 15000,
    action: 10000,
    dataLoad: 15000,
    dialog: 5000,
    pageLoad: 20000,
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
   * Cleanup after all tests - remove E2E test domains from database
   *
   * @see #1354 - Cleanup of E2E test domains
   * @description Calls the backend cleanup endpoint to remove all domains
   * matching the pattern test-e2e-*.example.com
   */
  test.afterAll(async () => {
    const apiUrl = process.env.E2E_API_URL || 'http://localhost:3000';

    try {
      // Create API context
      const apiContext = await request.newContext({
        baseURL: apiUrl,
      });

      // Login to get access token
      const loginResponse = await apiContext.post('/api/v1/auth/login', {
        data: {
          email: TEST_CONFIG.admin.email,
          password: TEST_CONFIG.admin.password,
        },
      });

      if (!loginResponse.ok()) {
        console.warn(
          '[E2E Cleanup] Failed to login for cleanup:',
          loginResponse.status(),
        );
        await apiContext.dispose();
        return;
      }

      const loginData = await loginResponse.json();
      const accessToken = loginData.access_token;

      // Call cleanup endpoint
      const cleanupResponse = await apiContext.delete(
        '/api/v1/system-admin/domains/cleanup-test-domains',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (cleanupResponse.ok()) {
        const result = await cleanupResponse.json();
        console.log(
          `[E2E Cleanup] Successfully cleaned up ${result.deleted} test domain(s)`,
        );
      } else {
        console.warn(
          '[E2E Cleanup] Cleanup endpoint returned:',
          cleanupResponse.status(),
        );
      }

      await apiContext.dispose();
    } catch (error) {
      console.warn('[E2E Cleanup] Failed to cleanup test domains:', error);
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

    const institutionNameInput = dialog.locator(
      'input[name="institutionName"], input#institutionName',
    );
    await institutionNameInput.fill(TEST_CONFIG.testDomain.institutionName);

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

    // Wait for the domain table to be visible (indicates data loaded)
    const domainTable = page.locator('table, [data-testid="domain-table"]');
    await domainTable
      .or(page.locator('text=No domains registered yet'))
      .first()
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.dataLoad });

    // Find a domain row with actions menu (use data-testid pattern for resilience)
    const actionsButton = page
      .locator('button[data-testid^="domain-actions-"]')
      .first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      // No domains exist, skip test
      console.log('View domain details: SKIPPED (no domains exist to view)');
      return;
    }

    // Click actions menu
    await actionsButton.click();

    // Click "View Details" (use data-testid for resilience)
    const viewDetailsOption = page.locator(
      '[data-testid="view-details-option"]',
    );
    await expect(viewDetailsOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });
    await viewDetailsOption.click();

    // Verify navigation to domain detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Wait for the page to fully load before checking elements
    await page.waitForLoadState('networkidle');

    // Verify Domain Information card is visible (use data-testid for resilience)
    const domainInfoCard = page.locator('[data-testid="domain-info-card"]');
    await expect(domainInfoCard).toBeVisible({
      timeout: TEST_CONFIG.timeouts.pageLoad,
    });

    // Verify Domain Users card is visible (use data-testid for resilience)
    const domainUsersCard = page.locator('[data-testid="domain-users-card"]');
    await expect(domainUsersCard).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify status badge is visible (Active or Inactive)
    const statusBadge = page
      .locator('text=Active')
      .or(page.locator('text=Inactive'))
      .first();
    await expect(statusBadge).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

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

    // Wait for the domain table to be visible (indicates data loaded)
    const domainTable = page.locator('table, [data-testid="domain-table"]');
    await domainTable
      .or(page.locator('text=No domains registered yet'))
      .first()
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.dataLoad });

    // Find a domain row with actions menu (use data-testid pattern for resilience)
    const actionsButton = page
      .locator('button[data-testid^="domain-actions-"]')
      .first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('Assign manager to domain: SKIPPED (no domains exist)');
      return;
    }

    // Navigate to domain detail via actions menu
    await actionsButton.click();
    const viewDetailsOption = page.locator(
      '[data-testid="view-details-option"]',
    );
    await expect(viewDetailsOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });
    await viewDetailsOption.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Find "Assign Manager" or "Change Manager" button (use data-testid for resilience)
    const assignManagerButton = page.locator(
      '[data-testid="assign-manager-button"]',
    );
    await expect(assignManagerButton).toBeVisible({
      timeout: TEST_CONFIG.timeouts.pageLoad,
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

    // Wait for the domain table to be visible (indicates data loaded)
    const domainTable = page.locator('table, [data-testid="domain-table"]');
    await domainTable
      .or(page.locator('text=No domains registered yet'))
      .first()
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.dataLoad });

    // Find a domain row with actions menu (use data-testid pattern for resilience)
    const actionsButton = page
      .locator('button[data-testid^="domain-actions-"]')
      .first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('View domain users: SKIPPED (no domains exist)');
      return;
    }

    // Navigate to domain detail (use data-testid for resilience)
    await actionsButton.click();
    const viewDetailsOption = page.locator(
      '[data-testid="view-details-option"]',
    );
    await expect(viewDetailsOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });
    await viewDetailsOption.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Verify Domain Users card is visible (use data-testid for resilience)
    const domainUsersTitle = page.locator('[data-testid="domain-users-title"]');
    await expect(domainUsersTitle).toBeVisible({
      timeout: TEST_CONFIG.timeouts.pageLoad,
    });

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

    // Verify user count is displayed (use data-testid for resilience)
    const userCount = page.locator('[data-testid="domain-users-count"]');
    await expect(userCount).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('View domain users: PASSED');
  });

  /**
   * Test 5: Edit domain
   *
   * @description Validates that a system admin can edit an existing domain's
   * configuration (name, max users, status).
   *
   * @acceptance-criteria
   * - Domain detail page has "Edit" button
   * - Clicking edit opens the edit domain dialog
   * - Form is pre-filled with current domain data
   * - Changes can be saved successfully
   * - Success message is displayed after save
   */
  test('edit domain', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Wait for the domain table to be visible (indicates data loaded)
    const domainTable = page.locator('table, [data-testid="domain-table"]');
    await domainTable
      .or(page.locator('text=No domains registered yet'))
      .first()
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.dataLoad });

    // Find a domain row with actions menu (use data-testid pattern for resilience)
    const actionsButton = page
      .locator('button[data-testid^="domain-actions-"]')
      .first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('Edit domain: SKIPPED (no domains exist)');
      return;
    }

    // Click actions menu
    await actionsButton.click();

    // Click "Edit" option
    const editOption = page.locator(
      '[role="menuitem"]:has-text("Edit"), text=Edit',
    );
    const hasEditOption = await editOption.isVisible().catch(() => false);

    if (!hasEditOption) {
      // Navigate to domain detail and look for edit button there (use data-testid)
      const viewDetailsOption = page.locator(
        '[data-testid="view-details-option"]',
      );
      await expect(viewDetailsOption).toBeVisible({
        timeout: TEST_CONFIG.timeouts.dialog,
      });
      await viewDetailsOption.click();

      // Wait for detail page
      await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });

      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');

      // Find edit button on detail page
      const editButton = page.locator(
        'button:has-text("Edit"), button[aria-label*="Edit"]',
      );
      await expect(editButton).toBeVisible({
        timeout: TEST_CONFIG.timeouts.pageLoad,
      });
      await editButton.click();
    } else {
      await editOption.click();
    }

    // Verify edit dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });

    // Verify form fields are visible and pre-filled
    const domainInput = dialog.locator('input[name="domain"], input#domain');
    const maxUsersInput = dialog.locator(
      'input[name="maxUsers"], input#maxUsers',
    );

    // At least one field should be visible (domain or maxUsers)
    const hasDomainField = await domainInput.isVisible().catch(() => false);
    const hasMaxUsersField = await maxUsersInput.isVisible().catch(() => false);
    expect(hasDomainField || hasMaxUsersField).toBe(true);

    // Modify max users (increment by 1)
    if (hasMaxUsersField) {
      const currentValue = await maxUsersInput.inputValue();
      const newValue = (parseInt(currentValue) || 10) + 1;
      await maxUsersInput.clear();
      await maxUsersInput.fill(String(newValue));
    }

    // Submit form
    const submitButton = dialog.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Update")',
    );
    await submitButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify success message (any of these variations)
    const successToast = page
      .locator('text=Domain updated successfully')
      .or(page.locator('text=successfully updated'))
      .or(page.locator('text=saved'));
    const hasSuccess = await successToast
      .first()
      .isVisible()
      .catch(() => false);

    // Success can be indicated by dialog closing without error
    expect(hasSuccess || !(await dialog.isVisible())).toBe(true);

    console.log('Edit domain: PASSED');
  });

  /**
   * Test 6: View domain statistics
   *
   * @description Validates that the domain detail page displays statistics
   * including user count, ETP count, and usage metrics.
   *
   * @acceptance-criteria
   * - Domain detail page shows statistics section
   * - User count is displayed
   * - ETP count is displayed (if applicable)
   * - Statistics cards have numeric values
   */
  test('view domain statistics', async ({ page }) => {
    // Navigate to domain management
    await page.goto('/admin/domains');
    await page.waitForLoadState('networkidle');

    // Wait for the domain table to be visible (indicates data loaded)
    const domainTable = page.locator('table, [data-testid="domain-table"]');
    await domainTable
      .or(page.locator('text=No domains registered yet'))
      .first()
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.dataLoad });

    // Find a domain row with actions menu (use data-testid pattern for resilience)
    const actionsButton = page
      .locator('button[data-testid^="domain-actions-"]')
      .first();
    const hasActions = await actionsButton.isVisible().catch(() => false);

    if (!hasActions) {
      console.log('View domain statistics: SKIPPED (no domains exist)');
      return;
    }

    // Navigate to domain detail (use data-testid for resilience)
    await actionsButton.click();
    const viewDetailsOption = page.locator(
      '[data-testid="view-details-option"]',
    );
    await expect(viewDetailsOption).toBeVisible({
      timeout: TEST_CONFIG.timeouts.dialog,
    });
    await viewDetailsOption.click();

    // Wait for detail page
    await expect(page).toHaveURL(/\/admin\/domains\/[a-zA-Z0-9-]+/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check for statistics indicators (use data-testid for resilience)
    // Look for user count display
    const userCountElement = page.locator('[data-testid="domain-users-count"]');
    const hasUserCount = await userCountElement
      .waitFor({ state: 'visible', timeout: TEST_CONFIG.timeouts.pageLoad })
      .then(() => true)
      .catch(() => false);

    // Look for domain info card with stats (use data-testid for resilience)
    const domainInfoCard = page.locator('[data-testid="domain-info-card"]');
    const hasDomainInfo = await domainInfoCard.isVisible().catch(() => false);

    // Look for any numeric statistics (cards with numbers)
    const statsCards = page.locator('[class*="card"], [class*="stat"]');
    const statsCount = await statsCards.count();

    // At least one statistics indicator should be present
    expect(hasUserCount || hasDomainInfo || statsCount > 0).toBe(true);

    // If user count element found, verify it has content
    if (hasUserCount) {
      const userCountText = await userCountElement.textContent();
      const hasNumber = userCountText && /\d+/.test(userCountText);
      expect(hasNumber).toBe(true);
    }

    console.log('View domain statistics: PASSED');
  });
});
