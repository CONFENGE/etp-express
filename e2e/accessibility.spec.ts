/**
 * E2E Accessibility Tests - WCAG 2.1 AA Compliance
 *
 * @description Testes automatizados de acessibilidade usando Axe-core para validar
 * conformidade WCAG 2.1 AA em todas as páginas principais do ETP Express.
 *
 * @compliance WCAG 2.1 AA, LBI Lei 13.146/2015 (Lei Brasileira de Inclusão)
 * @group e2e
 * @group accessibility
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Páginas a serem testadas para conformidade WCAG 2.1 AA
 */
const pages = [
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/etps', name: 'ETPs List' },
  { path: '/etps/new', name: 'New ETP' },
];

/**
 * Suite de testes de acessibilidade
 */
test.describe('WCAG 2.1 AA Compliance', () => {
  /**
   * Testa cada página para violações WCAG 2.1 AA
   *
   * @description Para cada página da aplicação, executa scan de acessibilidade
   * usando Axe-core com tags WCAG 2.0 Level A/AA e WCAG 2.1 Level A/AA.
   *
   * @wcag-tags wcag2a, wcag2aa, wcag21a, wcag21aa
   */
  for (const page of pages) {
    test(`${page.name} page should be WCAG 2.1 AA compliant`, async ({
      page: playwrightPage,
    }) => {
      // Navigate to page
      await playwrightPage.goto(page.path);

      // Wait for page to be fully loaded
      await playwrightPage.waitForLoadState('networkidle');

      // Run Axe accessibility scan with WCAG 2.1 AA rules
      const accessibilityScanResults = await new AxeBuilder({
        page: playwrightPage,
      })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Detailed reporting if violations are found
      if (accessibilityScanResults.violations.length > 0) {
        console.error(`\n❌ WCAG Violations found on ${page.name} page:`);
        accessibilityScanResults.violations.forEach((violation, index) => {
          console.error(
            `\n  [${index + 1}] ${violation.id} (${violation.impact})`,
          );
          console.error(`      Description: ${violation.description}`);
          console.error(`      Help: ${violation.help}`);
          console.error(`      Help URL: ${violation.helpUrl}`);
          console.error(`      Affected nodes: ${violation.nodes.length}`);

          violation.nodes.forEach((node, nodeIndex) => {
            console.error(`\n      Node ${nodeIndex + 1}:`);
            console.error(`        HTML: ${node.html}`);
            console.error(`        Target: ${node.target.join(' > ')}`);
            console.error(`        Failure summary: ${node.failureSummary}`);
          });
        });
      }

      // Assert no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});

/**
 * Testes específicos de acessibilidade por funcionalidade
 */
test.describe('Accessibility - Specific Features', () => {
  /**
   * Testa navegação por teclado (keyboard navigation)
   *
   * @wcag 2.1.1 Keyboard (Level A)
   */
  test('should allow keyboard navigation on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Focus on email input using Tab
    await page.keyboard.press('Tab');
    const emailFocused = await page.evaluate(() => {
      return (
        document.activeElement?.getAttribute('id') === 'email' ||
        document.activeElement?.getAttribute('name') === 'email'
      );
    });

    // If email is not focused, it might be another element first (e.g., logo, skip link)
    // Continue tabbing to find email field
    if (!emailFocused) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    }

    // Verify we can reach the submit button by tabbing
    await page.keyboard.press('Tab'); // To password field
    await page.keyboard.press('Tab'); // To submit button

    const submitFocused = await page.evaluate(() => {
      const activeElement = document.activeElement as HTMLElement;
      return (
        activeElement?.tagName === 'BUTTON' &&
        activeElement?.getAttribute('type') === 'submit'
      );
    });

    expect(submitFocused).toBe(true);
  });

  /**
   * Testa presença de labels em formulários
   *
   * @wcag 3.3.2 Labels or Instructions (Level A)
   */
  test('should have proper labels on form inputs', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check email input has associated label
    const emailInput = await page
      .locator('input[type="email"], input#email, input[name="email"]')
      .first();
    const emailLabelExists = await emailInput.evaluate((input) => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      return !!(label || ariaLabel || ariaLabelledBy);
    });

    expect(emailLabelExists).toBe(true);

    // Check password input has associated label
    const passwordInput = await page.locator('input[type="password"]').first();
    const passwordLabelExists = await passwordInput.evaluate((input) => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      return !!(label || ariaLabel || ariaLabelledBy);
    });

    expect(passwordLabelExists).toBe(true);
  });

  /**
   * Testa contraste de cores (color contrast)
   *
   * @wcag 1.4.3 Contrast (Minimum) (Level AA)
   *
   * @note Axe-core já verifica contraste no scan principal,
   * mas este teste garante que a regra específica está ativa.
   */
  test('should meet color contrast requirements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const contrastResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['color-contrast'])
      .analyze();

    expect(contrastResults.violations).toEqual([]);
  });

  /**
   * Testa presença de textos alternativos em imagens
   *
   * @wcag 1.1.1 Non-text Content (Level A)
   */
  test('should have alt text on images', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const altTextResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['image-alt'])
      .analyze();

    expect(altTextResults.violations).toEqual([]);
  });

  /**
   * Testa estrutura semântica de headings
   *
   * @wcag 1.3.1 Info and Relationships (Level A)
   * @wcag 2.4.6 Headings and Labels (Level AA)
   */
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const headingResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['heading-order'])
      .analyze();

    expect(headingResults.violations).toEqual([]);
  });

  /**
   * Testa landmarks de ARIA (regiões de página)
   *
   * @wcag 1.3.1 Info and Relationships (Level A)
   * @wcag 2.4.1 Bypass Blocks (Level A)
   */
  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const landmarkResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['region'])
      .analyze();

    expect(landmarkResults.violations).toEqual([]);
  });
});
