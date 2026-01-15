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
 *
 * Accessibility (WCAG 2.1 AA + Apple HIG):
 * - REQUIRED: When using size="icon", you MUST provide aria-label
 *   Example: <Button size="icon" aria-label="Delete item"><Trash /></Button>
 * - All sizes ensure minimum 44px touch target (WCAG 2.5.5)
 * - Focus-visible ring with 2px outline and 2px offset
 * - Screen reader support via semantic HTML button element
 * - Use aria-describedby to link to hint/error messages when applicable
 */
const buttonVariants = cva(
  // Base styles with Apple HIG tokens and micro-interactions
  // WCAG 2.1 AA: Using cursor-not-allowed for disabled instead of opacity to maintain contrast
  // Micro-interactions: hover scale (1.02), active scale (0.97), smooth transitions
  'inline-flex items-center justify-center whitespace-nowrap rounded-apple text-sm font-medium ring-offset-background [transition:var(--transition-interactive)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
  {
    variants: {
      variant: {
        // Primary: Apple accent color with shadow on hover
        // WCAG 2.1 AA: disabled uses opacity 0.5 to maintain contrast
        // Micro-interactions: translateY + shadow elevation on hover
        default:
          'bg-apple-accent text-white hover:bg-apple-accent-hover hover:-translate-y-[1px] hover:shadow-apple-md active:bg-apple-accent-active active:translate-y-0 disabled:opacity-50 disabled:text-white disabled:hover:translate-y-0 disabled:hover:shadow-none',
        // Destructive: Apple red with subtle hover
        destructive:
          'bg-apple-red text-white hover:bg-apple-red/90 hover:-translate-y-[1px] hover:shadow-apple-md active:bg-apple-red/80 active:translate-y-0 disabled:opacity-50 disabled:text-white disabled:hover:translate-y-0 disabled:hover:shadow-none',
        // Outline: Subtle border with surface background
        outline:
          'border border-[var(--border-primary)] bg-surface-primary hover:bg-surface-secondary hover:-translate-y-[1px] hover:shadow-apple-md active:bg-surface-tertiary active:translate-y-0 disabled:bg-surface-secondary disabled:text-text-apple-tertiary disabled:hover:translate-y-0 disabled:hover:shadow-none',
        // Secondary: Muted background with subtle hover
        secondary:
          'bg-surface-secondary text-text-apple-primary hover:bg-surface-tertiary hover:-translate-y-[1px] hover:shadow-apple-md active:bg-surface-tertiary/80 active:translate-y-0 disabled:bg-surface-tertiary disabled:text-text-apple-tertiary disabled:hover:translate-y-0 disabled:hover:shadow-none',
        // Ghost: Transparent with subtle hover
        ghost:
          'hover:bg-apple-accent-light hover:text-apple-accent active:bg-apple-accent-light/80 disabled:text-text-apple-tertiary',
        // Link: Text only with underline on hover
        link: 'text-apple-accent underline-offset-4 hover:underline hover:scale-100 hover:translate-y-0 disabled:text-text-apple-tertiary disabled:no-underline',
      },
      size: {
        // WCAG 2.5.5: All sizes ensure minimum 44px touch target
        default: 'h-10 min-h-touch px-4 py-2',
        sm: 'h-9 min-h-touch rounded-apple px-3 text-apple-sm',
        lg: 'h-11 min-h-touch rounded-apple-lg px-8 text-apple-base',
        icon: 'h-11 w-11 min-h-touch min-w-touch',
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
