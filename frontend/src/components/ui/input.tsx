import * as React from 'react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component with Apple HIG design tokens.
 *
 * Features:
 * - Subtle border (surface-tertiary)
 * - Focus ring with apple accent
 * - Placeholder in text-secondary
 * - Smooth transition on focus
 * - Apple-style border radius
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
          // Apple-style transition
          'transition-all duration-apple ease-apple',
          // Focus state with Apple accent
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2 focus-visible:border-apple-accent',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-secondary',
          // Hover state
          'hover:border-[var(--border-focus)]',
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
