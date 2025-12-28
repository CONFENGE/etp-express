import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card component with Apple HIG design tokens and micro-interactions.
 *
 * Features:
 * - Background surface-primary
 * - Apple-style shadow (shadow-apple)
 * - Border radius apple-lg
 * - Hover: lift effect with enhanced shadow (for interactive cards)
 * - Active: pressed state feedback
 * - Smooth transitions with GPU acceleration
 * - Respects prefers-reduced-motion
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base styles with Apple HIG tokens - borderless design (#1013)
      'rounded-2xl bg-surface-primary text-text-apple-primary',
      // Apple-style diffuse shadow as delimiter (no hard border)
      'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]',
      // Apple-style transition with GPU acceleration
      'transition-all duration-200 ease-out',
      // Interactive card micro-interactions
      interactive && [
        'cursor-pointer',
        // Hover: lift up with enhanced shadow
        'hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
        // Active: pressed state
        'active:shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:translate-y-0 active:scale-[0.98]',
        // Focus visible for keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
      ],
      // Respect reduced motion preference
      'motion-reduce:transition-none motion-reduce:hover:transform-none',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      // Apple HIG typography
      'text-apple-xl font-semibold leading-none tracking-tight text-text-apple-primary',
      className,
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      // Apple HIG secondary text
      'text-apple-sm text-text-apple-secondary',
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
