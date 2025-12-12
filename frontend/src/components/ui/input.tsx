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
          // Base styles with Apple HIG tokens
          'flex h-10 w-full rounded-apple border border-[var(--border-primary)] bg-surface-primary px-3 py-2 text-sm text-text-apple-primary',
          // File input styles
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          // Placeholder with secondary text color
          'placeholder:text-text-apple-secondary',
          // Apple-style transition with GPU acceleration
          'transition-all duration-200 ease-out',
          // Focus state with Apple accent and glow effect
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2 focus-visible:border-apple-accent',
          'focus-visible:shadow-[0_0_0_4px_rgba(0,122,255,0.1)]',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-secondary',
          // Hover state
          'hover:border-[var(--border-focus)]',
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
