import * as React from 'react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component with Apple HIG design tokens and micro-interactions.
 *
 * Features:
 * - Subtle border (surface-tertiary)
 * - Focus ring with apple accent and glow effect
 * - Placeholder in text-secondary
 * - Smooth transition on focus
 * - Apple-style border radius
 * - Respects prefers-reduced-motion
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles with Apple HIG tokens (#1015)
          // WCAG 2.5.5: min-h-[44px] ensures 44px minimum touch target
          'flex h-11 min-h-[44px] w-full rounded-xl border border-transparent',
          'bg-surface-secondary px-4 py-2 text-base text-text-apple-primary',
          // File input styles
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Placeholder with tertiary text color
          'placeholder:text-text-apple-tertiary',
          // Apple-style transition with GPU acceleration
          'transition-all duration-200 ease-out',
          // Hover state - subtle background change
          'hover:bg-surface-tertiary',
          // Focus state with glow (no hard ring) - border becomes visible
          'focus-visible:outline-none',
          'focus-visible:bg-surface-primary',
          'focus-visible:border-apple-accent',
          'focus-visible:shadow-[0_0_0_4px_rgba(0,102,204,0.12)]',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-secondary',
          // Respect reduced motion preference
          'motion-reduce:transition-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
