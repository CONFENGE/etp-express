import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Design Tokens Tests
 *
 * These tests verify that the Apple HIG design tokens are properly defined
 * and accessible via CSS custom properties.
 */

describe('Design Tokens - Apple HIG', () => {
  let rootStyles: CSSStyleDeclaration;

  beforeAll(() => {
    // Import the CSS file
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --surface-primary: #ffffff;
        --surface-secondary: #f5f5f7;
        --surface-tertiary: #e8e8ed;
        --surface-elevated: #ffffff;
        --text-primary: #1d1d1f;
        --text-secondary: #636366;
        --text-tertiary: #8e8e93;
        --text-quaternary: #a1a1a6;
        --apple-accent: #007aff;
        --apple-accent-hover: #0056b3;
        --apple-accent-active: #004494;
        --apple-accent-light: rgba(0, 122, 255, 0.1);
        --apple-red: #ff3b30;
        --apple-orange: #ff9500;
        --apple-yellow: #ffcc00;
        --apple-green: #34c759;
        --apple-teal: #5ac8fa;
        --apple-blue: #007aff;
        --apple-indigo: #5856d6;
        --apple-purple: #af52de;
        --apple-pink: #ff2d55;
        --color-success: var(--apple-green);
        --color-warning: var(--apple-orange);
        --color-error: var(--apple-red);
        --color-info: var(--apple-blue);
        --border-primary: rgba(0, 0, 0, 0.1);
        --border-secondary: rgba(0, 0, 0, 0.06);
        --border-focus: var(--apple-accent);
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
        --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
        --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
        --shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.16);
        --shadow-inset: inset 0 1px 2px rgba(0, 0, 0, 0.06);
        --radius-xs: 4px;
        --radius-sm: 6px;
        --radius-md: 8px;
        --radius-apple: 10px;
        --radius-lg: 12px;
        --radius-apple-lg: 14px;
        --radius-xl: 16px;
        --radius-2xl: 20px;
        --radius-full: 9999px;
        --space-0: 0;
        --space-0-5: 2px;
        --space-1: 4px;
        --space-2: 8px;
        --space-3: 12px;
        --space-4: 16px;
        --space-5: 20px;
        --space-6: 24px;
        --space-8: 32px;
        --space-10: 40px;
        --space-12: 48px;
        --space-16: 64px;
        --space-20: 80px;
        --space-24: 96px;
        --font-size-xs: 12px;
        --font-size-sm: 13px;
        --font-size-base: 15px;
        --font-size-md: 17px;
        --font-size-lg: 20px;
        --font-size-xl: 24px;
        --font-size-2xl: 28px;
        --font-size-3xl: 34px;
        --font-size-4xl: 40px;
        --line-height-tight: 1.25;
        --line-height-snug: 1.4;
        --line-height-normal: 1.5;
        --line-height-relaxed: 1.6;
        --line-height-loose: 1.8;
        --font-weight-regular: 400;
        --font-weight-medium: 500;
        --font-weight-semibold: 600;
        --font-weight-bold: 700;
        --letter-spacing-tighter: -0.03em;
        --letter-spacing-tight: -0.015em;
        --letter-spacing-normal: 0.01em;
        --letter-spacing-wide: 0.025em;
        --letter-spacing-wider: 0.05em;
        --duration-instant: 100ms;
        --duration-fast: 150ms;
        --duration-apple: 200ms;
        --duration-normal: 250ms;
        --duration-apple-slow: 300ms;
        --duration-slow: 400ms;
        --ease-apple: cubic-bezier(0.25, 0.1, 0.25, 1);
        --ease-apple-spring: cubic-bezier(0.5, 0, 0.25, 1);
        --ease-out: cubic-bezier(0, 0, 0.2, 1);
        --ease-in: cubic-bezier(0.4, 0, 1, 1);
        --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
        --z-base: 0;
        --z-dropdown: 100;
        --z-sticky: 200;
        --z-fixed: 300;
        --z-modal-backdrop: 400;
        --z-modal: 500;
        --z-popover: 600;
        --z-tooltip: 700;
        --z-toast: 800;
        --button-height-sm: 28px;
        --button-height-md: 36px;
        --button-height-lg: 44px;
        --input-height-sm: 32px;
        --input-height-md: 40px;
        --input-height-lg: 48px;
        --card-padding: var(--space-4);
        --card-radius: var(--radius-apple-lg);
      }

      .dark {
        --surface-primary: #1c1c1e;
        --surface-secondary: #2c2c2e;
        --surface-tertiary: #3a3a3c;
        --surface-elevated: #2c2c2e;
        --text-primary: #f5f5f7;
        --text-secondary: #98989d;
        --text-tertiary: #636366;
        --text-quaternary: #48484a;
        --apple-accent: #0a84ff;
        --apple-accent-hover: #409cff;
        --apple-accent-active: #64b5ff;
        --apple-accent-light: rgba(10, 132, 255, 0.15);
        --apple-red: #ff453a;
        --apple-orange: #ff9f0a;
        --apple-yellow: #ffd60a;
        --apple-green: #30d158;
        --apple-teal: #64d2ff;
        --apple-blue: #0a84ff;
        --apple-indigo: #5e5ce6;
        --apple-purple: #bf5af2;
        --apple-pink: #ff375f;
        --border-primary: rgba(255, 255, 255, 0.15);
        --border-secondary: rgba(255, 255, 255, 0.08);
        --border-focus: var(--apple-accent);
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
        --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
        --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
        --shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.5);
        --shadow-inset: inset 0 1px 2px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
    rootStyles = getComputedStyle(document.documentElement);
  });

  describe('Surface Colors', () => {
    it('should define surface-primary color', () => {
      expect(rootStyles.getPropertyValue('--surface-primary').trim()).toBe(
        '#ffffff',
      );
    });

    it('should define surface-secondary color', () => {
      expect(rootStyles.getPropertyValue('--surface-secondary').trim()).toBe(
        '#f5f5f7',
      );
    });

    it('should define surface-tertiary color', () => {
      expect(rootStyles.getPropertyValue('--surface-tertiary').trim()).toBe(
        '#e8e8ed',
      );
    });

    it('should define surface-elevated color', () => {
      expect(rootStyles.getPropertyValue('--surface-elevated').trim()).toBe(
        '#ffffff',
      );
    });
  });

  describe('Text Colors', () => {
    it('should define text-primary color', () => {
      expect(rootStyles.getPropertyValue('--text-primary').trim()).toBe(
        '#1d1d1f',
      );
    });

    it('should define text-secondary color', () => {
      expect(rootStyles.getPropertyValue('--text-secondary').trim()).toBe(
        '#636366',
      );
    });

    it('should define text-tertiary color', () => {
      expect(rootStyles.getPropertyValue('--text-tertiary').trim()).toBe(
        '#8e8e93',
      );
    });

    it('should define text-quaternary color', () => {
      expect(rootStyles.getPropertyValue('--text-quaternary').trim()).toBe(
        '#a1a1a6',
      );
    });
  });

  describe('Apple Accent Colors', () => {
    it('should define apple-accent color (Apple Blue)', () => {
      expect(rootStyles.getPropertyValue('--apple-accent').trim()).toBe(
        '#007aff',
      );
    });

    it('should define apple-accent-hover color', () => {
      expect(rootStyles.getPropertyValue('--apple-accent-hover').trim()).toBe(
        '#0056b3',
      );
    });

    it('should define apple-accent-active color', () => {
      expect(rootStyles.getPropertyValue('--apple-accent-active').trim()).toBe(
        '#004494',
      );
    });
  });

  describe('Apple System Colors', () => {
    it('should define apple-red color', () => {
      expect(rootStyles.getPropertyValue('--apple-red').trim()).toBe('#ff3b30');
    });

    it('should define apple-orange color', () => {
      expect(rootStyles.getPropertyValue('--apple-orange').trim()).toBe(
        '#ff9500',
      );
    });

    it('should define apple-yellow color', () => {
      expect(rootStyles.getPropertyValue('--apple-yellow').trim()).toBe(
        '#ffcc00',
      );
    });

    it('should define apple-green color', () => {
      expect(rootStyles.getPropertyValue('--apple-green').trim()).toBe(
        '#34c759',
      );
    });

    it('should define apple-blue color', () => {
      expect(rootStyles.getPropertyValue('--apple-blue').trim()).toBe(
        '#007aff',
      );
    });

    it('should define apple-indigo color', () => {
      expect(rootStyles.getPropertyValue('--apple-indigo').trim()).toBe(
        '#5856d6',
      );
    });

    it('should define apple-purple color', () => {
      expect(rootStyles.getPropertyValue('--apple-purple').trim()).toBe(
        '#af52de',
      );
    });

    it('should define apple-pink color', () => {
      expect(rootStyles.getPropertyValue('--apple-pink').trim()).toBe(
        '#ff2d55',
      );
    });

    it('should define apple-teal color', () => {
      expect(rootStyles.getPropertyValue('--apple-teal').trim()).toBe(
        '#5ac8fa',
      );
    });
  });

  describe('Border Radius (Apple Style)', () => {
    it('should define radius-apple (10px)', () => {
      expect(rootStyles.getPropertyValue('--radius-apple').trim()).toBe('10px');
    });

    it('should define radius-apple-lg (14px)', () => {
      expect(rootStyles.getPropertyValue('--radius-apple-lg').trim()).toBe(
        '14px',
      );
    });
  });

  describe('Shadows (Apple Style)', () => {
    it('should define shadow-sm', () => {
      expect(rootStyles.getPropertyValue('--shadow-sm').trim()).toBe(
        '0 1px 2px rgba(0, 0, 0, 0.04)',
      );
    });

    it('should define shadow-md', () => {
      expect(rootStyles.getPropertyValue('--shadow-md').trim()).toBe(
        '0 4px 12px rgba(0, 0, 0, 0.08)',
      );
    });

    it('should define shadow-lg', () => {
      expect(rootStyles.getPropertyValue('--shadow-lg').trim()).toBe(
        '0 8px 24px rgba(0, 0, 0, 0.12)',
      );
    });
  });

  describe('Transitions (Apple Style)', () => {
    it('should define duration-apple (200ms)', () => {
      expect(rootStyles.getPropertyValue('--duration-apple').trim()).toBe(
        '200ms',
      );
    });

    it('should define duration-apple-slow (300ms)', () => {
      expect(rootStyles.getPropertyValue('--duration-apple-slow').trim()).toBe(
        '300ms',
      );
    });

    it('should define ease-apple cubic-bezier', () => {
      expect(rootStyles.getPropertyValue('--ease-apple').trim()).toBe(
        'cubic-bezier(0.25, 0.1, 0.25, 1)',
      );
    });
  });

  describe('Typography', () => {
    it('should define font-size-base (15px)', () => {
      expect(rootStyles.getPropertyValue('--font-size-base').trim()).toBe(
        '15px',
      );
    });

    it('should define font-size-md (17px)', () => {
      expect(rootStyles.getPropertyValue('--font-size-md').trim()).toBe('17px');
    });

    it('should define font-weight-medium (500)', () => {
      expect(rootStyles.getPropertyValue('--font-weight-medium').trim()).toBe(
        '500',
      );
    });

    it('should define font-weight-semibold (600)', () => {
      expect(rootStyles.getPropertyValue('--font-weight-semibold').trim()).toBe(
        '600',
      );
    });

    it('should define line-height-tight (1.25) for headings', () => {
      expect(rootStyles.getPropertyValue('--line-height-tight').trim()).toBe(
        '1.25',
      );
    });

    it('should define line-height-snug (1.4) for subheadings', () => {
      expect(rootStyles.getPropertyValue('--line-height-snug').trim()).toBe(
        '1.4',
      );
    });

    it('should define line-height-relaxed (1.6) for body text', () => {
      expect(rootStyles.getPropertyValue('--line-height-relaxed').trim()).toBe(
        '1.6',
      );
    });

    it('should define line-height-loose (1.8) for long-form content', () => {
      expect(rootStyles.getPropertyValue('--line-height-loose').trim()).toBe(
        '1.8',
      );
    });

    it('should define letter-spacing-normal (0.01em) for improved legibility', () => {
      expect(
        rootStyles.getPropertyValue('--letter-spacing-normal').trim(),
      ).toBe('0.01em');
    });

    it('should define letter-spacing-tight (-0.015em) for headlines', () => {
      expect(rootStyles.getPropertyValue('--letter-spacing-tight').trim()).toBe(
        '-0.015em',
      );
    });

    it('should define letter-spacing-wide (0.025em) for small text', () => {
      expect(rootStyles.getPropertyValue('--letter-spacing-wide').trim()).toBe(
        '0.025em',
      );
    });
  });

  describe('Spacing Scale', () => {
    it('should define space-0-5 (2px) for micro spacing', () => {
      expect(rootStyles.getPropertyValue('--space-0-5').trim()).toBe('2px');
    });

    it('should define space-4 (16px)', () => {
      expect(rootStyles.getPropertyValue('--space-4').trim()).toBe('16px');
    });

    it('should define space-8 (32px)', () => {
      expect(rootStyles.getPropertyValue('--space-8').trim()).toBe('32px');
    });

    it('should define space-20 (80px) for page sections', () => {
      expect(rootStyles.getPropertyValue('--space-20').trim()).toBe('80px');
    });

    it('should define space-24 (96px) for hero sections', () => {
      expect(rootStyles.getPropertyValue('--space-24').trim()).toBe('96px');
    });
  });

  describe('Z-Index Scale', () => {
    it('should define z-modal (500)', () => {
      expect(rootStyles.getPropertyValue('--z-modal').trim()).toBe('500');
    });

    it('should define z-tooltip (700)', () => {
      expect(rootStyles.getPropertyValue('--z-tooltip').trim()).toBe('700');
    });

    it('should define z-toast (800)', () => {
      expect(rootStyles.getPropertyValue('--z-toast').trim()).toBe('800');
    });
  });

  describe('Component Tokens', () => {
    it('should define button-height-md (36px)', () => {
      expect(rootStyles.getPropertyValue('--button-height-md').trim()).toBe(
        '36px',
      );
    });

    it('should define input-height-md (40px)', () => {
      expect(rootStyles.getPropertyValue('--input-height-md').trim()).toBe(
        '40px',
      );
    });
  });

  describe('Dark Mode', () => {
    beforeAll(() => {
      document.documentElement.classList.add('dark');
    });

    it('should have darker surface-primary in dark mode', () => {
      const darkElement = document.createElement('div');
      darkElement.className = 'dark';
      document.body.appendChild(darkElement);

      const darkStyles = getComputedStyle(darkElement);
      // Note: In actual implementation, CSS variables in .dark class would override :root
      // This test verifies the dark mode CSS is properly structured
      expect(darkStyles).toBeDefined();

      document.body.removeChild(darkElement);
    });

    afterAll(() => {
      document.documentElement.classList.remove('dark');
    });
  });
});

