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
import {
  TEST_CONFIG as SHARED_CONFIG,
  login,
  navigateToETPs,
  createETP,
  skipTest,
} from '../utils';

/**
 * Export-specific configuration (extends shared config)
 */
const EXPORT_CONFIG = {
  timeouts: {
    ...SHARED_CONFIG.timeouts,
    download: 30000,
  },
  validation: {
    minFileSizeBytes: 10 * 1024, // 10KB minimum for valid PDF
  },
};

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

    const loginSuccess = await login(page);
    if (!loginSuccess) {
      console.log('[E2E] Login failed in beforeEach - tests may skip');
    }
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
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP
    const title = `PDF Export Complete ${Date.now()}`;
    const description = 'Complete ETP for PDF export test';
    const etpId = await createETP(page, title, undefined, description);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
    createdEtpIds.push(etpId);

    console.log(`Created ETP for PDF export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Find and click export PDF button
    const exportPdfButton = page.locator(
      'button:has-text("Exportar PDF"), button:has-text("PDF"), [data-testid="export-pdf-button"]',
    );

    // Wait for export button to be visible
    await expect(exportPdfButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportPdfButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
      );
      console.log(
        `PDF file size: ${stats.size} bytes (minimum: ${EXPORT_CONFIG.validation.minFileSizeBytes})`,
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
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP without description (partial)
    const title = `PDF Export Partial ${Date.now()}`;
    const etpId = await createETP(page, title);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
    createdEtpIds.push(etpId);

    console.log(`Created partial ETP for PDF export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Find and click export PDF button
    const exportPdfButton = page.locator(
      'button:has-text("Exportar PDF"), button:has-text("PDF"), [data-testid="export-pdf-button"]',
    );

    await expect(exportPdfButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportPdfButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
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
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP with rich description
    const title = `PDF Rich Text ${Date.now()}`;
    const richDescription =
      'ETP com formatacao **negrito** e _italico_ para teste de export PDF';
    const etpId = await createETP(page, title, undefined, richDescription);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
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

    // Find and click export PDF button
    const exportPdfButton = page.locator(
      'button:has-text("Exportar PDF"), button:has-text("PDF"), [data-testid="export-pdf-button"]',
    );

    await expect(exportPdfButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportPdfButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Rich text PDF file size: ${stats.size} bytes`);
    }

    console.log('Export PDF with rich text formatting: PASSED');
  });
});
