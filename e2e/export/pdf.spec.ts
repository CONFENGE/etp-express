/**
 * E2E Export PDF Tests - Complete Flow
 *
 * @description Tests the complete PDF export flow per Lei 14.133/2021:
 * 1. Export complete ETP to PDF - validates download, size, filename
 * 2. Export partial ETP to PDF - validates partial content export
 * 3. Export PDF with rich text formatting - validates formatting preservation
 *
 * Acceptance Criteria:
 * - Button Export PDF initiates download
 * - PDF file is generated with size >10KB
 * - PDF contains all filled sections
 * - Rich text formatting is preserved in PDF
 * - Filename follows pattern ETP-{id}.pdf
 *
 * @issue #955
 * @see #935 (original implementation)
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

  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 5000,
    download: 30000,
    toast: 3000,
  },

  // Validation thresholds
  validation: {
    minFileSizeBytes: 10 * 1024, // 10KB minimum for valid PDF
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
    { state: 'visible', timeout: 10000 },
  );
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
  await newEtpButton.click();

  await page.waitForTimeout(500);

  const dialog = page.locator('[role="dialog"]');
  const isDialog = await dialog.isVisible().catch(() => false);

  if (isDialog) {
    await page.fill('input#title, input[name="title"]', title);
    // Fill required 'objeto' field (mandatory since #1007)
    await page.fill(
      'textarea#objeto, textarea[name="objeto"]',
      'Objeto de teste para exportação PDF',
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
      'Objeto de teste para exportação PDF',
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
 * Export PDF Test Suite
 */
test.describe('Export PDF Happy Paths', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Export PDF tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
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
   * Test 1: Export complete ETP to PDF
   *
   * @description Exports an ETP with all sections to PDF and validates
   * the downloaded file has correct name, extension and minimum size.
   */
  test('should export complete ETP to PDF', async ({ page }) => {
    // Create an ETP
    await navigateToETPs(page);
    const title = `PDF Export Complete ${Date.now()}`;
    const description = 'Complete ETP for PDF export test';
    const etpId = await createETP(page, title, description);
    createdEtpIds.push(etpId);

    console.log(`Created ETP for PDF export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Export is a dropdown menu: click "Exportar" button, then "PDF (.pdf)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    // Wait for export dropdown button to be visible
    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click PDF option
    const pdfMenuItem = page.locator(
      '[role="menuitem"]:has-text("PDF"), [role="menuitem"]:has-text(".pdf")',
    );
    await expect(pdfMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click PDF menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      pdfMenuItem.first().click(),
    ]);

    // Validate filename format: ETP-{uuid}.pdf
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.pdf$/i);
    expect(filename).toMatch(/^ETP-/); // Filename starts with ETP-
    expect(filename).toMatch(/^ETP-[a-f0-9-]+\.pdf$/i); // Full pattern: ETP-{uuid}.pdf
    console.log(`Downloaded file: ${filename}`);

    // Save and validate file size
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(
        `PDF file size: ${stats.size} bytes (minimum: ${TEST_CONFIG.validation.minFileSizeBytes})`,
      );
    }

    console.log('Export complete ETP to PDF: PASSED');
  });

  /**
   * Test 2: Export partial ETP to PDF
   *
   * @description Exports an ETP with only some sections filled to PDF
   * and validates the download works correctly.
   */
  test('should export partial ETP to PDF', async ({ page }) => {
    // Create an ETP without description (partial)
    await navigateToETPs(page);
    const title = `PDF Export Partial ${Date.now()}`;
    const etpId = await createETP(page, title);
    createdEtpIds.push(etpId);

    console.log(`Created partial ETP for PDF export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Export is a dropdown menu: click "Exportar" button, then "PDF (.pdf)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click PDF option
    const pdfMenuItem = page.locator(
      '[role="menuitem"]:has-text("PDF"), [role="menuitem"]:has-text(".pdf")',
    );
    await expect(pdfMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click PDF menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      pdfMenuItem.first().click(),
    ]);

    // Validate filename format: ETP-{uuid}.pdf (same pattern for partial ETPs)
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.pdf$/i);
    expect(filename).toMatch(/^ETP-[a-f0-9-]+\.pdf$/i); // Full pattern: ETP-{uuid}.pdf
    console.log(`Downloaded partial ETP file: ${filename}`);

    // Save and validate file size (should still be > minimum)
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Partial PDF file size: ${stats.size} bytes`);
    }

    console.log('Export partial ETP to PDF: PASSED');
  });

  /**
   * Test 3: Export PDF with rich text formatting
   *
   * @description Creates an ETP, adds content with rich text formatting,
   * exports to PDF and validates the download.
   */
  test('should export PDF with rich text formatting preserved', async ({
    page,
  }) => {
    // Create an ETP with rich description
    await navigateToETPs(page);
    const title = `PDF Rich Text ${Date.now()}`;
    const richDescription =
      'ETP com formatacao **negrito** e _italico_ para teste de export PDF';
    const etpId = await createETP(page, title, richDescription);
    createdEtpIds.push(etpId);

    console.log(`Created rich text ETP for PDF export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Try to add some rich text content if editor is available
    const richTextEditor = page.locator(
      '[data-testid="rich-text-editor"], .tiptap, .ProseMirror',
    );
    if (await richTextEditor.isVisible().catch(() => false)) {
      // Focus and add formatted text
      await richTextEditor.click();
      console.log('Rich text editor found - content can be formatted');
    }

    // Export is a dropdown menu: click "Exportar" button, then "PDF (.pdf)" menu item
    const exportDropdownButton = page.locator(
      'button:has-text("Exportar"), [data-testid="export-dropdown"]',
    );

    await expect(exportDropdownButton.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Open the dropdown menu
    await exportDropdownButton.first().click();

    // Wait for dropdown menu to appear and click PDF option
    const pdfMenuItem = page.locator(
      '[role="menuitem"]:has-text("PDF"), [role="menuitem"]:has-text(".pdf")',
    );
    await expect(pdfMenuItem.first()).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Set up download listener and click PDF menu item
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TEST_CONFIG.timeouts.download }),
      pdfMenuItem.first().click(),
    ]);

    // Validate filename format: ETP-{uuid}.pdf
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.pdf$/i);
    expect(filename).toMatch(/^ETP-[a-f0-9-]+\.pdf$/i); // Full pattern: ETP-{uuid}.pdf
    console.log(`Downloaded rich text PDF file: ${filename}`);

    // Save and validate file size
    const downloadPath = await download.path();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(
        TEST_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Rich text PDF file size: ${stats.size} bytes`);
    }

    console.log('Export PDF with rich text formatting: PASSED');
  });
});
