/**
 * E2E ETP Lifecycle Tests - Delete/Undo Flow Validation
 *
 * @description Tests the complete delete lifecycle for ETPs covering:
 * - Delete ETP with confirmation (wait 5s timeout)
 * - Cancel delete via "Desfazer" button (undo within 5s)
 * - Undo toast appears with countdown
 * - Optimistic UI hides ETP immediately
 * - Empty state when all ETPs deleted
 *
 * @issue #953
 * @group e2e
 * @group etp
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
  timeouts: {
    navigation: 10000,
    action: 5000,
    toast: 3000,
    undoWindow: 5500, // 5s undo window + 500ms buffer
  },
};

/**
 * Helper: Login to the application
 */
async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"], input#email', TEST_CONFIG.admin.email);
  await page.fill(
    'input[name="password"], input#password',
    TEST_CONFIG.admin.password,
  );
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/, {
    timeout: TEST_CONFIG.timeouts.navigation,
  });
}

/**
 * Helper: Navigate to ETPs list
 */
async function navigateToETPs(page: Page): Promise<void> {
  await page.goto('/etps');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/etps/);
}

/**
 * Helper: Create an ETP via API and return its ID
 *
 * Uses the API directly instead of UI interactions to avoid header overlay issues
 * and ensure reliable ETP creation across all test environments.
 */
