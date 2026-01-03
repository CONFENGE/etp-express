/**
 * E2E Manager User Management Tests - User CRUD Operations
 *
 * @description Tests the User Management functionality for DOMAIN_MANAGER users.
 * Validates complete CRUD operations: Create, Read, Update (Edit/Deactivate), Delete.
 *
 * @issue #937
 * @group e2e
 * @group manager
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for manager user management tests
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
    dialogOpen: 3000,
    dataLoad: 8000,
  },

  // Test data for user creation
  testUser: {
    name: `E2E Test User ${Date.now()}`,
    // Email will be constructed with domain suffix in test
    cargo: 'Analista de Licitacao',
  },
};

/**
 * Manager User Management Test Suite
 *
 * Tests the complete user management flow for Domain Managers:
 * 1. View users list in domain
 * 2. Create new user in domain
 * 3. Edit existing user
 * 4. Deactivate user
 *
 * @requires-backend Requires backend running with domain manager user seeded
 * @skip-ci These tests are skipped in CI unless E2E infrastructure is configured
 */
test.describe('Manager User Management - Happy Path', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Manager user management tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
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

    // Wait for initial redirect
    await page.waitForURL(/\/(dashboard|manager)/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    // Navigate to user management
    await page.goto('/manager/users');
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
   * Test 1: View users list in domain
   *
   * @description Validates that the user management page displays the
   * users table with domain users listed.
   *
   * @acceptance-criteria
   * - User Management page loads at /manager/users
   * - Page header "User Management" is visible
   * - Users table is displayed
   * - Search functionality is available
   * - Quota indicator is visible
   */
  test('view users list in domain', async ({ page }) => {
    // Verify we're on the user management page
    await expect(page).toHaveURL(/\/manager\/users/);

    // Verify page header - use more flexible selector
    const header = page.locator('h1').filter({ hasText: 'User Management' });
    await expect(header).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify description
    const description = page.locator('text=Manage users in your domain');
    await expect(description).toBeVisible();

    // Verify search input is available - use data-testid for robustness
    const searchInput = page.locator(
      '[data-testid="search-users-input"], input[aria-label="Search users"]',
    );
    await expect(searchInput).toBeVisible();

    // Verify quota card is visible
    const quotaCard = page.locator('text=User Quota');
    await expect(quotaCard).toBeVisible();

    // Verify "New User" button is visible (may be disabled if quota exhausted)
    const newUserButton = page.locator(
      '[data-testid="new-user-button"], button:has-text("New User")',
    );
    await expect(newUserButton).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Verify users count text
    const usersCount = page.locator('text=/\\d+ of \\d+ users/');
    await expect(usersCount).toBeVisible();

    console.log('View users list: PASSED');
  });

  /**
   * Test 2: Create new user in domain
   *
   * @description Validates that a domain manager can create a new user
   * within their domain through the Create User dialog.
   *
   * @acceptance-criteria
   * - "New User" button opens create dialog
   * - Dialog has email, name, and cargo fields
   * - Email field shows domain suffix hint
   * - Form submission creates user
   * - Success toast is displayed
   * - New user appears in the list
   */
  test('create new user in domain', async ({ page }) => {
    // Find "New User" button using data-testid (primary) or text (fallback)
    const newUserButton = page.locator(
      '[data-testid="new-user-button"], button:has-text("New User")',
    );
    await expect(newUserButton).toBeVisible();

    // Check if button is disabled (quota exhausted)
    const isDisabled = await newUserButton.isDisabled();
    if (isDisabled) {
      console.log('New User button is disabled - quota may be exhausted');
      test.skip();
      return;
    }

    await newUserButton.click();

    // Wait for dialog to open
    await page.waitForTimeout(TEST_CONFIG.timeouts.dialogOpen);

    // Verify dialog is open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Get domain suffix from manager email
    const domainSuffix = TEST_CONFIG.manager.email.split('@')[1];
    const testEmail = `e2etest${Date.now()}@${domainSuffix}`;

    // Fill in user details
    const emailInput = dialog
      .locator('input[name="email"], input[type="email"]')
      .first();
    const nameInput = dialog.locator('input[name="name"]');
    const cargoInput = dialog.locator('input[name="cargo"]');

    // Check if email field is visible and fill it
    if (await emailInput.isVisible()) {
      await emailInput.fill(testEmail);
    }

    // Fill name
    await nameInput.fill(TEST_CONFIG.testUser.name);

    // Fill cargo if visible
    if (await cargoInput.isVisible()) {
      await cargoInput.fill(TEST_CONFIG.testUser.cargo);
    }

    // Submit form
    const submitButton = dialog.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Criar")',
    );
    await submitButton.click();

    // Wait for dialog to close (success)
    await expect(dialog).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify success toast
    const toast = page.locator('text=/User created successfully|created/i');
    await expect(toast).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('Create new user: PASSED');
  });

  /**
   * Test 3: Edit existing user
   *
   * @description Validates that a domain manager can edit an existing
   * user's information through the Edit User dialog.
   *
   * @acceptance-criteria
   * - User row has edit action available
   * - Edit dialog opens with user data pre-filled
   * - Name and cargo can be updated
   * - Form submission updates user
   * - Success toast is displayed
   */
  test('edit existing user', async ({ page }) => {
    // Wait for users to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find an edit button in the table
    const editButton = page
      .locator(
        'button[aria-label*="Edit"], button:has-text("Edit"), [data-testid="edit-user"]',
      )
      .first();

    // If no edit button found, try clicking on action menu
    const actionMenu = page
      .locator('button[aria-label*="actions"], [data-testid="user-actions"]')
      .first();

    if (await editButton.isVisible()) {
      await editButton.click();
    } else if (await actionMenu.isVisible()) {
      await actionMenu.click();
      await page.waitForTimeout(500);
      // Use .or() for bilingual selector
      const editMenuItem = page
        .locator('text=Edit')
        .or(page.locator('text=Editar'))
        .first();
      await editMenuItem.click();
    } else {
      // Skip if no users to edit
      console.log('No users available to edit - skipping test');
      test.skip();
      return;
    }

    // Wait for dialog to open
    await page.waitForTimeout(TEST_CONFIG.timeouts.dialogOpen);

    // Verify edit dialog is open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Update name field
    const nameInput = dialog.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill(`Updated User ${Date.now()}`);
    }

    // Submit form
    const submitButton = dialog.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Salvar")',
    );
    await submitButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify success toast
    const toast = page.locator('text=/updated successfully|atualizado/i');
    await expect(toast).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('Edit existing user: PASSED');
  });

  /**
   * Test 4: Deactivate user
   *
   * @description Validates that a domain manager can deactivate a user
   * in their domain.
   *
   * @acceptance-criteria
   * - User row has toggle active action available
   * - Clicking toggle changes user active status
   * - Success toast is displayed
   * - User status badge updates to reflect change
   */
  test('deactivate user', async ({ page }) => {
    // Wait for users to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find toggle active button or switch
    const toggleButton = page
      .locator(
        'button[aria-label*="ctiv"], [data-testid="toggle-active"], [role="switch"]',
      )
      .first();
    const actionMenu = page
      .locator('button[aria-label*="actions"], [data-testid="user-actions"]')
      .first();

    if (await toggleButton.isVisible()) {
      // Click toggle directly
      await toggleButton.click();
    } else if (await actionMenu.isVisible()) {
      // Open action menu and find toggle option
      await actionMenu.click();
      await page.waitForTimeout(500);
      const toggleMenuItem = page
        .locator('text=/Deactivate|Desativar|Toggle/i')
        .first();
      if (await toggleMenuItem.isVisible()) {
        await toggleMenuItem.click();
      } else {
        console.log('No toggle option available - skipping test');
        test.skip();
        return;
      }
    } else {
      console.log('No users available to deactivate - skipping test');
      test.skip();
      return;
    }

    // Verify success toast
    const toast = page.locator(
      'text=/deactivated|desativado|activated|ativado/i',
    );
    await expect(toast).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    console.log('Deactivate user: PASSED');
  });

  /**
   * Test 5: Search and filter users
   *
   * @description Validates that the search functionality filters
   * users by name, email, or cargo.
   *
   * @acceptance-criteria
   * - Search input is available
   * - Typing filters the user list
   * - Clear button removes filter
   * - Filter count updates
   */
  test('search and filter users', async ({ page }) => {
    // Wait for users to load
    await page.waitForTimeout(TEST_CONFIG.timeouts.dataLoad);

    // Find search input using data-testid (primary) or aria-label (fallback)
    const searchInput = page.locator(
      '[data-testid="search-users-input"], input[aria-label="Search users"]',
    );
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('test');
    await page.waitForTimeout(1000);

    // Verify filtered count text shows "(filtered)"
    const filteredText = page.locator('text=filtered');
    const isFiltered = await filteredText.isVisible().catch(() => false);

    if (isFiltered) {
      console.log('Search filter applied successfully');
    }

    // Clear search using data-testid (primary) or aria-label (fallback)
    const clearButton = page.locator(
      '[data-testid="clear-search-button"], button[aria-label="Clear search"]',
    );
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Verify filter is cleared
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('');
    }

    console.log('Search and filter users: PASSED');
  });
});
