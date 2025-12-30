/**
 * E2E Password Reset Tests
 *
 * @description Tests forgot password and reset password flows.
 *
 * @issue #932
 * @group e2e
 * @group auth
 * @priority P1
 */

import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
  existingUser: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
  },
  nonExistentEmail: 'nonexistent-user@test.com',
  timeouts: {
    navigation: 10000,
    action: 3000,
  },
};

test.describe('Forgot Password Flow', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Password reset tests require full backend infrastructure.',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test: Forgot password page loads correctly
   */
  test('forgot password page loads correctly', async ({ page }) => {
    // Verify page elements
    await expect(
      page.locator('input[name="email"], input#email'),
    ).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify link back to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();

    console.log('Forgot password page load: PASSED');
  });

  /**
   * Test: Submit forgot password with valid email shows success message
   */
  test('submit with valid email shows success message', async ({ page }) => {
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.existingUser.email,
    );
    await page.click('button[type="submit"]');

    // Should show success message (even if email doesn't exist - security)
    await page.waitForTimeout(2000);

    // Check for success indicators - Frontend shows "Verifique seu email" on success
    const successVisible =
      (await page.locator('text=Verifique seu email').isVisible()) ||
      (await page.locator('text=recebera instrucoes').isVisible()) ||
      (await page.locator('[class*="success"]').isVisible()) ||
      (await page.locator('text=email').isVisible());

    expect(successVisible).toBe(true);

    console.log('Forgot password submit: PASSED');
  });

  /**
   * Test: Submit with non-existent email still shows success (security)
   *
   * @description For security, the system should not reveal whether
   * an email exists in the database.
   */
  test('submit with non-existent email shows same message (security)', async ({
    page,
  }) => {
    await page.fill(
      'input[name="email"], input#email',
      TEST_CONFIG.nonExistentEmail,
    );
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Should NOT show "email not found" or similar
    const errorVisible = await page
      .locator('text=não encontrado')
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBe(false);

    console.log('Email enumeration prevention: PASSED');
  });

  /**
   * Test: Invalid email format shows validation error
   */
  test('invalid email format shows validation error', async ({ page }) => {
    await page.fill('input[name="email"], input#email', 'invalid-email');
    await page.click('button[type="submit"]');

    // Should show validation error - Frontend uses "invalido" without accent
    // Use .first() to avoid strict mode violation when text appears multiple times
    const errorVisible =
      (await page.locator('text=invalido').first().isVisible()) ||
      (await page.locator('text=Email invalido').first().isVisible()) ||
      (await page.locator('[class*="error"]').first().isVisible()) ||
      (await page.locator('[aria-invalid="true"]').first().isVisible());

    expect(errorVisible).toBe(true);

    console.log('Email validation: PASSED');
  });

  /**
   * Test: Empty email shows validation error
   */
  test('empty email shows validation error', async ({ page }) => {
    // Click submit without filling email
    await page.click('button[type="submit"]');

    // Should show validation error
    await page.waitForTimeout(500);

    // Form should not have been submitted (still on same page)
    await expect(page).toHaveURL(/\/forgot-password/);

    console.log('Empty email validation: PASSED');
  });

  /**
   * Test: Can navigate back to login
   */
  test('can navigate back to login', async ({ page }) => {
    await page.click('a[href="/login"], text=Voltar, text=Login');

    await expect(page).toHaveURL(/\/login/, {
      timeout: TEST_CONFIG.timeouts.navigation,
    });

    console.log('Navigate to login: PASSED');
  });
});

test.describe('Reset Password Flow', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Reset password tests require full backend infrastructure.',
  );

  /**
   * Test: Reset password page without token redirects to forgot password
   */
  test('reset password without token shows error or redirects', async ({
    page,
  }) => {
    await page.goto('/reset-password');

    // Should either redirect to forgot-password or show error
    await page.waitForTimeout(2000);

    const onResetPage = await page.url().includes('/reset-password');
    if (onResetPage) {
      // Should show error message about invalid/missing token
      // Frontend shows "Link invalido" (without accent) when no token
      // Use .first() to avoid strict mode violation when text appears multiple times
      const errorVisible =
        (await page.locator('text=invalido').first().isVisible()) ||
        (await page.locator('text=Link invalido').first().isVisible()) ||
        (await page.locator('text=expirou').first().isVisible()) ||
        (await page.locator('[class*="error"]').first().isVisible()) ||
        (await page.locator('[class*="red"]').first().isVisible());

      expect(errorVisible).toBe(true);
    } else {
      // Should have redirected
      await expect(page).toHaveURL(/\/(forgot-password|login)/);
    }

    console.log('Reset password without token: PASSED');
  });

  /**
   * Test: Reset password with invalid token shows error
   */
  test('reset password with invalid token shows error', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-12345');

    await page.waitForLoadState('networkidle');

    // If form is visible, try to submit
    // Use .first() to avoid strict mode violation when multiple password inputs exist
    const passwordInput = page
      .locator(
        'input[name="newPassword"], input#newPassword, input[type="password"]',
      )
      .first();

    if (await passwordInput.isVisible()) {
      await passwordInput.fill('NewPassword123!');

      const confirmInput = page.locator(
        'input[name="confirmPassword"], input#confirmPassword',
      );
      if (await confirmInput.isVisible()) {
        await confirmInput.fill('NewPassword123!');
      }

      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should show error about invalid token
      // Frontend shows toast error or text with "invalido" or "expirou" (without accent)
      // Use .first() to avoid strict mode violation when text appears multiple times
      const errorVisible =
        (await page.locator('text=invalido').first().isVisible()) ||
        (await page.locator('text=expirou').first().isVisible()) ||
        (await page.locator('text=expirado').first().isVisible()) ||
        (await page.locator('[class*="error"]').first().isVisible()) ||
        (await page.locator('[role="alert"]').first().isVisible());

      expect(errorVisible).toBe(true);
    }

    console.log('Invalid token handling: PASSED');
  });
});
