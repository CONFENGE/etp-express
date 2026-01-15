import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button - Micro-interactions', () => {
  describe('Hover state', () => {
    it('should have scale transform on hover', () => {
      render(<Button>Hover me</Button>);
      const button = screen.getByRole('button');

      // Check if hover:scale-[1.02] class is applied
      expect(button.className).toContain('hover:scale-[1.02]');
    });

    it('should have translateY on hover for default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:-translate-y-[1px]');
      expect(button.className).toContain('hover:shadow-apple-md');
    });

    it('should have translateY on hover for destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:-translate-y-[1px]');
      expect(button.className).toContain('hover:shadow-apple-md');
    });

    it('should have translateY on hover for outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:-translate-y-[1px]');
      expect(button.className).toContain('hover:shadow-apple-md');
    });

    it('should have translateY on hover for secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:-translate-y-[1px]');
      expect(button.className).toContain('hover:shadow-apple-md');
    });

    it('should NOT have scale/translateY for link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('hover:scale-100');
      expect(button.className).toContain('hover:translate-y-0');
    });
  });

  describe('Active state', () => {
    it('should have scale down on active', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('active:scale-[0.97]');
    });

    it('should reset translateY on active', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('active:translate-y-0');
    });
  });

  describe('Focus state', () => {
    it('should have focus-visible ring', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-apple-accent');
      expect(button.className).toContain('focus-visible:ring-offset-2');
    });
  });

  describe('Transitions', () => {
    it('should use Apple HIG transition tokens', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');

      // Check if transition uses CSS variable
      expect(button.className).toContain('[transition:var(--transition-interactive)]');
    });
  });

  describe('Disabled state', () => {
    it('should disable hover effects when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('disabled:hover:translate-y-0');
      expect(button.className).toContain('disabled:hover:shadow-none');
    });

    it('should use cursor-not-allowed when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('Reduced motion support', () => {
    it('should disable transitions with motion-reduce', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('motion-reduce:transition-none');
      expect(button.className).toContain('motion-reduce:hover:scale-100');
      expect(button.className).toContain('motion-reduce:active:scale-100');
    });
  });

  describe('Variants rendering', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Default');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Outline');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Ghost');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Link');
    });
  });

  describe('Sizes rendering', () => {
    it('should render default size with minimum touch target', () => {
      render(<Button size="default">Default</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-touch');
    });

    it('should render small size with minimum touch target', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-touch');
    });

    it('should render large size with minimum touch target', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-touch');
    });

    it('should render icon size with minimum touch target', () => {
      render(
        <Button size="icon" aria-label="Icon button">
          X
        </Button>,
      );
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-touch');
      expect(button.className).toContain('min-w-touch');
    });
  });
});
