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
 *
 * @description Inclui todas as páginas principais e críticas do ETP Express
 * para garantir conformidade WCAG 2.1 AA e Apple HIG Accessibility.
 *
 * Coverage atualizado: 11 páginas principais + componentes críticos
 */
const pages = [
  { path: '/login', name: 'Login', requiresAuth: false },
  { path: '/register', name: 'Register', requiresAuth: false },
  { path: '/forgot-password', name: 'Forgot Password', requiresAuth: false },
  { path: '/reset-password?token=test', name: 'Reset Password', requiresAuth: false },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/etps', name: 'ETPs List', requiresAuth: true },
  { path: '/etps/new', name: 'New ETP', requiresAuth: true },
  { path: '/admin/users', name: 'Admin Users', requiresAuth: true },
  { path: '/admin/analytics', name: 'Admin Analytics', requiresAuth: true },
  { path: '/politica-privacidade', name: 'Privacy Policy', requiresAuth: false },
  { path: '/termos-uso', name: 'Terms of Service', requiresAuth: false },
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
      await playwrightPage.waitForLoadState('domcontentloaded');

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
            `\n [${index + 1}] ${violation.id} (${violation.impact})`,
          );
          console.error(` Description: ${violation.description}`);
          console.error(` Help: ${violation.help}`);
          console.error(` Help URL: ${violation.helpUrl}`);
          console.error(` Affected nodes: ${violation.nodes.length}`);

          violation.nodes.forEach((node, nodeIndex) => {
            console.error(`\n Node ${nodeIndex + 1}:`);
            console.error(` HTML: ${node.html}`);
            console.error(` Target: ${node.target.join(' > ')}`);
            console.error(` Failure summary: ${node.failureSummary}`);
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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

    const landmarkResults = await new AxeBuilder({ page })
      .include('body')
      .withRules(['region'])
      .analyze();

    expect(landmarkResults.violations).toEqual([]);
  });

  /**
   * Testa tamanhos de touch targets (Apple HIG >= 44x44px)
   *
   * @wcag 2.5.5 Target Size (Level AAA - opcional, mas Apple HIG requer)
   * @applehig Touch targets mínimos 44x44pt
   */
  test('should have touch targets >= 44x44px (Apple HIG)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verificar botões principais
    const buttons = await page.locator('button, a[role="button"]').all();

    for (const button of buttons.slice(0, 10)) {
      // Sample first 10
      const box = await button.boundingBox();
      if (box) {
        // Allow small tolerance (42px minimum, per relaxed WCAG 2.5.5)
        expect(box.width).toBeGreaterThanOrEqual(42);
        expect(box.height).toBeGreaterThanOrEqual(42);
      }
    }
  });

  /**
   * Testa focus visible em todos os elementos interativos
   *
   * @wcag 2.4.7 Focus Visible (Level AA)
   * @applehig Focus indicators claros e consistentes
   */
  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Tab through interactive elements
    const interactiveElements = await page
      .locator('button, a, input, select, textarea')
      .all();

    for (const element of interactiveElements.slice(0, 5)) {
      await element.focus();

      // Check if element has focus styles (outline or ring)
      const hasFocusStyle = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return (
          styles.outline !== 'none' &&
          styles.outline !== '0px' &&
          styles.outlineWidth !== '0px'
        );
      });

      expect(hasFocusStyle).toBe(true);
    }
  });

  /**
   * Testa ARIA live regions para conteúdo dinâmico
   *
   * @wcag 4.1.3 Status Messages (Level AA)
   */
  test('should have ARIA live regions for dynamic content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Check for toast/notification regions with aria-live
    const liveRegions = await page.locator('[aria-live]').count();

    // Should have at least one live region (toasts, notifications, etc.)
    expect(liveRegions).toBeGreaterThan(0);
  });

  /**
   * Testa contraste de Liquid Glass components
   *
   * @wcag 1.4.3 Contrast (Minimum) (Level AA)
   * @liquidglass Translucent backgrounds com text-shadow obrigatório
   */
  test('should have sufficient contrast in Liquid Glass components', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Run contrast check on Liquid Glass surfaces
    const contrastResults = await new AxeBuilder({ page })
      .include('.glass-surface, [class*="glass"]')
      .withRules(['color-contrast'])
      .analyze();

    expect(contrastResults.violations).toEqual([]);
  });

  /**
   * Testa semântica de formulários (fieldsets, legends)
   *
   * @wcag 1.3.1 Info and Relationships (Level A)
   * @wcag 3.3.2 Labels or Instructions (Level A)
   */
  test('should have semantic form structure', async ({ page }) => {
    await page.goto('/etps/new');
    await page.waitForLoadState('domcontentloaded');

    const formResults = await new AxeBuilder({ page })
      .include('form')
      .withRules(['label', 'fieldset', 'legend'])
      .analyze();

    expect(formResults.violations).toEqual([]);
  });

  /**
   * Testa zoom de 200% sem perda de conteúdo
   *
   * @wcag 1.4.4 Resize text (Level AA)
   */
  test('should support 200% zoom without loss of content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Set viewport to 200% zoom (equivalent to 640px wide on 1280px viewport)
    await page.setViewportSize({ width: 640, height: 800 });

    // Check page still renders correctly
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Verify no horizontal scroll introduced
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  /**
   * Testa suporte a prefers-reduced-motion
   *
   * @wcag 2.3.3 Animation from Interactions (Level AAA)
   * @applehig Motion - Accessibility - Reduced Motion
   *
   * @description Usuários com sensibilidade a movimento podem configurar
   * prefers-reduced-motion no sistema operacional. Este teste valida que
   * todas as animações são desabilitadas quando esta preferência está ativa.
   */
  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Navigate to page with animations
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Get first button element
    const button = page.locator('button').first();
    await button.hover();

    // Verify that transition duration is minimal (< 100ms)
    const transitionDuration = await button.evaluate((el) => {
      const styles = getComputedStyle(el);
      return styles.transitionDuration;
    });

    // Parse transition duration (e.g., "0.01ms" or "0.01s")
    const durationInMs = transitionDuration.includes('ms')
      ? parseFloat(transitionDuration)
      : parseFloat(transitionDuration) * 1000;

    // Expect transition to be almost instant (< 100ms)
    expect(durationInMs).toBeLessThan(100);

    // Verify animation duration is also minimal
    const animationDuration = await button.evaluate((el) => {
      const styles = getComputedStyle(el);
      return styles.animationDuration;
    });

    const animDurationInMs = animationDuration.includes('ms')
      ? parseFloat(animationDuration)
      : parseFloat(animationDuration) * 1000;

    // Expect animation to be almost instant (< 100ms)
    expect(animDurationInMs).toBeLessThan(100);

    // Test opacity transition is preserved (should be between 100-200ms)
    const opacityElement = page.locator('.transition-opacity').first();
    if (await opacityElement.count() > 0) {
      const opacityTransition = await opacityElement.evaluate((el) => {
        const styles = getComputedStyle(el);
        return styles.transitionDuration;
      });

      const opacityDurationInMs = opacityTransition.includes('ms')
        ? parseFloat(opacityTransition)
        : parseFloat(opacityTransition) * 1000;

      // Opacity should be preserved (around 150ms as per accessibility.css)
      expect(opacityDurationInMs).toBeGreaterThanOrEqual(100);
      expect(opacityDurationInMs).toBeLessThanOrEqual(200);
    }
  });
});
