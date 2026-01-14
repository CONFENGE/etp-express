import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassSurface } from '../GlassSurface';

describe('GlassSurface', () => {
  // Mock CSS.supports for testing
  let originalCSS: typeof CSS;

  beforeEach(() => {
    originalCSS = globalThis.CSS;
  });

  describe('Rendering', () => {
    it('should render with children', () => {
      render(
        <GlassSurface>
          <h1>Test Content</h1>
        </GlassSurface>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render as div by default', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should render as custom element when using "as" prop', () => {
      const { container } = render(
        <GlassSurface as="section">
          <p>Content</p>
        </GlassSurface>
      );
      expect(container.firstChild?.nodeName).toBe('SECTION');
    });

    it('should render as article element', () => {
      const { container } = render(
        <GlassSurface as="article">
          <p>Content</p>
        </GlassSurface>
      );
      expect(container.firstChild?.nodeName).toBe('ARTICLE');
    });

    it('should render as aside element', () => {
      const { container } = render(
        <GlassSurface as="aside">
          <p>Content</p>
        </GlassSurface>
      );
      expect(container.firstChild?.nodeName).toBe('ASIDE');
    });
  });

  describe('Intensity Levels', () => {
    it('should apply medium intensity by default (with backdrop-filter support)', () => {
      // Mock CSS.supports to return true
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => true),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/[0.72]');
      expect(element.className).toContain('dark:bg-zinc-900/[0.72]');
    });

    it('should apply light intensity classes (with backdrop-filter support)', () => {
      // Mock CSS.supports to return true
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => true),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="light">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/60');
      expect(element.className).toContain('dark:bg-zinc-900/60');
    });

    it('should apply heavy intensity classes (with backdrop-filter support)', () => {
      // Mock CSS.supports to return true
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => true),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="heavy">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/85');
      expect(element.className).toContain('dark:bg-zinc-900/85');
    });
  });

  describe('Apple HIG Design Tokens', () => {
    it('should use Liquid Glass border radius from design tokens', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('rounded-[var(--glass-radius-lg)]');
    });

    it('should have translucent borders from design tokens', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('border-white/[0.18]');
      expect(element.className).toContain('dark:border-white/[0.09]');
    });

    it('should use glass shadow from design tokens', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('shadow-[var(--glass-shadow-sm)]');
    });

    it('should use Apple-style fluid transition timing', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain(
        'duration-[var(--glass-transition-duration)]'
      );
      expect(element.className).toContain(
        'ease-[var(--glass-transition-timing)]'
      );
    });

    it('should have hover state with elevated shadow', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('hover:shadow-[var(--glass-shadow-md)]');
    });
  });

  describe('Backdrop Filter Support', () => {
    it('should apply backdrop-blur when supported', () => {
      // Mock CSS.supports to return true
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => true),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="medium">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('backdrop-blur-[var(--glass-blur-amount)]');
      expect(element.className).toContain('backdrop-saturate-[var(--glass-saturation)]');
    });

    it('should apply fallback styles when backdrop-filter is not supported', () => {
      // Mock CSS.supports to return false
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => false),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="medium">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/95');
      expect(element.className).toContain('dark:bg-zinc-900/95');
    });

    it('should apply fallback for light intensity without backdrop-filter', () => {
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => false),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="light">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/95');
    });

    it('should apply fallback for heavy intensity without backdrop-filter', () => {
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => false),
      } as unknown as typeof CSS;

      const { container } = render(
        <GlassSurface intensity="heavy">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('bg-white/95');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for all intensities (with backdrop-filter support)', () => {
      // Mock CSS.supports to return true
      globalThis.CSS = {
        ...originalCSS,
        supports: vi.fn(() => true),
      } as unknown as typeof CSS;

      const { container: lightContainer } = render(
        <GlassSurface intensity="light">
          <p>Light</p>
        </GlassSurface>
      );
      const lightElement = lightContainer.firstChild as HTMLElement;
      expect(lightElement.className).toContain('dark:bg-zinc-900/60');

      const { container: mediumContainer } = render(
        <GlassSurface intensity="medium">
          <p>Medium</p>
        </GlassSurface>
      );
      const mediumElement = mediumContainer.firstChild as HTMLElement;
      expect(mediumElement.className).toContain('dark:bg-zinc-900/[0.72]');

      const { container: heavyContainer } = render(
        <GlassSurface intensity="heavy">
          <p>Heavy</p>
        </GlassSurface>
      );
      const heavyElement = heavyContainer.firstChild as HTMLElement;
      expect(heavyElement.className).toContain('dark:bg-zinc-900/85');
    });

    it('should have dark mode border styles', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('dark:border-white/[0.09]');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      const { container } = render(
        <GlassSurface className="custom-class">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('custom-class');
      expect(element.className).toContain('rounded-[var(--glass-radius-lg)]');
    });

    it('should allow overriding default styles with custom className', () => {
      const { container } = render(
        <GlassSurface className="bg-red-500">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      // cn() utility from tailwind-merge should make bg-red-500 take precedence
      expect(element.className).toContain('bg-red-500');
    });
  });

  describe('Additional Props', () => {
    it('should pass through additional HTML attributes', () => {
      const { container } = render(
        <GlassSurface data-testid="glass-surface" role="complementary">
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('data-testid')).toBe('glass-surface');
      expect(element.getAttribute('role')).toBe('complementary');
    });

    it('should support aria attributes', () => {
      const { container } = render(
        <GlassSurface aria-label="Glass card" aria-describedby="description">
          <p id="description">Card description</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.getAttribute('aria-label')).toBe('Glass card');
      expect(element.getAttribute('aria-describedby')).toBe('description');
    });
  });

  describe('Base Styles', () => {
    it('should have border', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('border');
    });

    it('should have transition-all for smooth animations', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('transition-all');
    });
  });

  describe('Accessibility - WCAG 2.1 AA Compliance', () => {
    it('should apply glass-text class for improved legibility', () => {
      const { container } = render(
        <GlassSurface>
          <p>Content</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('glass-text');
    });

    it('should maintain glass-text class across all intensity levels', () => {
      const intensities = ['light', 'medium', 'heavy'] as const;

      intensities.forEach((intensity) => {
        const { container } = render(
          <GlassSurface intensity={intensity}>
            <p>Content</p>
          </GlassSurface>
        );
        const element = container.firstChild as HTMLElement;
        expect(element.className).toContain('glass-text');
      });
    });

    it('should allow custom className to override glass-text if needed', () => {
      const { container } = render(
        <GlassSurface className="glass-text-strong">
          <p>Content with stronger shadow</p>
        </GlassSurface>
      );
      const element = container.firstChild as HTMLElement;
      // Both classes should be present, tailwind-merge will handle precedence
      expect(element.className).toContain('glass-text');
      expect(element.className).toContain('glass-text-strong');
    });
  });
});
