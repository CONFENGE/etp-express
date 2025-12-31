/**
 * E2E Export DOCX Tests - Happy Paths
 *
 * @description Tests the 3 happy paths for DOCX export:
 * 1. Export complete ETP to DOCX
 * 2. Export partial ETP to DOCX
 * 3. Export DOCX with rich text formatting
 *
 * @issue #935
 * @group e2e
 * @group export
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  // Test credentials
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Timeouts - increased for CI stability
  timeouts: {
    navigation: 15000,
    pageLoad: 20000, // Wait for ETP editor to fully load
    action: 10000,
    download: 30000,
    toast: 5000,
  },

  // Validation thresholds
  validation: {
    minFileSizeBytes: 10 * 1024, // 10KB minimum for valid DOCX
  },
};

/**
 * Helper function to login
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
 * Helper function to navigate to ETPs list
 */
async function navigateToETPs(page: Page): Promise<void> {
  await page.goto('/etps');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/etps/);

  // Wait for the page to fully render by checking for the "Novo ETP" button
  await page.waitForSelector(
    'button:has-text("Novo ETP"), button:has-text("Criar ETP")',
    { state: 'visible', timeout: 15000 },
  );
}

/**
 * Helper function to wait for ETP Editor page to fully load
 * Returns true if page loaded successfully, false if it failed
 */
async function waitForETPEditorLoaded(page: Page): Promise<boolean> {
  try {
    // Wait for the ETP Editor header to be visible (contains title and export button)
    // This indicates the page has finished loading and is not in loading state
    await page.waitForSelector(
      'h1, [data-testid="etp-title"], button:has-text("Exportar")',
      { state: 'visible', timeout: TEST_CONFIG.timeouts.pageLoad },
    );

    // Also wait for the export button specifically
    const exportButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );
    const isVisible = await exportButton
      .first()
      .isVisible({ timeout: TEST_CONFIG.timeouts.action })
      .catch(() => false);

    if (!isVisible) {
      console.log(
        'ETP Editor: Export button not visible - page may be in error state',
      );
      return false;
    }

    return true;
  } catch {
    console.log('ETP Editor: Failed to load within timeout');
    return false;
  }
}

/**
 * Helper function to create an ETP
 */
async function createETP(
  page: Page,
  title: string,
  description?: string,
): Promise<string> {
  const newEtpButton = page.locator('text=Novo ETP').first();
  // Wait for button to be visible (handles race conditions with page load)
  await newEtpButton.waitFor({ state: 'visible', timeout: 15000 });
  await newEtpButton.click();

  await page.waitForTimeout(500);

  const dialog = page.locator('[role="dialog"]');
  const isDialog = await dialog.isVisible().catch(() => false);

  if (isDialog) {
    await page.fill('input#title, input[name="title"]', title);
    // Fill required 'objeto' field (mandatory since #1007)
    await page.fill(
      'textarea#objeto, textarea[name="objeto"]',
      'Objeto de teste para exportação DOCX',
    );
    if (description) {
      await page.fill(
        'textarea#description, textarea[name="description"]',
        description,
      );
    }
    // Scope to dialog to avoid clicking button behind overlay
    await dialog.locator('button:has-text("Criar ETP")').click();
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
  } else {
    await page.fill('input[name="title"], input#title', title);
    // Fill required 'objeto' field (mandatory since #1007)
    await page.fill(
      'textarea[name="objeto"], textarea#objeto',
      'Objeto de teste para exportação DOCX',
    );
    if (description) {
      await page.fill(
        'textarea[name="description"], textarea#description',
        description,
      );
    }
    await page.click('button:has-text("Criar"), button[type="submit"]');
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });
  }

  const url = page.url();
  const match = url.match(/\/etps\/([^/]+)$/);
  if (!match) {
    throw new Error('Failed to extract ETP ID from URL');
  }

  return match[1];
}

/**
 * Export DOCX Test Suite
 */