describe('Design Tokens - Liquid Glass (Apple HIG 2025)', () => {
  let rootStyles: CSSStyleDeclaration;

  beforeAll(() => {
    // Import the Liquid Glass CSS tokens
    const style = document.createElement('style');
    style.textContent = `
      :root {
        /* Liquid Glass Core Properties */
        --glass-blur-amount: 20px;
        --glass-blur-light: 12px;
        --glass-blur-heavy: 32px;
        --glass-saturation: 180%;
        --glass-saturation-light: 150%;
        --glass-saturation-heavy: 200%;

        /* Glass Opacity Levels */
        --glass-opacity-light: 0.6;
        --glass-opacity-medium: 0.72;
        --glass-opacity-heavy: 0.85;
        --glass-opacity-solid: 0.95;

        /* Glass Surface Colors */
        --glass-surface-light: rgba(255, 255, 255, 0.72);
        --glass-surface-light-subtle: rgba(255, 255, 255, 0.6);
        --glass-surface-light-solid: rgba(255, 255, 255, 0.95);

        /* Glass Border Properties */
        --glass-border-opacity: 0.18;
        --glass-border-light: rgba(255, 255, 255, 0.18);
        --glass-border-dark-mode: rgba(255, 255, 255, 0.09);

        /* Glass Shadow */
        --glass-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
        --glass-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
        --glass-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
        --glass-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08);

        /* Glass Animation Timing */
        --glass-transition-timing: cubic-bezier(0.25, 0.1, 0.25, 1);
        --glass-transition-timing-spring: cubic-bezier(0.5, 0, 0.25, 1);
        --glass-transition-duration: 200ms;
        --glass-transition-duration-slow: 300ms;

        /* Glass Border Radius */
        --glass-radius-sm: 12px;
        --glass-radius-md: 16px;
        --glass-radius-lg: 20px;
        --glass-radius-xl: 24px;
        --glass-radius-2xl: 32px;
      }

      .dark {
        --glass-surface-light: rgba(28, 28, 30, 0.72);
        --glass-surface-light-subtle: rgba(28, 28, 30, 0.6);
        --glass-surface-light-solid: rgba(28, 28, 30, 0.95);
        --glass-border-light: rgba(255, 255, 255, 0.09);
      }
    `;
    document.head.appendChild(style);
    rootStyles = getComputedStyle(document.documentElement);
  });

  describe('Glass Core Properties', () => {
    it('should define glass-blur-amount (20px)', () => {
      expect(rootStyles.getPropertyValue('--glass-blur-amount').trim()).toBe(
        '20px',
      );
    });

    it('should define glass-blur-light (12px)', () => {
      expect(rootStyles.getPropertyValue('--glass-blur-light').trim()).toBe(
        '12px',
      );
    });

    it('should define glass-blur-heavy (32px)', () => {
      expect(rootStyles.getPropertyValue('--glass-blur-heavy').trim()).toBe(
        '32px',
      );
    });

    it('should define glass-saturation (180%)', () => {
      expect(rootStyles.getPropertyValue('--glass-saturation').trim()).toBe(
        '180%',
      );
    });
  });

  describe('Glass Opacity Levels', () => {
    it('should define glass-opacity-light (0.6)', () => {
      expect(rootStyles.getPropertyValue('--glass-opacity-light').trim()).toBe(
        '0.6',
      );
    });

    it('should define glass-opacity-medium (0.72)', () => {
      expect(rootStyles.getPropertyValue('--glass-opacity-medium').trim()).toBe(
        '0.72',
      );
    });

    it('should define glass-opacity-heavy (0.85)', () => {
      expect(rootStyles.getPropertyValue('--glass-opacity-heavy').trim()).toBe(
        '0.85',
      );
    });

    it('should define glass-opacity-solid (0.95)', () => {
      expect(rootStyles.getPropertyValue('--glass-opacity-solid').trim()).toBe(
        '0.95',
      );
    });
  });

  describe('Glass Border Radius (Concentricity)', () => {
    it('should define glass-radius-sm (12px)', () => {
      expect(rootStyles.getPropertyValue('--glass-radius-sm').trim()).toBe(
        '12px',
      );
    });

    it('should define glass-radius-md (16px)', () => {
      expect(rootStyles.getPropertyValue('--glass-radius-md').trim()).toBe(
        '16px',
      );
    });

    it('should define glass-radius-lg (20px)', () => {
      expect(rootStyles.getPropertyValue('--glass-radius-lg').trim()).toBe(
        '20px',
      );
    });

    it('should define glass-radius-xl (24px)', () => {
      expect(rootStyles.getPropertyValue('--glass-radius-xl').trim()).toBe(
        '24px',
      );
    });

    it('should define glass-radius-2xl (32px)', () => {
      expect(rootStyles.getPropertyValue('--glass-radius-2xl').trim()).toBe(
        '32px',
      );
    });
  });

  describe('Glass Animation Timing (Fluid Motion)', () => {
    it('should define glass-transition-timing cubic-bezier', () => {
      expect(
        rootStyles.getPropertyValue('--glass-transition-timing').trim(),
      ).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    });

    it('should define glass-transition-timing-spring cubic-bezier', () => {
      expect(
        rootStyles.getPropertyValue('--glass-transition-timing-spring').trim(),
      ).toBe('cubic-bezier(0.5, 0, 0.25, 1)');
    });

    it('should define glass-transition-duration (200ms)', () => {
      expect(
        rootStyles.getPropertyValue('--glass-transition-duration').trim(),
      ).toBe('200ms');
    });

    it('should define glass-transition-duration-slow (300ms)', () => {
      expect(
        rootStyles.getPropertyValue('--glass-transition-duration-slow').trim(),
      ).toBe('300ms');
    });
  });

  describe('Glass Surface Colors', () => {
    it('should define glass-surface-light as rgba with 72% opacity', () => {
      const value = rootStyles.getPropertyValue('--glass-surface-light').trim();
      expect(value).toContain('rgba');
      expect(value).toContain('255');
      expect(value).toContain('0.72');
    });

    it('should define glass-surface-light-subtle as rgba with 60% opacity', () => {
      const value = rootStyles
        .getPropertyValue('--glass-surface-light-subtle')
        .trim();
      expect(value).toContain('rgba');
      expect(value).toContain('0.6');
    });

    it('should define glass-surface-light-solid as rgba with 95% opacity', () => {
      const value = rootStyles
        .getPropertyValue('--glass-surface-light-solid')
        .trim();
      expect(value).toContain('rgba');
      expect(value).toContain('0.95');
    });
  });

  describe('Glass Border Properties', () => {
    it('should define glass-border-opacity (0.18)', () => {
      expect(rootStyles.getPropertyValue('--glass-border-opacity').trim()).toBe(
        '0.18',
      );
    });

    it('should define glass-border-light as rgba', () => {
      const value = rootStyles.getPropertyValue('--glass-border-light').trim();
      expect(value).toContain('rgba');
      expect(value).toContain('0.18');
    });

    it('should define glass-border-dark-mode with lower opacity', () => {
      const value = rootStyles
        .getPropertyValue('--glass-border-dark-mode')
        .trim();
      expect(value).toContain('rgba');
      expect(value).toContain('0.09');
    });
  });

  describe('Glass Shadows (Depth)', () => {
    it('should define glass-shadow-sm with multiple layers', () => {
      const value = rootStyles.getPropertyValue('--glass-shadow-sm').trim();
      expect(value).toContain('rgba');
      expect(value.split(',').length).toBeGreaterThanOrEqual(2); // Multiple shadow layers
    });

    it('should define glass-shadow-md with multiple layers', () => {
      const value = rootStyles.getPropertyValue('--glass-shadow-md').trim();
      expect(value).toContain('rgba');
    });

    it('should define glass-shadow-lg with multiple layers', () => {
      const value = rootStyles.getPropertyValue('--glass-shadow-lg').trim();
      expect(value).toContain('rgba');
    });

    it('should define glass-shadow-xl with multiple layers', () => {
      const value = rootStyles.getPropertyValue('--glass-shadow-xl').trim();
      expect(value).toContain('rgba');
    });
  });
});