async function createETP(
  page: Page,
  title: string,
  description?: string,
): Promise<string> {
  // Get the base URL and auth token from the current page context
  const baseUrl = process.env.E2E_API_URL || 'http://localhost:3001/api';

  // Create ETP via API - more reliable than UI in CI environments
  const response = await page.request.post(`${baseUrl}/etps`, {
    data: {
      title,
      description: description || '',
      status: 'draft',
      progress: 0,
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create ETP via API: ${response.status()} - ${errorText}`,
    );
  }

  const etp = await response.json();
  return etp.id;
}

/**
 * Helper: Find and click delete option for an ETP by ID
 *
 * Uses data-testid selectors for more reliable element targeting,
 * avoiding header overlay issues with scrolling workarounds.
 */
async function clickDeleteForETP(page: Page, etpId: string): Promise<void> {
  // Find the ETP card by data-testid
  const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
  await expect(etpCard).toBeVisible({ timeout: 5000 });

  // Click the menu button using data-testid
  const menuButton = page.locator(`[data-testid="etp-menu-${etpId}"]`);

  // Scroll into view to avoid header overlap issues
  await menuButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  await menuButton.click();

  // Wait for dropdown menu to appear
  await page.waitForTimeout(300);

  // Click the delete option using data-testid
  const deleteOption = page.locator(`[data-testid="etp-delete-${etpId}"]`);
  await expect(deleteOption).toBeVisible({ timeout: 2000 });
  await deleteOption.click();
}

/**
 * ETP Lifecycle Test Suite
 */
test.describe('ETP Delete/Undo Lifecycle (#953)', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'ETP Lifecycle tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup: Login before each test
   */
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    await login(page);
  });

  /**
   * Teardown: Screenshot on failure
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
   * Test: ETP is hidden immediately after clicking delete (optimistic UI)
   *
   * @acceptance-criteria
   * - Click "Excluir" on an ETP
   * - ETP disappears from list immediately (before timeout)
   * - Undo toast appears
   */
  test('should hide ETP immediately after clicking delete (optimistic UI)', async ({
    page,
  }) => {
    // Create an ETP for testing via API
    const title = `Optimistic Delete Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Test description');

    // Navigate to ETP list and wait for it to load
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Verify ETP card is visible by data-testid
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Click delete
    await clickDeleteForETP(page, etpId);

    // ETP should be hidden IMMEDIATELY (not after 5s)
    // Use a short timeout to verify immediate hiding
    await expect(etpCard).not.toBeVisible({
      timeout: 1000,
    });

    // Undo toast should appear
    const undoToast = page.locator('[role="alert"]');
    await expect(undoToast).toBeVisible({ timeout: 2000 });

    console.log('Optimistic UI: ETP hidden immediately after delete click');
  });

  /**
   * Test: Undo toast appears with countdown
   *
   * @acceptance-criteria
   * - Click "Excluir" on an ETP
   * - Undo toast appears
   * - Countdown is visible (e.g., "5s", "4s", etc.)
   * - "Desfazer" button is present
   */
  test('should show undo toast with countdown after delete', async ({
    page,
  }) => {
    // Create an ETP for testing via API
    const title = `Undo Toast Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Test description');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Wait for ETP card to be visible
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Click delete
    await clickDeleteForETP(page, etpId);

    // Undo toast should appear
    const undoToast = page.locator('[role="alert"]');
    await expect(undoToast).toBeVisible({ timeout: 2000 });

    // Toast should contain the ETP title in message
    await expect(undoToast).toContainText(title);
    await expect(undoToast).toContainText('excluído');

    // Countdown should be visible (format: "Xs")
    const countdownText = await undoToast.locator('text=/\\d+s/').textContent();
    expect(countdownText).toMatch(/^\d+s$/);

    // "Desfazer" button should be present
    const undoButton = undoToast.locator('button:has-text("Desfazer")');
    await expect(undoButton).toBeVisible();

    console.log(`Undo toast visible with countdown: ${countdownText}`);
  });

  /**
   * Test: Cancel delete via "Desfazer" button restores ETP
   *
   * @acceptance-criteria
   * - Click "Excluir" on an ETP
   * - Click "Desfazer" within 5s window
   * - ETP reappears in the list
   * - Toast disappears
   */
  test('should restore ETP when clicking Desfazer (undo)', async ({ page }) => {
    // Create an ETP for testing via API
    const title = `Undo Restore Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Test description');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Verify ETP card is visible before delete
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Click delete
    await clickDeleteForETP(page, etpId);

    // ETP should be hidden (optimistic)
    await expect(etpCard).not.toBeVisible({
      timeout: 1000,
    });

    // Undo toast should appear
    const undoToast = page.locator('[role="alert"]');
    await expect(undoToast).toBeVisible({ timeout: 2000 });

    // Click "Desfazer" button
    const undoButton = undoToast.locator('button:has-text("Desfazer")');
    await undoButton.click();

    // Wait for undo action to complete
    await page.waitForTimeout(500);

    // Toast should disappear
    await expect(undoToast).not.toBeVisible({ timeout: 2000 });

    // ETP should reappear in the list
    await expect(etpCard).toBeVisible({
      timeout: 3000,
    });

    console.log('ETP restored after clicking Desfazer');
  });

  /**
   * Test: Delete is confirmed after timeout (5s)
   *
   * @acceptance-criteria
   * - Click "Excluir" on an ETP
   * - Wait for 5s timeout to expire
   * - ETP is permanently deleted
   * - Refresh page to confirm deletion
   */
  test('should permanently delete ETP after timeout expires', async ({
    page,
  }) => {
    // Create an ETP for testing via API
    const title = `Timeout Delete Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Test description');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Verify ETP card is visible
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Click delete
    await clickDeleteForETP(page, etpId);

    // ETP should be hidden (optimistic)
    await expect(etpCard).not.toBeVisible({
      timeout: 1000,
    });

    // Wait for undo timeout to expire (5s + buffer)
    await page.waitForTimeout(TEST_CONFIG.timeouts.undoWindow);

    // Toast should disappear after timeout
    const undoToast = page.locator('[role="alert"]');
    await expect(undoToast).not.toBeVisible({ timeout: 2000 });

    // Refresh page to confirm permanent deletion
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ETP card should NOT be visible (permanently deleted)
    await expect(etpCard).not.toBeVisible({
      timeout: 3000,
    });

    console.log('ETP permanently deleted after timeout');
  });

  /**
   * Test: Multiple deletes with selective undo
   *
   * @acceptance-criteria
   * - Create 2 ETPs
   * - Delete both in sequence
   * - Undo only the first one
   * - First ETP is restored, second is deleted
   */
  test('should handle multiple deletes with selective undo', async ({
    page,
  }) => {
    // Create two ETPs via API
    const title1 = `Multi Delete Test 1 - ${Date.now()}`;
    const title2 = `Multi Delete Test 2 - ${Date.now()}`;

    const etpId1 = await createETP(page, title1, 'First ETP');
    const etpId2 = await createETP(page, title2, 'Second ETP');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Verify both cards are visible
    const etpCard1 = page.locator(`[data-testid="etp-card-${etpId1}"]`);
    const etpCard2 = page.locator(`[data-testid="etp-card-${etpId2}"]`);
    await expect(etpCard1).toBeVisible({ timeout: 5000 });
    await expect(etpCard2).toBeVisible({ timeout: 5000 });

    // Delete first ETP
    await clickDeleteForETP(page, etpId1);
    await page.waitForTimeout(300);

    // Delete second ETP
    await clickDeleteForETP(page, etpId2);
    await page.waitForTimeout(300);

    // Both ETP cards should be hidden
    await expect(etpCard1).not.toBeVisible();
    await expect(etpCard2).not.toBeVisible();

    // Multiple toasts may appear - find the one for title1
    const toast1 = page
      .locator('[role="alert"]')
      .filter({ hasText: title1 })
      .first();
    const undoButton1 = toast1.locator('button:has-text("Desfazer")');

    // Undo only the first ETP
    await undoButton1.click();
    await page.waitForTimeout(500);

    // First ETP should be restored
    await expect(etpCard1).toBeVisible({
      timeout: 3000,
    });

    // Wait for second delete timeout
    await page.waitForTimeout(TEST_CONFIG.timeouts.undoWindow);

    // Refresh to confirm state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // First ETP should still be visible (was undone)
    await expect(etpCard1).toBeVisible({
      timeout: 3000,
    });

    // Second ETP should be permanently deleted
    await expect(etpCard2).not.toBeVisible();

    console.log(
      'Selective undo: First ETP restored, second permanently deleted',
    );
  });

  /**
   * Test: Empty state appears when all ETPs are deleted
   *
   * @acceptance-criteria
   * - Delete all ETPs from the list
   * - Empty state message appears
   * - "Criar ETP" button is shown
   */
  test('should show empty state when list becomes empty after deletes', async ({
    page,
  }) => {
    // Create a single ETP via API
    const title = `Empty State Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Will be deleted');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Wait for ETP card to be visible
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Get initial count of ETPs
    const initialCards = page.locator('[data-testid^="etp-card-"]');
    const initialCount = await initialCards.count();

    // Delete our ETP
    await clickDeleteForETP(page, etpId);

    // Wait for deletion timeout
    await page.waitForTimeout(TEST_CONFIG.timeouts.undoWindow);

    // Check if list is now empty (only if we deleted the last one)
    if (initialCount === 1) {
      // Empty state should appear
      const emptyState = page.locator('text=Nenhum ETP encontrado');
      await expect(emptyState).toBeVisible({ timeout: 3000 });

      // "Criar ETP" button should be present
      const createButton = page.locator(
        'button:has-text("Criar ETP"), a:has-text("Criar ETP")',
      );
      await expect(createButton.first()).toBeVisible();

      console.log('Empty state displayed correctly after all ETPs deleted');
    } else {
      // List still has other ETPs, just verify our ETP is gone
      await expect(etpCard).not.toBeVisible();
      console.log(
        `ETP deleted. List still has ${initialCount - 1} other ETPs.`,
      );
    }
  });

  /**
   * Test: Dismiss toast without undo still deletes after timeout
   *
   * @acceptance-criteria
   * - Click "Excluir" on an ETP
   * - Click X to dismiss the toast (not Desfazer)
   * - ETP is still deleted after timeout
   */
  test('should still delete ETP when toast is dismissed via X button', async ({
    page,
  }) => {
    // Create an ETP for testing via API
    const title = `Dismiss Test ${Date.now()}`;
    const etpId = await createETP(page, title, 'Test description');

    // Navigate to ETP list
    await navigateToETPs(page);
    await page.waitForLoadState('networkidle');

    // Wait for ETP card to be visible
    const etpCard = page.locator(`[data-testid="etp-card-${etpId}"]`);
    await expect(etpCard).toBeVisible({ timeout: 5000 });

    // Click delete
    await clickDeleteForETP(page, etpId);

    // Undo toast should appear
    const undoToast = page.locator('[role="alert"]');
    await expect(undoToast).toBeVisible({ timeout: 2000 });

    // Click X button to dismiss toast
    const dismissButton = undoToast.locator(
      'button[aria-label="Fechar notificação"]',
    );
    await dismissButton.click();

    // Toast should disappear
    await expect(undoToast).not.toBeVisible({ timeout: 2000 });

    // ETP should still be hidden (delete is pending)
    await expect(etpCard).not.toBeVisible();

    // Wait for timeout to complete
    await page.waitForTimeout(TEST_CONFIG.timeouts.undoWindow);

    // Refresh to verify permanent deletion
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ETP should be permanently deleted
    await expect(etpCard).not.toBeVisible({
      timeout: 3000,
    });

    console.log('ETP deleted after toast was dismissed via X button');
  });
});
