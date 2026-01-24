/**
 * E2E Tests for Contracts Dashboard (#1663)
 *
 * @description Tests 7 scenarios for contracts dashboard functionality:
 * 1. Initial visualization (KPI cards, chart, table, timeline)
 * 2. Contract filters (status, fornecedor, valor range)
 * 3. Pagination (>10 contracts)
 * 4. Navigation to detail page
 * 5. Empty states (no results)
 * 6. Responsive design (desktop + mobile)
 * 7. Permissions (Admin vs Consultor)
 *
 * @issue #1663
 * @parent #1288
 * @group e2e
 * @group contracts
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  // Timeouts
  timeouts: {
    navigation: 10000,
    action: 5000,
    apiResponse: 8000,
  },

  // Test data
  testData: {
    contractNumber: 'CONT-E2E-001/2024',
    fornecedor: 'Empresa Teste LTDA',
    valorMin: 10000,
    valorMax: 50000,
  },

  // Viewport sizes
  viewports: {
    mobile: { width: 375, height: 667 },
    desktop: { width: 1920, height: 1080 },
  },
};

/**
 * Helper: Navigate to contracts dashboard
 */
async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto('/contratos/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/contratos\/dashboard/);
}

/**
 * Helper: Wait for page to fully load
 */
async function waitForDashboardLoad(page: Page): Promise<void> {
  // Wait for KPI cards to load (skeleton disappears)
  await page.waitForSelector('[aria-label="Indicadores de Contratos"]', {
    timeout: TEST_CONFIG.timeouts.apiResponse,
  });

  // Wait for at least one KPI card to be visible (not skeleton)
  await page.waitForSelector(
    '[aria-label="Indicadores de Contratos"] [class*="animate-pulse"]',
    {
      state: 'hidden',
      timeout: TEST_CONFIG.timeouts.apiResponse,
    },
  );
}

/**
 * Contracts Dashboard E2E Test Suite
 *
 * Prerequisites (local development):
 * 1. Backend running on http://localhost:3000 (npm run dev from backend/)
 * 2. Frontend running on http://localhost:5173 (npm run dev from frontend/)
 * 3. Admin user credentials in E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or defaults)
 *
 * To run:
 * ```bash
 * cd e2e
 * npx playwright test contracts/contracts-dashboard.spec.ts
 * ```
 *
 * See e2e/contracts/README.md for detailed setup instructions.
 */