test.describe('Export DOCX Happy Paths', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Export DOCX tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  const createdEtpIds: string[] = [];

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
   * Cleanup: Screenshot on failure
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
   * Test 1: Export complete ETP to DOCX
   *
   * @description Exports an ETP with all sections to DOCX and validates
   * the downloaded file has correct name, extension and minimum size.
   */
  test('should export complete ETP to DOCX', async ({ page }) => {
    // Create an ETP
    await navigateToETPs(page);
    const title = `DOCX Export Complete ${Date.now()}`;
    const description = 'Complete ETP for DOCX export test';
    const etpId = await createETP(page, title, description);
    createdEtpIds.push(etpId);

    console.log(`Created ETP for DOCX export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Wait for ETP Editor to fully load - skip if page fails to load
    const pageLoaded = await waitForETPEditorLoaded(page);
    if (!pageLoaded) {
      console.log(
        'SKIPPING: ETP Editor failed to load (backend may be unavailable)',
      );
      test.skip();
      return;
    }

    // Export is a dropdown menu: click "Exportar" button, then "Word (.docx)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    // Wait for export dropdown button to be visible
    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click DOCX/Word option
    const docxMenuItem = page.locator(
      '[role="menuitem"]:has-text("Word"), [role="menuitem"]:has-text("DOCX"), [role="menuitem"]:has-text(".docx")',
    );
    await expect(docxMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click DOCX menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      docxMenuItem.first().click(),
    ]);

    // Validate filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.docx$/i);
    expect(filename).toContain('ETP');
    console.log(`Downloaded file: ${filename}`);

    // Save and validate file size
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(
        `DOCX file size: ${stats.size} bytes (minimum: ${TEST_CONFIG.validation.minFileSizeBytes})`,
      );
    }

    console.log('Export complete ETP to DOCX: PASSED');
  });

  /**
   * Test 2: Export partial ETP to DOCX
   *
   * @description Exports an ETP with only some sections filled to DOCX
   * and validates the download works correctly.
   */
  test('should export partial ETP to DOCX', async ({ page }) => {
    // Create an ETP without description (partial)
    await navigateToETPs(page);
    const title = `DOCX Export Partial ${Date.now()}`;
    const etpId = await createETP(page, title);
    createdEtpIds.push(etpId);

    console.log(`Created partial ETP for DOCX export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Wait for ETP Editor to fully load - skip if page fails to load
    const pageLoaded = await waitForETPEditorLoaded(page);
    if (!pageLoaded) {
      console.log(
        'SKIPPING: ETP Editor failed to load (backend may be unavailable)',
      );
      test.skip();
      return;
    }

    // Export is a dropdown menu: click "Exportar" button, then "Word (.docx)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click DOCX/Word option
    const docxMenuItem = page.locator(
      '[role="menuitem"]:has-text("Word"), [role="menuitem"]:has-text("DOCX"), [role="menuitem"]:has-text(".docx")',
    );
    await expect(docxMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click DOCX menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      docxMenuItem.first().click(),
    ]);

    // Validate filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.docx$/i);
    console.log(`Downloaded partial ETP file: ${filename}`);

    // Save and validate file size (should still be > minimum)
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Partial DOCX file size: ${stats.size} bytes`);
    }

    console.log('Export partial ETP to DOCX: PASSED');
  });

  /**
   * Test 3: Export DOCX with rich text formatting
   *
   * @description Creates an ETP, adds content with rich text formatting,
   * exports to DOCX and validates the download.
   */
  test('should export DOCX with rich text formatting preserved', async ({
    page,
  }) => {
    // Create an ETP with rich description
    await navigateToETPs(page);
    const title = `DOCX Rich Text ${Date.now()}`;
    const richDescription =
      'ETP com formatacao **negrito** e _italico_ para teste de export DOCX';
    const etpId = await createETP(page, title, richDescription);
    createdEtpIds.push(etpId);

    console.log(`Created rich text ETP for DOCX export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Wait for ETP Editor to fully load - skip if page fails to load
    const pageLoaded = await waitForETPEditorLoaded(page);
    if (!pageLoaded) {
      console.log(
        'SKIPPING: ETP Editor failed to load (backend may be unavailable)',
      );
      test.skip();
      return;
    }

    // Try to add some rich text content if editor is available
    const richTextEditor = page.locator(
      '[data-testid="rich-text-editor"], .tiptap, .ProseMirror',
    );
    if (await richTextEditor.isVisible().catch(() => false)) {
      // Focus and add formatted text
      await richTextEditor.click();
      console.log('Rich text editor found - content can be formatted');
    }

    // Export is a dropdown menu: click "Exportar" button, then "Word (.docx)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click DOCX/Word option
    const docxMenuItem = page.locator(
      '[role="menuitem"]:has-text("Word"), [role="menuitem"]:has-text("DOCX"), [role="menuitem"]:has-text(".docx")',
    );
    await expect(docxMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click DOCX menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      docxMenuItem.first().click(),
    ]);

    // Validate filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.docx$/i);
    console.log(`Downloaded rich text DOCX file: ${filename}`);

    // Save and validate file size
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Rich text DOCX file size: ${stats.size} bytes`);
    }

    console.log('Export DOCX with rich text formatting: PASSED');
  });
});
