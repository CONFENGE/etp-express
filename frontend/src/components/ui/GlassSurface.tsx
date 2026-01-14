import { cn } from '@/lib/utils';
import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

/**
 * GlassSurface Component
 *
 * Implements Apple HIG 2025 Liquid Glass Design System with WCAG 2.1 AA compliance.
 * Provides a translucent, depth-aware surface with backdrop blur and saturation.
 *
 * Accessibility features:
 * - Text-shadow for improved legibility on translucent backgrounds
 * - Automatic opacity adjustment in high contrast mode (prefers-contrast: more)
 * - WCAG 2.1 AA contrast ratios maintained
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/materials
 * @example
 * ```tsx
 * <GlassSurface intensity="medium">
 *   <h1>Card Title</h1>
 *   <p>Card content...</p>
 * </GlassSurface>
 * ```
 */

/**
 * Props for the GlassSurface component
 */
export interface GlassSurfaceProps<T extends ElementType = 'div'> {
  /** Content to render inside the glass surface */
  children: ReactNode;
  /** Additional CSS classes to apply */
  className?: string;
  /** Intensity level of the glass effect */
  intensity?: 'light' | 'medium' | 'heavy';
  /** HTML element or React component to render as */
  as?: T;
}

/**
 * Detects browser support for backdrop-filter
 * @returns true if backdrop-filter is supported
 */
function supportsBackdropFilter(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if CSS and CSS.supports are available
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return false;
  }

  return CSS.supports('backdrop-filter', 'blur(1px)');
}

/**
 * GlassSurface - A reusable component implementing Liquid Glass effect
 *
 * Features:
 * - Three intensity levels (light, medium, heavy)
 * - Light/dark mode support
 * - Automatic fallback for browsers without backdrop-filter
 * - Polymorphic component (can render as any HTML element)
 * - Smooth transitions for hover/focus states
 *
 * @param props - Component props
 * @returns React element with glass effect
 */
export function GlassSurface<T extends ElementType = 'div'>({
  children,
  className,
  intensity = 'medium',
  as,
  ...rest
}: GlassSurfaceProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof GlassSurfaceProps<T>>) {
  const Component = (as || 'div') as ElementType;
  const hasBackdropSupport = supportsBackdropFilter();

  /**
   * Intensity-specific class mappings
   * Each intensity level has its own opacity, blur, and saturation values
   */
  const intensityClasses = {
    light: hasBackdropSupport
      ? // With backdrop-filter support
        'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[var(--glass-blur-light)] backdrop-saturate-[var(--glass-saturation-light)]'
      : // Fallback for browsers without backdrop-filter
        'bg-white/95 dark:bg-zinc-900/95',
    medium: hasBackdropSupport
      ? 'bg-white/[0.72] dark:bg-zinc-900/[0.72] backdrop-blur-[var(--glass-blur-amount)] backdrop-saturate-[var(--glass-saturation)]'
      : 'bg-white/95 dark:bg-zinc-900/95',
    heavy: hasBackdropSupport
      ? 'bg-white/85 dark:bg-zinc-900/85 backdrop-blur-[var(--glass-blur-heavy)] backdrop-saturate-[var(--glass-saturation-heavy)]'
      : 'bg-white/95 dark:bg-zinc-900/95',
  };

  return (
    <Component
      className={cn(
        // Base structural styles
        'rounded-[var(--glass-radius-lg)]',
        'border',
        'transition-all',

        // Intensity-specific glass effect
        intensityClasses[intensity],

        // Border styling (subtle, translucent)
        'border-white/[0.18] dark:border-white/[0.09]',

        // Shadow for depth perception
        'shadow-[var(--glass-shadow-sm)]',

        // Apple-style animation timing (fluid, natural)
        'duration-[var(--glass-transition-duration)]',
        'ease-[var(--glass-transition-timing)]',

        // Hover state (subtle lift effect)
        'hover:shadow-[var(--glass-shadow-md)]',

        // WCAG 2.1 AA: Text-shadow for improved legibility on translucent glass
        'glass-text',

        // User-provided classes (highest priority)
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
