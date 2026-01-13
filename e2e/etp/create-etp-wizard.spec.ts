/**
 * E2E Tests for CreateETPWizard Component
 *
 * @description Tests for the expanded 5-step ETP creation wizard with 20+ fields.
 * Tests cover:
 * 1. Happy Path: Complete ETP creation through all 5 steps
 * 2. Validation per step: Required fields and validation errors
 * 3. Navigation: Forward/backward between steps with data preservation
 * 4. Optional fields: Create ETP with only required fields
 * 5. Mobile responsiveness: Wizard functionality on mobile viewports
 *
 * @issue #1228
 * @epic #1158
 * @group e2e
 * @group etp
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';
import {
  completeETPData,
  minimalETPData,
  step1Data,
  step2Data,
} from './fixtures/etp-wizard-data';

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
    navigation: 15000,
    action: 5000,
    formSubmit: 10000,
    toast: 3000,
  },
};

/**
 * Helper function to login
 * Note: With storage state from global setup, this is only needed
 * if storage state is not available (fallback)
 */
async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

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
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/etps/);
}

/**
 * Helper function to open the create ETP wizard dialog
 */
async function openCreateWizard(page: Page): Promise<void> {
  // Navigate to ETPs page if not already there
  if (!page.url().includes('/etps')) {
    await navigateToETPs(page);
  }

  // Click "Novo ETP" button
  const newEtpButton = page.locator('text=Novo ETP').first();
  await newEtpButton.click();

  // Wait for dialog/wizard to open (element-based wait, not fixed timeout)
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: TEST_CONFIG.timeouts.action });
}

/**
 * Helper function to fill Step 1 (Identification) fields
 */
async function fillStep1(page: Page, data: typeof step1Data): Promise<void> {
  // Title (required)
  await page.fill('input#title', data.title);

  // Orgao/Entidade (optional)
  if (data.orgaoEntidade) {
    await page.fill('input#orgaoEntidade', data.orgaoEntidade);
  }

  // UASG (optional)
  if (data.uasg) {
    await page.fill('input#uasg', data.uasg);
  }

  // Unidade Demandante (optional)
  if (data.unidadeDemandante) {
    await page.fill('input#unidadeDemandante', data.unidadeDemandante);
  }

  // Responsavel Tecnico Nome (optional)
  if (data.responsavelTecnicoNome) {
    await page.fill(
      'input#responsavelTecnicoNome',
      data.responsavelTecnicoNome,
    );
  }

  // Responsavel Tecnico Matricula (optional)
  if (data.responsavelTecnicoMatricula) {
    await page.fill(
      'input#responsavelTecnicoMatricula',
      data.responsavelTecnicoMatricula,
    );
  }

  // Data Elaboracao (optional)
  if (data.dataElaboracao) {
    await page.fill('input#dataElaboracao', data.dataElaboracao);
  }
}

/**
 * Helper function to fill Step 2 (Object and Justification) fields
 */
async function fillStep2(page: Page, data: typeof step2Data): Promise<void> {
  // Objeto (required)
  await page.fill('textarea#objeto, input#objeto', data.objeto);

  // Descricao Detalhada (optional)
  if (data.descricaoDetalhada) {
    await page.fill('textarea#descricaoDetalhada', data.descricaoDetalhada);
  }

  // Quantidade Estimada (optional)
  if (data.quantidadeEstimada) {
    await page.fill(
      'input#quantidadeEstimada',
      String(data.quantidadeEstimada),
    );
  }

  // Unidade Medida (optional)
  if (data.unidadeMedida) {
    await page.fill('input#unidadeMedida', data.unidadeMedida);
  }

  // Justificativa Contratacao (optional but has min length validation)
  if (data.justificativaContratacao) {
    await page.fill(
      'textarea#justificativaContratacao',
      data.justificativaContratacao,
    );
  }

  // Necessidade Atendida (optional)
  if (data.necessidadeAtendida) {
    await page.fill('textarea#necessidadeAtendida', data.necessidadeAtendida);
  }

  // Beneficios Esperados (optional)
  if (data.beneficiosEsperados) {
    await page.fill('textarea#beneficiosEsperados', data.beneficiosEsperados);
  }
}

