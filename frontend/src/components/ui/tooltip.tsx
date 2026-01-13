import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Provides tooltip context for nested Tooltip components
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Root tooltip component that manages open/close state
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * Element that triggers the tooltip on hover/focus
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent component with Liquid Glass effect
 *
 * Displays tooltip content with Apple HIG 2025-compliant translucent background,
 * subtle blur, and smooth animations. Uses design tokens for consistent styling.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent>Tooltip text</TooltipContent>
 * </Tooltip>
 * ```
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Liquid Glass effect (light, subtle for tooltips)
      'bg-zinc-900/90 dark:bg-zinc-800/90',
      'backdrop-blur-[var(--glass-blur-light)]',

      // Text and padding
      'px-3 py-1.5 text-sm text-white',

      // Rounded corners
      'rounded-[var(--glass-radius-md)]',

      // Shadow for depth
      'shadow-[var(--glass-shadow-lg)]',

      // Border (subtle translucent)
      'border border-white/10 dark:border-white/5',

      // Animations - entry/exit
      'z-50',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2',
      'data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2',
      'data-[side=top]:slide-in-from-bottom-2',

      // Smooth transitions
      'duration-[var(--glass-transition-duration)]',
      'ease-[var(--glass-transition-timing)]',

      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
