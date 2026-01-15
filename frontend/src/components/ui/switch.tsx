import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

/**
 * Switch component with Apple HIG micro-interactions.
 *
 * Features:
 * - Spring animation on state change
 * - Smooth thumb slide transition
 * - Background color fade
 * - Scale feedback on press
 * - Respects prefers-reduced-motion
 * - WCAG 2.5.5 compliant (44x44px touch target)
 *
 * @example
 * ```tsx
 * <Switch
 *   checked={isEnabled}
 *   onCheckedChange={setIsEnabled}
 *   aria-label="Enable notifications"
 * />
 * ```
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base styles with WCAG 2.5.5 touch target
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
      // WCAG 2.5.5: Extend touch area with padding (transparent)
      'relative before:absolute before:-inset-[9px] before:content-[""]',
      // Background transitions
      'bg-surface-tertiary',
      'data-[state=checked]:bg-apple-accent',
      'transition-colors duration-normal ease-apple-spring',
      // Border for better contrast
      'border border-[var(--border-primary)]',
      'data-[state=checked]:border-apple-accent',
      // Focus styles
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
      // Disabled styles
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Hover effect
      'hover:bg-surface-elevated',
      'data-[state=checked]:hover:bg-apple-accent-hover',
      // Respect reduced motion
      'motion-reduce:transition-none',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Thumb base styles
        'pointer-events-none block h-5 w-5 rounded-full',
        'bg-background shadow-apple-sm',
        // Position and transform
        'translate-x-0.5',
        'data-[state=checked]:translate-x-[22px]',
        // Spring animation
        'transition-transform duration-normal ease-apple-spring',
        // Scale effect on state change
        'data-[state=checked]:scale-110',
        'transition-[transform] duration-fast ease-apple-bounce',
        // Respect reduced motion
        'motion-reduce:transition-none motion-reduce:scale-100',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
