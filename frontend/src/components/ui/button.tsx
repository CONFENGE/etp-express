import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button component with Apple HIG design tokens and micro-interactions.
 *
 * Features:
 * - Apple-style transitions (200ms ease-apple)
 * - Apple-style shadows on hover
 * - Apple-style border radius
 * - States: default, hover, active, focus, disabled
 * - Variants: primary (accent), secondary, ghost, destructive, outline, link
 * - Micro-interactions: subtle scale on active, smooth hover transitions
 * - Respects prefers-reduced-motion
 */
const buttonVariants = cva(
  // Base styles with Apple HIG tokens and micro-interactions
  'inline-flex items-center justify-center whitespace-nowrap rounded-apple text-sm font-medium ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
  {
    variants: {
      variant: {
        // Primary: Apple accent color with shadow on hover
        default:
          'bg-apple-accent text-white hover:bg-apple-accent-hover hover:shadow-apple-sm active:bg-apple-accent-active',
        // Destructive: Apple red with subtle hover
        destructive:
          'bg-apple-red text-white hover:bg-apple-red/90 hover:shadow-apple-sm active:bg-apple-red/80',
        // Outline: Subtle border with surface background
        outline:
          'border border-[var(--border-primary)] bg-surface-primary hover:bg-surface-secondary hover:shadow-apple-sm active:bg-surface-tertiary',
        // Secondary: Muted background with subtle hover
        secondary:
          'bg-surface-secondary text-text-apple-primary hover:bg-surface-tertiary hover:shadow-apple-sm active:bg-surface-tertiary/80',
        // Ghost: Transparent with subtle hover
        ghost:
          'hover:bg-apple-accent-light hover:text-apple-accent active:bg-apple-accent-light/80',
        // Link: Text only with underline on hover
        link: 'text-apple-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-apple px-3 text-apple-sm',
        lg: 'h-11 rounded-apple-lg px-8 text-apple-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