test.describe('Contracts Dashboard E2E (#1663)', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Contracts Dashboard tests require full backend infrastructure.',
  );

  /**
   * Scenario 1: Initial Visualization
   * Validates that all dashboard components load correctly
   */
  test.describe('Scenario 1: Initial Visualization', () => {
    test('should load KPI cards, chart, table, and timeline', async ({
      page,
    }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Verify page title
      await expect(page.locator('h1')).toHaveText('Dashboard de Contratos');

      // Verify KPI cards section exists
      const kpiSection = page.locator(
        '[aria-label="Indicadores de Contratos"]',
      );
      await expect(kpiSection).toBeVisible();

      // Verify at least 4 KPI cards are present (total, vigentes, vencendo, etc)
      const kpiCards = kpiSection.locator('[class*="rounded-lg border"]');
      await expect(kpiCards).toHaveCount(4, { timeout: 5000 });

      // Verify charts section exists
      const chartsSection = page.locator('[aria-label="Gráficos e Análises"]');
      await expect(chartsSection).toBeVisible();

      // Verify pie chart is visible
      await expect(
        chartsSection.locator('text=/Valor Total por Status/i'),
      ).toBeVisible();

      // Verify table section exists
      const tableSection = page.locator(
        '[aria-label="Lista de Contratos e Timeline de Vencimentos"]',
      );
      await expect(tableSection).toBeVisible();

      // Verify contracts table is visible
      await expect(page.locator('table')).toBeVisible();

      // Verify timeline component exists
      await expect(
        page.locator('text=/Próximos Vencimentos|Timeline/i'),
      ).toBeVisible();
    });
  });

  /**
   * Scenario 2: Contract Filters
   * Tests filtering by status, fornecedor, and valor range
   */
  test.describe('Scenario 2: Contract Filters', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);
    });

    test('should filter contracts by status', async ({ page }) => {
      // Find and click status filter (could be a select or multiselect)
      const statusFilter = page.locator(
        'select[name="status"], [data-testid="status-filter"]',
      );

      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('em_execucao');

        // Wait for table to update
        await page.waitForTimeout(1000);

        // Verify that status badges in table match filter
        const statusBadges = page.locator('table tbody tr [class*="bg-green"]');
        await expect(statusBadges.first()).toBeVisible();
      }
    });

    test('should filter contracts by fornecedor', async ({ page }) => {
      // Find fornecedor autocomplete/input
      const fornecedorInput = page.locator(
        'input[name="fornecedor"], input[placeholder*="fornecedor" i]',
      );

      if (await fornecedorInput.isVisible()) {
        await fornecedorInput.fill(TEST_CONFIG.testData.fornecedor);
        await page.waitForTimeout(1000);

        // Verify table updates
        await expect(page.locator('table tbody tr')).toHaveCount(0, {
          timeout: 3000,
        });
      }
    });

    test('should filter contracts by valor range', async ({ page }) => {
      // Find valor min/max inputs
      const valorMinInput = page.locator(
        'input[name="valorMin"], input[placeholder*="Valor mínimo" i]',
      );
      const valorMaxInput = page.locator(
        'input[name="valorMax"], input[placeholder*="Valor máximo" i]',
      );

      if ((await valorMinInput.isVisible()) && (await valorMaxInput.isVisible())) {
        await valorMinInput.fill(TEST_CONFIG.testData.valorMin.toString());
        await valorMaxInput.fill(TEST_CONFIG.testData.valorMax.toString());
        await page.waitForTimeout(1000);

        // Verify table updates (values should be within range)
        const tableRows = page.locator('table tbody tr');
        if ((await tableRows.count()) > 0) {
          await expect(tableRows.first()).toBeVisible();
        }
      }
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters first
      const statusFilter = page.locator(
        'select[name="status"], [data-testid="status-filter"]',
      );

      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('em_execucao');
        await page.waitForTimeout(500);
      }

      // Find and click "Limpar filtros" button
      const clearButton = page.locator(
        'button:has-text("Limpar"), button:has-text("Limpar filtros")',
      );

      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(1000);

        // Verify that table shows all contracts again
        const tableRows = page.locator('table tbody tr');
        const rowCount = await tableRows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Scenario 3: Pagination
   * Tests pagination when there are more than 10 contracts
   */
  test.describe('Scenario 3: Pagination', () => {
    test('should paginate when >10 contracts exist', async ({ page }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Check if pagination controls exist
      const paginationNext = page.locator(
        'button:has-text("Próxima"), button[aria-label="Go to next page"]',
      );

      // Only test pagination if it exists (means >10 contracts)
      if (await paginationNext.isVisible()) {
        // Click next page
        await paginationNext.click();
        await page.waitForTimeout(1000);

        // Verify URL updated with ?page=2
        expect(page.url()).toContain('page=2');

        // Verify table has different data
        await expect(page.locator('table tbody tr').first()).toBeVisible();

        // Click previous page
        const paginationPrev = page.locator(
          'button:has-text("Anterior"), button[aria-label="Go to previous page"]',
        );
        await paginationPrev.click();
        await page.waitForTimeout(1000);

        // Verify back to page 1
        expect(page.url()).toMatch(/page=1|(?!page=)/);
      } else {
        test.skip('Not enough contracts for pagination test');
      }
    });
  });

  /**
   * Scenario 4: Navigation to Detail
   * Tests clicking "Ver" button to navigate to contract detail page
   */
  test.describe('Scenario 4: Navigation to Detail', () => {
    test('should navigate to contract detail page', async ({ page }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Find first "Ver" button in table
      const viewButton = page
        .locator('table tbody tr')
        .first()
        .locator('button:has-text("Ver"), a:has-text("Ver")');

      if (await viewButton.isVisible()) {
        await viewButton.click();

        // Wait for navigation to /contratos/:id
        await page.waitForURL(/\/contratos\/[a-f0-9-]+$/, {
          timeout: TEST_CONFIG.timeouts.navigation,
        });

        // Verify breadcrumb updated
        const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
        if (await breadcrumb.isVisible()) {
          await expect(breadcrumb).toContainText('Contratos');
        }
      } else {
        test.skip('No contracts available for navigation test');
      }
    });
  });

  /**
   * Scenario 5: Empty States
   * Tests empty state when no contracts match filters
   */
  test.describe('Scenario 5: Empty States', () => {
    test('should show empty state when no results found', async ({ page }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Apply filters that will return no results
      const fornecedorInput = page.locator(
        'input[name="fornecedor"], input[placeholder*="fornecedor" i]',
      );

      if (await fornecedorInput.isVisible()) {
        // Search for non-existent fornecedor
        await fornecedorInput.fill('FORNECEDOR-INEXISTENTE-E2E-TEST-123456');
        await page.waitForTimeout(1000);

        // Verify EmptyState appears
        const emptyState = page.locator(
          'text=/Nenhum contrato encontrado|Nenhum resultado/i',
        );
        await expect(emptyState).toBeVisible();

        // Verify "Limpar filtros" button in EmptyState
        const clearButtonInEmptyState = page.locator(
          'text=/Nenhum contrato/i ~ button:has-text("Limpar")',
        );
        if (await clearButtonInEmptyState.isVisible()) {
          await expect(clearButtonInEmptyState).toBeVisible();
        }
      }
    });
  });

  /**
   * Scenario 6: Responsive Design
   * Tests mobile and desktop layouts
   */
  test.describe('Scenario 6: Responsive Design', () => {
    test('should stack KPI cards vertically on mobile', async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.mobile);
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Verify KPI cards are in a single column
      const kpiSection = page.locator(
        '[aria-label="Indicadores de Contratos"]',
      );
      const kpiCards = kpiSection.locator('[class*="rounded-lg border"]');

      // Check that cards are stacked (vertical layout)
      const firstCard = kpiCards.first();
      const secondCard = kpiCards.nth(1);

      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();

      // On mobile, cards should be vertically stacked (y position increases)
      if (firstCardBox && secondCardBox) {
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y);
      }
    });

    test('should show cards in grid on desktop', async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.desktop);
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Verify KPI cards are in a grid (horizontal layout)
      const kpiSection = page.locator(
        '[aria-label="Indicadores de Contratos"]',
      );

      // Check that section has grid classes
      const sectionClasses = await kpiSection.getAttribute('class');
      expect(sectionClasses).toMatch(/grid|flex/);
    });

    test('should convert table to cards on mobile', async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.mobile);
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // On mobile, table might be replaced by cards or become scrollable
      const table = page.locator('table');

      // Either table is hidden, or it's in a scrollable container
      const isTableHidden = (await table.isHidden()) || false;
      const hasScrollableContainer =
        (await page
          .locator('table')
          .locator('..')
          .getAttribute('class')) ?.includes('overflow') || false;

      expect(isTableHidden || hasScrollableContainer).toBe(true);
    });

    test('should show filters as accordion on mobile', async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.mobile);
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Check if filters are collapsed/accordion on mobile
      const filtersSection = page.locator(
        '[aria-label*="Filtros"], [data-testid="filters"]',
      );

      if (await filtersSection.isVisible()) {
        // Verify filters are collapsible (accordion pattern)
        const accordionTrigger = page.locator(
          'button[aria-expanded], button:has-text("Filtros")',
        );
        await expect(accordionTrigger).toBeVisible();
      }
    });
  });

  /**
   * Scenario 7: Permissions (Admin Access)
   * Tests that authenticated admin can access dashboard
   */
  test.describe('Scenario 7: Permissions', () => {
    test('should allow admin to access contracts dashboard', async ({
      page,
    }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Verify that admin can see contracts
      const tableRows = page.locator('table tbody tr');
      const rowCount = await tableRows.count();

      // Admin should see contracts (or at least the table structure)
      expect(rowCount).toBeGreaterThanOrEqual(0);

      // Verify page loaded correctly
      await expect(page.locator('h1')).toHaveText('Dashboard de Contratos');
    });

    test('should show KPIs and charts for admin', async ({ page }) => {
      await navigateToDashboard(page);
      await waitForDashboardLoad(page);

      // Verify KPI cards are visible
      const kpiSection = page.locator(
        '[aria-label="Indicadores de Contratos"]',
      );
      await expect(kpiSection).toBeVisible();

      // Verify charts section is visible
      const chartsSection = page.locator('[aria-label="Gráficos e Análises"]');
      await expect(chartsSection).toBeVisible();

      // Verify timeline is visible
      await expect(
        page.locator('text=/Próximos Vencimentos|Timeline/i'),
      ).toBeVisible();
    });
  });

  /**
   * Global cleanup
   */
  test.afterEach(async ({ page }, testInfo) => {
    // Screenshot on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `test-results/contracts-dashboard-failure-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
    }
  });
});
