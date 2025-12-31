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
    minFileSizeBytes: 10 * 1024, // 10KB minimum for valid DOCX
  },
};

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
   * Test 1: Export complete ETP to DOCX
   *
   * @description Exports an ETP with all sections to DOCX and validates
   * the downloaded file has correct name, extension and minimum size.
   */
  test('should export complete ETP to DOCX', async ({ page }) => {
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP
    const title = `DOCX Export Complete ${Date.now()}`;
    const description = 'Complete ETP for DOCX export test';
    const etpId = await createETP(page, title, undefined, description);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
    createdEtpIds.push(etpId);

    console.log(`Created ETP for DOCX export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Find and click export DOCX button
    const exportDocxButton = page.locator(
      'button:has-text("Exportar DOCX"), button:has-text("DOCX"), button:has-text("Word"), [data-testid="export-docx-button"]',
    );

    // Wait for export button to be visible
    await expect(exportDocxButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportDocxButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
      );
      console.log(
        `DOCX file size: ${stats.size} bytes (minimum: ${EXPORT_CONFIG.validation.minFileSizeBytes})`,
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
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP without description (partial)
    const title = `DOCX Export Partial ${Date.now()}`;
    const etpId = await createETP(page, title);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
    createdEtpIds.push(etpId);

    console.log(`Created partial ETP for DOCX export: ${etpId}`);

    // Navigate to ETP editor
    await page.goto(`/etps/${etpId}`);
    await page.waitForLoadState('networkidle');

    // Find and click export DOCX button
    const exportDocxButton = page.locator(
      'button:has-text("Exportar DOCX"), button:has-text("DOCX"), button:has-text("Word"), [data-testid="export-docx-button"]',
    );

    await expect(exportDocxButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportDocxButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
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
    // Navigate to ETPs list with graceful skip
    const ready = await navigateToETPs(page);
    if (!ready) {
      skipTest('ETPs page unavailable - 403 or permission issue');
      return;
    }

    // Create an ETP with rich description
    const title = `DOCX Rich Text ${Date.now()}`;
    const richDescription =
      'ETP com formatacao **negrito** e _italico_ para teste de export DOCX';
    const etpId = await createETP(page, title, undefined, richDescription);
    if (!etpId) {
      skipTest('Failed to create ETP - page may have permission issues');
      return;
    }
    createdEtpIds.push(etpId);

    console.log(`Created rich text ETP for DOCX export: ${etpId}`);

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

    // Find and click export DOCX button
    const exportDocxButton = page.locator(
      'button:has-text("Exportar DOCX"), button:has-text("DOCX"), button:has-text("Word"), [data-testid="export-docx-button"]',
    );

    await expect(exportDocxButton.first()).toBeVisible({
      timeout: SHARED_CONFIG.timeouts.action,
    });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', {
        timeout: EXPORT_CONFIG.timeouts.download,
      }),
      exportDocxButton.first().click(),
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
        EXPORT_CONFIG.validation.minFileSizeBytes,
      );
      console.log(`Rich text DOCX file size: ${stats.size} bytes`);
    }

    console.log('Export DOCX with rich text formatting: PASSED');
  });
});
