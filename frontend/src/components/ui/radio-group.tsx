import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * RadioGroup root component.
 *
 * Container for radio group items with proper ARIA semantics.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1">
 *   <RadioGroupItem value="option-1" id="r1" />
 *   <Label htmlFor="r1">Option 1</Label>
 *   <RadioGroupItem value="option-2" id="r2" />
 *   <Label htmlFor="r2">Option 2</Label>
 * </RadioGroup>
 * ```
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

/**
 * RadioGroupItem component with Apple HIG micro-interactions.
 *
 * Features:
 * - Bounce animation when selected
 * - Scale-in animation for the indicator
 * - Smooth transitions
 * - Respects prefers-reduced-motion
 * - WCAG 2.5.5 compliant (44x44px touch target)
 *
 * @example
 * ```tsx
 * <RadioGroupItem value="option-1" id="r1" />
 * <Label htmlFor="r1">Option 1</Label>
 * ```
 */
const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        // Base styles with WCAG 2.5.5 touch target
        'aspect-square h-4 w-4 rounded-full border border-primary',
        // WCAG 2.5.5: Extend touch area with padding
        'relative before:absolute before:-inset-[14px] before:content-[""]',
        // Text color for indicator
        'text-primary',
        // Focus styles - WCAG 2.1 AA compliant with standardized apple-accent color
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
        // Disabled styles
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Checked state animation
        'data-[state=checked]:animate-bounce-in',
        // Transition for smooth state changes
        'transition-all duration-150 ease-out',
        // Hover effect
        'hover:border-primary/80',
        // Respect reduced motion preference
        'motion-reduce:animate-none motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        className={cn(
          'flex items-center justify-center',
          // Scale-in animation for the indicator
          'animate-check-scale-in',
          'motion-reduce:animate-none',
        )}
      >
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
