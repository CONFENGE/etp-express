/**
 * Accessibility Testing Helpers
 *
 * @description Reusable helper functions for automated WCAG 2.1 AA compliance
 * testing using @axe-core/playwright. Provides a configurable `checkA11y`
 * function with violation reporting and threshold support.
 *
 * @compliance WCAG 2.1 AA
 * @module e2e/accessibility/helpers
 */

import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  WCAG_TAGS,
  DISABLED_RULES,
  DEFAULT_THRESHOLD,
  THRESHOLD_IMPACT_LEVELS,
  type ImpactLevel,
} from './a11y.config';

/**
 * Options for the checkA11y function
 */
export interface CheckA11yOptions {
  /**
   * axe-core WCAG tags to test against.
   * Defaults to WCAG 2.1 AA tags from config.
   */
  tags?: readonly string[];

  /**
   * CSS selector to scope the scan to a specific region of the page.
   * When omitted, the entire page body is scanned.
   */
  include?: string;

  /**
   * CSS selectors to exclude from the scan.
   * Useful for excluding third-party widgets or known-issue areas.
   */
  exclude?: string[];

  /**
   * Specific axe-core rule IDs to disable for this scan.
   * Merged with the global DISABLED_RULES from config.
   */
  disableRules?: string[];

  /**
   * Maximum number of threshold-counted violations before the test fails.
   * - Infinity (default): Warning mode - log violations but never fail
   * - 0: Strict mode - fail on any violation
   * - N: Allow up to N violations of critical/serious impact
   */
  threshold?: number;

  /**
   * Impact levels that count toward the threshold.
   * Defaults to ['critical', 'serious'].
   */
  thresholdImpactLevels?: ImpactLevel[];

  /**
   * Custom label for the scan (used in console output).
   * Defaults to the page URL path.
   */
  label?: string;
}

/**
 * Result returned by checkA11y
 */
export interface A11yResult {
  /** Total number of violations found */
  totalViolations: number;
  /** Number of violations that count toward the threshold */
  thresholdViolations: number;
  /** Whether the scan passed (thresholdViolations <= threshold) */
  passed: boolean;
  /** Raw axe-core results */
  violations: Array<{
    id: string;
    impact: string | undefined;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary: string | undefined;
    }>;
  }>;
}

/**
 * Run an axe-core accessibility scan on the current page
 *
 * @description Performs a WCAG 2.1 AA compliance scan using @axe-core/playwright.
 * By default, operates in warning mode (threshold = Infinity), logging all
 * violations to the console without failing the test. Set threshold to a
 * numeric value to enforce a maximum violation count.
 *
 * @param page - Playwright Page object
 * @param options - Configuration options for the scan
 * @returns A11yResult with violation details and pass/fail status
 * @throws Error if threshold-counted violations exceed the threshold
 *
 * @example
 * ```ts
 * // Warning mode (default): log violations, never fail
 * await checkA11y(page);
 *
 * // Strict mode: fail on any violation
 * await checkA11y(page, { threshold: 0 });
 *
 * // Scoped scan with custom label
 * await checkA11y(page, {
 *   include: 'main',
 *   label: 'Main Content Area',
 *   threshold: 5,
 * });
 * ```
 */
export async function checkA11y(
  page: Page,
  options: CheckA11yOptions = {},
): Promise<A11yResult> {
  const {
    tags = WCAG_TAGS,
    include,
    exclude,
    disableRules = [],
    threshold = DEFAULT_THRESHOLD,
    thresholdImpactLevels = THRESHOLD_IMPACT_LEVELS,
    label,
  } = options;

  // Determine scan label from option or current URL
  const scanLabel = label || new URL(page.url()).pathname || 'unknown page';

  // Build the axe scanner
  let builder = new AxeBuilder({ page }).withTags([...tags]);

  // Apply include/exclude selectors
  if (include) {
    builder = builder.include(include);
  }
  if (exclude && exclude.length > 0) {
    for (const selector of exclude) {
      builder = builder.exclude(selector);
    }
  }

  // Disable rules (merge global + local)
  const allDisabledRules = [...DISABLED_RULES, ...disableRules];
  if (allDisabledRules.length > 0) {
    builder = builder.disableRules(allDisabledRules);
  }

  // Execute the scan
  const results = await builder.analyze();

  // Map violations to a simpler structure
  const violations: A11yResult['violations'] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? undefined,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target.map(String),
      failureSummary: n.failureSummary,
    })),
  }));

  // Count violations that exceed threshold impact levels
  const thresholdViolations = violations.filter((v) =>
    thresholdImpactLevels.includes(v.impact as ImpactLevel),
  ).length;

  const totalViolations = violations.length;
  const passed = thresholdViolations <= threshold;

  // Report violations to console
  if (totalViolations > 0) {
    reportViolations(scanLabel, violations, thresholdImpactLevels, threshold);
  } else {
    console.log(`[A11Y PASS] ${scanLabel}: No violations found`);
  }

  // Enforce threshold
  if (!passed) {
    throw new Error(
      `[A11Y FAIL] ${scanLabel}: ${thresholdViolations} threshold-level ` +
        `violation(s) found (threshold: ${threshold}). ` +
        `Total violations: ${totalViolations}.`,
    );
  }

  return {
    totalViolations,
    thresholdViolations,
    passed,
    violations,
  };
}

