/**
 * Accessibility Testing Configuration
 *
 * @description Centralized configuration for automated WCAG 2.1 AA compliance
 * testing using @axe-core/playwright. Defines rule sets, page inventories
 * organized by authentication level, and threshold settings.
 *
 * @compliance WCAG 2.1 AA, LBI Lei 13.146/2015 (Lei Brasileira de Inclusao)
 * @module e2e/accessibility/a11y.config
 */

/**
 * WCAG 2.1 AA axe-core tag configuration
 *
 * These tags map to the axe-core rule sets for WCAG 2.1 Level AA compliance.
 * - wcag2a:   WCAG 2.0 Level A
 * - wcag2aa:  WCAG 2.0 Level AA
 * - wcag21a:  WCAG 2.1 Level A
 * - wcag21aa: WCAG 2.1 Level AA
 * - best-practice: axe-core best practices (non-WCAG but recommended)
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

/**
 * axe-core rules to disable globally
 *
 * These rules are excluded because they produce false positives in SPA
 * environments or are not applicable to the current design system.
 */
export const DISABLED_RULES: string[] = [
  // Disable bypass-blocks for SPA apps that use client-side routing
  // (skip links are handled by the React Router scroll restoration)
  // Uncomment if needed: 'bypass',
];

/**
 * Impact severity levels in axe-core, ordered from most to least severe
 */
export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';

/**
 * Default threshold configuration
 *
 * In warning mode (threshold = Infinity), all violations are logged but
 * tests never fail. Set a numeric threshold to enforce a maximum violation
 * count per page.
 *
 * Usage:
 * - Development: Infinity (warning mode, log all violations)
 * - CI/Staging:  50 (allow up to 50 violations per page)
 * - Production:  0  (zero violations allowed)
 */
export const DEFAULT_THRESHOLD = Infinity;

/**
 * Impact levels that count toward the threshold.
 * Only 'critical' and 'serious' violations count by default.
 */
export const THRESHOLD_IMPACT_LEVELS: ImpactLevel[] = [
  'critical',
  'serious',
];

/**
 * Page definition for accessibility testing
 */
export interface A11yPageConfig {
  /** URL path relative to baseURL */
  path: string;
  /** Human-readable page name (used in test titles) */
  name: string;
  /** Whether the page requires authentication */
  requiresAuth: boolean;
  /** Whether the page requires admin-level access */
  requiresAdmin: boolean;
  /** Optional: wait for a specific selector before scanning */
  waitForSelector?: string;
  /** Optional: override the default threshold for this page */
  threshold?: number;
}

/**
 * Public pages - no authentication required
 *
 * These pages can be tested without login and include the core
 * unauthenticated user journey: login, registration, password flows.
 */
export const PUBLIC_PAGES: A11yPageConfig[] = [
  {
    path: '/login',
    name: 'Login',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    path: '/register',
    name: 'Register',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    path: '/forgot-password',
    name: 'Forgot Password',
    requiresAuth: false,
    requiresAdmin: false,
  },
];

/**
 * Authenticated pages - requires regular user login
 *
 * These pages require a valid user session and cover the primary
 * user workflows: dashboard, ETP management, contracts, etc.
 */
export const AUTHENTICATED_PAGES: A11yPageConfig[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    requiresAuth: true,
    requiresAdmin: false,
    waitForSelector: 'main',
  },
  {
    path: '/etps',
    name: 'ETPs List',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/etps/new',
    name: 'Create ETP',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/contracts',
    name: 'Contracts',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/market-intelligence',
    name: 'Market Intelligence',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/templates',
    name: 'Templates',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/profile',
    name: 'Profile',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/settings',
    name: 'Settings',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/notifications',
    name: 'Notifications',
    requiresAuth: true,
    requiresAdmin: false,
  },
];

/**
 * Admin pages - requires SYSTEM_ADMIN or ADMIN role
 *
 * These pages are only accessible to administrators and cover
 * platform management workflows.
 */
export const ADMIN_PAGES: A11yPageConfig[] = [
  {
    path: '/admin',
    name: 'Admin Dashboard',
    requiresAuth: true,
    requiresAdmin: true,
    waitForSelector: 'h1',
  },
  {
    path: '/admin/users',
    name: 'Admin Users',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    path: '/admin/organizations',
    name: 'Admin Organizations',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    path: '/admin/feature-flags',
    name: 'Admin Feature Flags',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    path: '/admin/domains',
    name: 'Admin Domains',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    path: '/admin/analytics',
    name: 'Admin Analytics',
    requiresAuth: true,
    requiresAdmin: true,
  },
];

/**
 * All pages combined for full-suite scanning
 */
export const ALL_PAGES: A11yPageConfig[] = [
  ...PUBLIC_PAGES,
  ...AUTHENTICATED_PAGES,
  ...ADMIN_PAGES,
];

/**
 * Test credentials configuration
 *
 * Uses environment variables with fallback defaults consistent
 * with the existing e2e test patterns.
 */
export const TEST_CREDENTIALS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
  demo: {
    email: process.env.E2E_DEMO_EMAIL || 'demoetp@confenge.com.br',
    password: process.env.E2E_DEMO_PASSWORD || 'Demo@123',
  },
};

/**
 * Detect if we are testing against Railway (remote) or local
 */
export const isRemoteTesting = !!process.env.E2E_BASE_URL;

/**
 * Timeouts adjusted for environment (local vs Railway)
 */
export const A11Y_TIMEOUTS = {
  navigation: isRemoteTesting ? 30000 : 10000,
  pageLoad: isRemoteTesting ? 15000 : 5000,
  action: isRemoteTesting ? 10000 : 5000,
};
