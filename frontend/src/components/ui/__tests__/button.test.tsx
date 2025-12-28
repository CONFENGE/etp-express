import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from '../button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole('button', { name: /click me/i }),
      ).toBeInTheDocument();
    });

    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>,
      );
      expect(
        screen.getByRole('link', { name: /link button/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-apple-accent');
    });

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-apple-red');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('bg-surface-primary');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-surface-secondary');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-apple-accent-light');
    });

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-apple-accent');
      expect(button).toHaveClass('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should apply default size with 44px touch target', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button');
      // WCAG 2.5.5: 44px minimum touch target
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('px-6');
    });

    it('should apply small size with 44px touch target', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      // WCAG 2.5.5: Even small buttons have 44px min touch target
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('px-4');
    });

    it('should apply large size with 44px touch target', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('px-8');
    });

    it('should apply icon size with WCAG 2.5.5 touch target', () => {
      render(<Button size="icon">Icon</Button>);
      const button = screen.getByRole('button');
      // WCAG 2.5.5: 44x44px minimum touch target
      expect(button).toHaveClass('h-11');
      expect(button).toHaveClass('w-11');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('min-w-[44px]');
    });
  });

  describe('Apple HIG Design Tokens', () => {
    it('should use Apple-style border radius', () => {
      render(<Button>Styled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-xl');
    });

    it('should use smooth micro-interaction transitions', () => {
      render(<Button>Transition</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-200');
      expect(button).toHaveClass('ease-out');
    });

    it('should have active scale effect for tactile feedback', () => {
      render(<Button>Scale</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('active:scale-[0.97]');
    });

    it('should have focus glow with soft shadow', () => {
      render(<Button>Focus</Button>);
      const button = screen.getByRole('button');
      // Focus uses soft glow shadow instead of hard ring (#1014)
      expect(button).toHaveClass(
        'focus-visible:shadow-[0_0_0_4px_rgba(0,102,204,0.2)]',
      );
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is set', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(<Button onClick={() => (clicked = true)}>Click</Button>);

      await user.click(screen.getByRole('button'));
      expect(clicked).toBe(true);
    });

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(
        <Button disabled onClick={() => (clicked = true)}>
          Disabled
        </Button>,
      );

      await user.click(screen.getByRole('button'));
      expect(clicked).toBe(false);
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex');
    });
  });

  describe('buttonVariants export', () => {
    it('should export buttonVariants for custom usage', () => {
      expect(buttonVariants).toBeDefined();
      expect(typeof buttonVariants).toBe('function');
    });

    it('should generate correct classes when called directly', () => {
      const classes = buttonVariants({ variant: 'default', size: 'default' });
      expect(classes).toContain('bg-apple-accent');
      expect(classes).toContain('h-11');
      expect(classes).toContain('min-h-[44px]');
    });
  });
});