/**
 * Report violations to the console with structured formatting
 *
 * @param label - Page or section label
 * @param violations - Array of violation objects
 * @param thresholdLevels - Impact levels that count toward threshold
 * @param threshold - Current threshold setting
 */
function reportViolations(
  label: string,
  violations: A11yResult['violations'],
  thresholdLevels: ImpactLevel[],
  threshold: number,
): void {
  const isWarningMode = threshold === Infinity;
  const prefix = isWarningMode ? '[A11Y WARN]' : '[A11Y REPORT]';

  // Group violations by impact
  const bySeverity: Record<string, typeof violations> = {};
  for (const v of violations) {
    const impact = v.impact || 'unknown';
    if (!bySeverity[impact]) {
      bySeverity[impact] = [];
    }
    bySeverity[impact].push(v);
  }

  // Summary line
  const severityCounts = Object.entries(bySeverity)
    .map(([impact, items]) => `${impact}: ${items.length}`)
    .join(', ');

  console.log(
    `\n${prefix} ${label}: ${violations.length} violation(s) [${severityCounts}]`,
  );

  if (isWarningMode) {
    console.log(
      `  (Warning mode: threshold=Infinity, violations are logged but tests pass)`,
    );
  }

  // Detail each violation
  const impactOrder: string[] = ['critical', 'serious', 'moderate', 'minor'];
  const sortedImpacts = Object.keys(bySeverity).sort(
    (a, b) => impactOrder.indexOf(a) - impactOrder.indexOf(b),
  );

  let index = 0;
  for (const impact of sortedImpacts) {
    const items = bySeverity[impact];
    const countsTowardThreshold = thresholdLevels.includes(
      impact as ImpactLevel,
    );
    const marker = countsTowardThreshold ? ' [THRESHOLD]' : '';

    for (const v of items) {
      index++;
      console.log(`\n  [${index}] ${v.id} (${impact})${marker}`);
      console.log(`      ${v.help}`);
      console.log(`      ${v.helpUrl}`);
      console.log(`      Affected nodes: ${v.nodes.length}`);

      // Show first 3 affected nodes to keep output manageable
      const nodesToShow = v.nodes.slice(0, 3);
      for (const node of nodesToShow) {
        const htmlSnippet =
          node.html.length > 120
            ? node.html.substring(0, 120) + '...'
            : node.html;
        console.log(`        - ${htmlSnippet}`);
        console.log(`          Target: ${node.target.join(' > ')}`);
      }

      if (v.nodes.length > 3) {
        console.log(`        ... and ${v.nodes.length - 3} more node(s)`);
      }
    }
  }

  console.log(''); // blank line after report
}

/**
 * Helper to perform login for accessibility tests
 *
 * @description Logs in using the standard ETP Express login flow.
 * Uses the same selector patterns as global-setup.ts and login-flow.spec.ts.
 *
 * @param page - Playwright Page object
 * @param credentials - Email and password
 * @param navigationTimeout - Timeout for dashboard redirect
 */
export async function a11yLogin(
  page: Page,
  credentials: { email: string; password: string },
  navigationTimeout: number = 10000,
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[name="email"], input#email', credentials.email);
  await page.fill(
    'input[name="password"], input#password',
    credentials.password,
  );

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: navigationTimeout });
}
