/**
 * E2E Authentication Utilities
 *
 * Shared authentication helpers for Playwright E2E tests.
 * Use these instead of reimplementing login in each test file.
 *
 * @example
 * import { login, TEST_USERS } from '../utils/auth';
 *
 * test('should access dashboard', async ({ page }) => {
 *   await login(page, 'admin');
 *   await expect(page).toHaveURL(/dashboard/);
 * });
 */

import { Page, expect } from '@playwright/test';

/**
 * Test user credentials
 * These match the seeded users in CI (see .github/workflows/playwright.yml)
 */
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
    role: 'ADMIN' as const,
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL || 'manager@confenge.com.br',
    password: process.env.E2E_MANAGER_PASSWORD || 'Manager@123',
    role: 'MANAGER' as const,
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'user@confenge.com.br',
    password: process.env.E2E_USER_PASSWORD || 'User@123',
    role: 'USER' as const,
  },
  demo: {
    email: process.env.E2E_DEMO_EMAIL || 'demoetp@confenge.com.br',
    password: process.env.E2E_DEMO_PASSWORD || 'Demo@123',
    role: 'USER' as const,
  },
} as const;

export type UserRole = keyof typeof TEST_USERS;

/**
 * Login to the application with a specific user role
 *
 * @param page - Playwright page object
 * @param role - User role to login as (admin, manager, user, demo)
 * @returns Promise that resolves when login is complete and dashboard is visible
 *
 * @example
 * await login(page, 'admin');
 * await login(page, 'manager');
 */
export async function login(
  page: Page,
  role: UserRole = 'admin',
): Promise<void> {
  const user = TEST_USERS[role];

  // Navigate to login if not already there
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL(/\/(dashboard|etps|admin)/, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);

  // Verify login succeeded
  await expect(page.locator('body')).not.toContainText('Credenciais inválidas');
}

/**
 * Logout from the application
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when logout is complete
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu (supports both English and Portuguese aria-labels)
  const userMenu = page.locator(
    '[aria-label^="User menu"], [aria-label^="Menu do usuário"]',
  );
  await userMenu.first().click();

  // Click logout option
  await page.click('text=Sair');

  // Wait for redirect to login
  await page.waitForURL(/\/login/);
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page object
 * @returns Promise<boolean> - true if logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  return !currentUrl.includes('/login') && !currentUrl.includes('/register');
}