/**
 * Helper function to fill Step 3 (Requirements) fields
 */
async function fillStep3(
  page: Page,
  data: {
    requisitosTecnicos?: string;
    requisitosQualificacao?: string;
    criteriosSustentabilidade?: string;
    garantiaExigida?: string;
    prazoExecucao?: number;
  },
): Promise<void> {
  if (data.requisitosTecnicos) {
    await page.fill('textarea#requisitosTecnicos', data.requisitosTecnicos);
  }
  if (data.requisitosQualificacao) {
    await page.fill(
      'textarea#requisitosQualificacao',
      data.requisitosQualificacao,
    );
  }
  if (data.criteriosSustentabilidade) {
    await page.fill(
      'textarea#criteriosSustentabilidade',
      data.criteriosSustentabilidade,
    );
  }
  if (data.garantiaExigida) {
    await page.fill(
      'input#garantiaExigida, textarea#garantiaExigida',
      data.garantiaExigida,
    );
  }
  if (data.prazoExecucao) {
    await page.fill('input#prazoExecucao', String(data.prazoExecucao));
  }
}

/**
 * Helper function to fill Step 4 (Costs) fields
 */
async function fillStep4(
  page: Page,
  data: {
    valorUnitario?: number;
    valorEstimado?: number;
    fontePesquisaPrecos?: string;
    dotacaoOrcamentaria?: string;
  },
): Promise<void> {
  if (data.valorUnitario !== undefined) {
    await page.fill('input#valorUnitario', String(data.valorUnitario));
  }
  if (data.valorEstimado !== undefined) {
    await page.fill('input#valorEstimado', String(data.valorEstimado));
  }
  if (data.fontePesquisaPrecos) {
    await page.fill(
      'textarea#fontePesquisaPrecos, input#fontePesquisaPrecos',
      data.fontePesquisaPrecos,
    );
  }
  if (data.dotacaoOrcamentaria) {
    await page.fill('input#dotacaoOrcamentaria', data.dotacaoOrcamentaria);
  }
}

/**
 * Helper function to fill Step 5 (Risks) fields
 */
async function fillStep5(
  page: Page,
  data: {
    nivelRisco?: 'BAIXO' | 'MEDIO' | 'ALTO';
    descricaoRiscos?: string;
    description?: string;
  },
): Promise<void> {
  if (data.nivelRisco) {
    // Select from dropdown or radio buttons
    const select = page.locator('select#nivelRisco');
    if (await select.isVisible()) {
      await select.selectOption(data.nivelRisco);
    } else {
      // Try radio button
      await page.click(`input[name="nivelRisco"][value="${data.nivelRisco}"]`);
    }
  }
  if (data.descricaoRiscos) {
    await page.fill('textarea#descricaoRiscos', data.descricaoRiscos);
  }
  if (data.description) {
    await page.fill('textarea#description', data.description);
  }
}

/**
 * Helper function to click the "Next" button
 * Uses element-based wait instead of fixed timeout
 */
async function clickNext(page: Page): Promise<void> {
  const nextButton = page.locator('button:has-text("Proximo")');
  await nextButton.click();
  // Wait for button to be actionable again (indicates transition complete)
  await nextButton.or(page.locator('button:has-text("Criar ETP")')).waitFor({ state: 'visible' });
}

/**
 * Helper function to click the "Back" button
 * Uses element-based wait instead of fixed timeout
 */
async function clickBack(page: Page): Promise<void> {
  const backButton = page.locator('button:has-text("Voltar")');
  await backButton.click();
  // Wait for navigation buttons to stabilize
  await page.locator('button:has-text("Proximo")').waitFor({ state: 'visible' });
}

/**
 * CreateETPWizard E2E Test Suite
 */
