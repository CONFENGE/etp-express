/**
 * Touch Target Audit Script
 *
 * Detects interactive elements with touch targets smaller than 44x44px.
 * Implements WCAG 2.5.5 (Level AAA) and Apple HIG touch target requirements.
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
 * @see https://developer.apple.com/design/human-interface-guidelines/inputs#Touchscreen-gestures
 */

interface TouchTargetViolation {
  element: Element;
  width: number;
  height: number;
  selector: string;
  violationType: 'width' | 'height' | 'both';
}

const MINIMUM_TOUCH_TARGET = 44; // WCAG 2.5.5 & Apple HIG minimum

/**
 * Interactive element selectors following WCAG definitions
 */
const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gets a readable CSS selector for an element
 */
function getSelector(element: Element): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try classes
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).slice(0, 3).join('.');
    if (classes) {
      return `${element.tagName.toLowerCase()}.${classes}`;
    }
  }

  // Try aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel.slice(0, 30)}..."]`;
  }

  // Fallback to tag name
  return element.tagName.toLowerCase();
}

/**
 * Checks if an element has sufficient touch target size
 */
function checkTouchTarget(element: Element): TouchTargetViolation | null {
  const rect = element.getBoundingClientRect();

  // Skip elements not in viewport or with zero size
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  const width = rect.width;
  const height = rect.height;

  const hasWidthViolation = width < MINIMUM_TOUCH_TARGET;
  const hasHeightViolation = height < MINIMUM_TOUCH_TARGET;

  if (!hasWidthViolation && !hasHeightViolation) {
    return null;
  }

  let violationType: 'width' | 'height' | 'both';
  if (hasWidthViolation && hasHeightViolation) {
    violationType = 'both';
  } else if (hasWidthViolation) {
    violationType = 'width';
  } else {
    violationType = 'height';
  }

  return {
    element,
    width: Math.round(width),
    height: Math.round(height),
    selector: getSelector(element),
    violationType,
  };
}

/**
 * Audits all interactive elements on the page
 */
export function auditTouchTargets(): TouchTargetViolation[] {
  const interactiveElements = document.querySelectorAll(INTERACTIVE_SELECTORS);
  const violations: TouchTargetViolation[] = [];

  interactiveElements.forEach((el) => {
    const violation = checkTouchTarget(el);
    if (violation) {
      violations.push(violation);
    }
  });

  return violations;
}

/**
 * Logs touch target violations to console in a readable format
 */
export function logTouchTargetViolations(violations: TouchTargetViolation[]): void {
  if (violations.length === 0) {
    console.log(
      '%c✅ Touch Target Audit PASSED',
      'color: #34c759; font-weight: bold; font-size: 14px;',
    );
    console.log(
      `All interactive elements meet WCAG 2.5.5 minimum size (${MINIMUM_TOUCH_TARGET}x${MINIMUM_TOUCH_TARGET}px)`,
    );
    return;
  }

  console.group(
    `%c⚠️  Touch Target Audit FAILED (${violations.length} violations)`,
    'color: #ff9500; font-weight: bold; font-size: 14px;',
  );

  console.log(
    `Found ${violations.length} interactive elements smaller than ${MINIMUM_TOUCH_TARGET}x${MINIMUM_TOUCH_TARGET}px:\n`,
  );

  violations.forEach((v, index) => {
    const sizeStr = `${v.width}x${v.height}px`;
    const missingWidth = MINIMUM_TOUCH_TARGET - v.width;
    const missingHeight = MINIMUM_TOUCH_TARGET - v.height;

    console.group(
      `${index + 1}. ${v.selector} (${sizeStr}) - ${v.violationType} violation`,
    );
    console.log('Element:', v.element);
    console.log('Current size:', sizeStr);

    if (v.violationType === 'both') {
      console.log(
        `Missing: width needs +${missingWidth}px, height needs +${missingHeight}px`,
      );
    } else if (v.violationType === 'width') {
      console.log(`Missing: width needs +${missingWidth}px`);
    } else {
      console.log(`Missing: height needs +${missingHeight}px`);
    }

    console.log(
      '%cRecommendation: Add min-h-touch and/or min-w-touch Tailwind classes',
      'color: #0066cc;',
    );
    console.groupEnd();
  });

  console.groupEnd();
}

/**
 * Runs a complete touch target audit and logs results
 */
export function runTouchTargetAudit(): void {
  console.log(
    '%c🔍 Running Touch Target Audit (WCAG 2.5.5)',
    'color: #0066cc; font-weight: bold; font-size: 16px;',
  );
  console.log('Minimum touch target size: 44x44px\n');

  const violations = auditTouchTargets();
  logTouchTargetViolations(violations);

  // Return violations count for testing/CI purposes
  if (violations.length > 0) {
    console.log(
      `\n%cTo fix violations, add these Tailwind classes:`,
      'font-weight: bold;',
    );
    console.log('  • min-h-touch (for height < 44px)');
    console.log('  • min-w-touch (for width < 44px)');
    console.log('  • Or use .touch-target CSS class from accessibility.css');
  }
}

// Auto-run on page load in development mode
if (import.meta.env.DEV) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTouchTargetAudit);
  } else {
    // DOMContentLoaded already fired
    runTouchTargetAudit();
  }
}

// Expose to window for manual testing
declare global {
  interface Window {
    auditTouchTargets: typeof runTouchTargetAudit;
  }
}

if (import.meta.env.DEV) {
  window.auditTouchTargets = runTouchTargetAudit;
}
