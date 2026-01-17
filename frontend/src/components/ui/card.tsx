import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card variants for different use cases following Apple HIG Surface Hierarchy.
 *
 * @see frontend/.design-engineer/system.md for full documentation
 *
 * Hierarchy:
 * - Level 0 (Base): Page background - no component needed
 * - Level 1 (Elevated): Card - content containers, data cards
 * - Level 2 (Floating): GlassSurface - dropdowns, popovers, sidebars
 * - Level 3 (Modal): Dialog - dialogs, sheets, overlays
 */
export type CardVariant = 'default' | 'elevated' | 'flat';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Enable interactive micro-interactions (hover lift, active press)
   * Use for clickable cards only
   */
  interactive?: boolean;
  /**
   * Card variant:
   * - default: Standard elevated card with border and shadow
   * - elevated: Higher elevation with stronger shadow (for emphasis)
   * - flat: No shadow, subtle border (for nested cards or tables)
   */
  variant?: CardVariant;
}

const cardVariants: Record<CardVariant, string> = {
  default:
    'border border-[var(--border-secondary)] bg-surface-primary shadow-apple',
  elevated:
    'border border-[var(--border-secondary)] bg-surface-primary shadow-apple-lg',
  flat: 'border border-[var(--border-secondary)] bg-surface-primary',
};

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
 *
 * @example
 * ```tsx
 * // Default card
 * <Card>
 *   <CardContent>Content</CardContent>
 * </Card>
 *
 * // Interactive card (clickable)
 * <Card interactive onClick={handleClick}>
 *   <CardContent>Clickable content</CardContent>
 * </Card>
 *
 * // Flat variant for tables/nested content
 * <Card variant="flat">
 *   <table>...</table>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base styles with Apple HIG tokens
        'rounded-apple-lg text-text-apple-primary',
        // Variant-specific styles
        cardVariants[variant],
        // Apple-style transition with GPU acceleration
        'transition-all duration-200 ease-out',
        // Interactive card micro-interactions
        interactive && [
          'cursor-pointer',
          // Hover: lift up with enhanced shadow
          'hover:shadow-apple-lg hover:-translate-y-1',
          // Active: pressed state
          'active:shadow-apple-sm active:translate-y-0 active:scale-[0.97]',
          // Focus visible for keyboard navigation
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
        ],
        // Respect reduced motion preference
        'motion-reduce:transition-none motion-reduce:hover:transform-none',
        className,
      )}
      {...props}
    />
  ),
);
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
      // Apple HIG Typography - Title 3 (20px, Semibold, 1.35 line-height)
      'text-[20px] font-semibold leading-[1.35] tracking-[-0.01em] text-text-apple-primary',
      className,
    )}
    style={{ fontFamily: 'var(--font-family-text)' }}
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
      // Apple HIG Typography - Callout (16px, Regular, 1.5 line-height)
      'text-[16px] font-normal leading-[1.5] tracking-[0.01em] text-text-apple-secondary',
      className,
    )}
    style={{ fontFamily: 'var(--font-family-text)' }}
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