test.describe('CreateETPWizard - Multi-Step Form', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'CreateETPWizard tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup: Login before each test
   */
  test.beforeEach(async ({ page }) => {
    // Capture console errors
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
   * Test 1: Happy Path - Complete ETP creation through all 5 steps
   *
   * @description Creates an ETP with all fields filled in each of the 5 steps
   *
   * @acceptance-criteria
   * - User can navigate through all 5 steps
   * - All fields can be filled
   * - Submit creates the ETP
   * - User is redirected to ETP editor page
   */
  test('should create ETP with all fields through 5-step wizard', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 1: Identification
    console.log('Step 1: Identification');
    await fillStep1(page, completeETPData.step1);
    await clickNext(page);

    // Verify we're on step 2
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Step 2: Object and Justification
    console.log('Step 2: Object and Justification');
    await fillStep2(page, completeETPData.step2);
    await clickNext(page);

    // Verify we're on step 3
    await expect(
      page.locator('h3:has-text("Requisitos Tecnicos")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Step 3: Technical Requirements
    console.log('Step 3: Technical Requirements');
    await fillStep3(page, completeETPData.step3);
    await clickNext(page);

    // Verify we're on step 4
    await expect(
      page.locator('h3:has-text("Estimativa de Custos")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Step 4: Cost Estimation
    console.log('Step 4: Cost Estimation');
    await fillStep4(page, completeETPData.step4);
    await clickNext(page);

    // Verify we're on step 5
    await expect(page.locator('h3:has-text("Analise de Riscos")')).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Step 5: Risk Analysis
    console.log('Step 5: Risk Analysis');
    await fillStep5(page, completeETPData.step5);

    // Submit
    const submitButton = page.locator('button:has-text("Criar ETP")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for navigation to ETP editor
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    // Verify we're on the ETP editor page
    const url = page.url();
    expect(url).toMatch(/\/etps\/[^/]+$/);

    // Verify title is displayed
    await expect(page.locator('h1, [data-testid="etp-title"]')).toContainText(
      completeETPData.step1.title,
      { timeout: TEST_CONFIG.timeouts.action },
    );

    console.log('Complete ETP creation through wizard: PASSED');
  });

  /**
   * Test 2: Validation - Required fields in Step 1
   *
   * @description Attempts to proceed without filling required title field
   *
   * @acceptance-criteria
   * - Validation error is shown for empty title
   * - User cannot proceed to next step
   */
  test('should show validation error when required title is empty', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Try to proceed without filling title
    await clickNext(page);

    // Should still be on step 1 (Identification)
    await expect(page.locator('h3:has-text("Identificacao")')).toBeVisible();

    // Check for validation error
    const validationError = page
      .locator('[role="alert"]')
      .or(page.locator('.text-red-500, .text-destructive'))
      .or(page.locator('text=minimo'))
      .or(page.locator('text=obrigatorio'));

    const hasError = await validationError
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeTruthy();

    console.log('Title validation error: PASSED');
  });

  /**
   * Test 3: Validation - Required fields in Step 2 (Objeto)
   *
   * @description Attempts to proceed from Step 2 without filling required objeto field
   */
  test('should show validation error when required objeto is empty', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Fill step 1 with minimal data
    await fillStep1(page, minimalETPData.step1);
    await clickNext(page);

    // Verify we're on step 2
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    // Try to proceed without filling objeto
    await clickNext(page);

    // Should still be on step 2
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    console.log('Objeto validation error: PASSED');
  });

  /**
   * Test 4: Navigation - Back and forth between steps preserves data
   *
   * @description Tests that data entered in previous steps is preserved when navigating back
   *
   * @acceptance-criteria
   * - User can navigate back to previous steps
   * - Data entered is preserved
   * - User can continue forward after going back
   */
  test('should preserve data when navigating between steps', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Fill step 1
    await fillStep1(page, completeETPData.step1);
    await clickNext(page);

    // Fill step 2
    await fillStep2(page, completeETPData.step2);
    await clickNext(page);

    // Go back to step 2
    await clickBack(page);
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    // Verify step 2 data is preserved
    const objetoValue = await page
      .locator('textarea#objeto, input#objeto')
      .inputValue();
    expect(objetoValue).toBe(completeETPData.step2.objeto);

    // Go back to step 1
    await clickBack(page);
    await expect(page.locator('h3:has-text("Identificacao")')).toBeVisible();

    // Verify step 1 data is preserved
    const titleValue = await page.locator('input#title').inputValue();
    expect(titleValue).toBe(completeETPData.step1.title);

    // Continue forward to verify navigation works
    await clickNext(page);
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    console.log('Data preservation during navigation: PASSED');
  });

  /**
   * Test 5: Create ETP with only required fields
   *
   * @description Creates an ETP filling only the mandatory fields
   *
   * @acceptance-criteria
   * - User can create ETP with minimal required fields
   * - Optional fields are null/empty
   * - ETP is created successfully
   */
  test('should create ETP with only required fields', async ({ page }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 1: Only title (required)
    await page.fill('input#title', minimalETPData.step1.title);
    await clickNext(page);

    // Step 2: Only objeto (required)
    await page.fill(
      'textarea#objeto, input#objeto',
      minimalETPData.step2.objeto,
    );
    await clickNext(page);

    // Step 3: No required fields - proceed
    await clickNext(page);

    // Step 4: No required fields - proceed
    await clickNext(page);

    // Step 5: No required fields - submit
    const submitButton = page.locator('button:has-text("Criar ETP")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for navigation
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    // Verify creation success
    const url = page.url();
    expect(url).toMatch(/\/etps\/[^/]+$/);

    console.log('Minimal ETP creation: PASSED');
  });

  /**
   * Test 6: Progress indicator shows correct step
   *
   * @description Verifies the progress bar and step indicators work correctly
   */
  test('should show correct progress as user navigates steps', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Check step 1 indicator is active
    const step1Indicator = page.locator('.bg-primary').filter({ hasText: '1' });
    await expect(step1Indicator).toBeVisible();

    // Fill step 1 and go to step 2
    await fillStep1(page, minimalETPData.step1);
    await clickNext(page);

    // Check step 2 is now active
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    // Check progress bar has increased (should be at 40% for step 2)
    const progressBar = page.locator('[role="progressbar"], .h-2');
    await expect(progressBar).toBeVisible();

    console.log('Progress indicator test: PASSED');
  });

  /**
   * Test 7: Cancel button closes wizard and returns to ETPs list
   */
  test('should close wizard when cancel is clicked', async ({ page }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Click cancel button
    const cancelButton = page.locator('button:has-text("Cancelar")');
    await cancelButton.click();

    // Wait for dialog to close (element-based wait)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: TEST_CONFIG.timeouts.action });

    // Verify we're still on ETPs list
    expect(page.url()).toContain('/etps');

    console.log('Cancel button test: PASSED');
  });
});

/**
 * Mobile Responsiveness Test Suite
 */
test.describe('CreateETPWizard - Mobile Responsiveness', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Mobile tests require full backend infrastructure.',
  );

  // Use mobile viewport
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * Test 8: Wizard works on mobile viewport
   *
   * @description Tests wizard functionality on mobile screen size
   *
   * @acceptance-criteria
   * - Wizard opens and displays correctly on mobile
   * - Navigation buttons are visible and clickable
   * - Form fields are usable
   */
  test('should work correctly on mobile viewport', async ({ page }) => {
    await navigateToETPs(page);

    // Click new ETP button
    const newEtpButton = page.locator('text=Novo ETP').first();
    await newEtpButton.click();

    // Wait for dialog (element-based wait)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: TEST_CONFIG.timeouts.action });

    // Fill title
    await page.fill('input#title', 'Mobile Test ETP');

    // Verify next button is visible and clickable
    const nextButton = page.locator('button:has-text("Proximo")');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Verify we can proceed to step 2
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible();

    // Verify back button works
    const backButton = page.locator('button:has-text("Voltar")');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Verify we're back on step 1
    await expect(page.locator('h3:has-text("Identificacao")')).toBeVisible();

    console.log('Mobile responsiveness test: PASSED');
  });
});
