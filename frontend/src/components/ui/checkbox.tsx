import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox component with micro-interactions.
 *
 * Features:
 * - Bounce animation when checked
 * - Scale-in animation for the check icon
 * - Smooth transitions
 * - Respects prefers-reduced-motion
 */
const Checkbox = React.forwardRef<
 React.ElementRef<typeof CheckboxPrimitive.Root>,
 React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
 <CheckboxPrimitive.Root
 ref={ref}
 className={cn(
 // Base styles with WCAG 2.5.5 touch target
 // Uses relative positioning with ::before pseudo-element to extend touch area
 // Visual size: 16px, Touch target: 44px (via padding)
 'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
 // WCAG 2.5.5: Increase touch area with padding (transparent hit area)
 'relative before:absolute before:-inset-[14px] before:content-[""]',
 // Focus styles
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
 // Disabled styles
 'disabled:cursor-not-allowed disabled:opacity-50',
 // Checked styles with animation
 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
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
 <CheckboxPrimitive.Indicator
 className={cn(
 'flex items-center justify-center text-current',
 // Scale-in animation for the check icon
 'animate-check-scale-in',
 'motion-reduce:animate-none',
 )}
 >
 <Check className="h-4 w-4" />
 </CheckboxPrimitive.Indicator>
 </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