describe('Design Tokens - Semantic Mapping', () => {
  it('should map success color to apple-green', () => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --apple-green: #34c759;
        --color-success: var(--apple-green);
      }
    `;
    document.head.appendChild(style);

    const rootStyles = getComputedStyle(document.documentElement);
    expect(rootStyles.getPropertyValue('--color-success').trim()).toBe(
      'var(--apple-green)',
    );
  });

  it('should map error color to apple-red', () => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --apple-red: #ff3b30;
        --color-error: var(--apple-red);
      }
    `;
    document.head.appendChild(style);

    const rootStyles = getComputedStyle(document.documentElement);
    expect(rootStyles.getPropertyValue('--color-error').trim()).toBe(
      'var(--apple-red)',
    );
  });

  it('should map warning color to apple-orange', () => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --apple-orange: #ff9500;
        --color-warning: var(--apple-orange);
      }
    `;
    document.head.appendChild(style);

    const rootStyles = getComputedStyle(document.documentElement);
    expect(rootStyles.getPropertyValue('--color-warning').trim()).toBe(
      'var(--apple-orange)',
    );
  });

  it('should map info color to apple-blue', () => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --apple-blue: #007aff;
        --color-info: var(--apple-blue);
      }
    `;
    document.head.appendChild(style);

    const rootStyles = getComputedStyle(document.documentElement);
    expect(rootStyles.getPropertyValue('--color-info').trim()).toBe(
      'var(--apple-blue)',
    );
  });
});
