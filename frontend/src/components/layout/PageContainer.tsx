import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  /**
   * Extra padding to apply (in addition to safe areas)
   * @default 'default' (uses standard spacing)
   */
  padding?: 'none' | 'sm' | 'default' | 'lg';
  /**
   * Custom className to apply to the container
   */
  className?: string;
}

/**
 * PageContainer - Safe area aware container component
 *
 * This component automatically respects device safe areas (notch, home indicator)
 * while providing consistent padding across different screen sizes.
 *
 * Safe areas are applied via CSS custom properties defined in design-tokens.css:
 * - --padding-safe-top: Respects notch on devices like iPhone X+
 * - --padding-safe-bottom: Respects home indicator
 * - --padding-safe-left: Respects left edge insets
 * - --padding-safe-right: Respects right edge insets
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/layout#iOS-iPadOS
 * @example
 * ```tsx
 * <PageContainer>
 *   <h1>Page Title</h1>
 *   <p>Content that respects safe areas</p>
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  padding = 'default',
  className,
}: PageContainerProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-4',
    default: 'p-4 sm:p-6 lg:p-8',
    lg: 'p-6 sm:p-8 lg:p-12',
  };

  return (
    <div
      className={cn(
        'w-full',
        paddingClasses[padding],
        className,
      )}
      style={{
        // Apply safe areas automatically
        paddingTop: padding !== 'none' ? 'var(--padding-safe-top)' : 'var(--safe-area-top)',
        paddingBottom: padding !== 'none' ? 'var(--padding-safe-bottom)' : 'var(--safe-area-bottom)',
        paddingLeft: padding !== 'none' ? 'var(--padding-safe-left)' : 'var(--safe-area-left)',
        paddingRight: padding !== 'none' ? 'var(--padding-safe-right)' : 'var(--safe-area-right)',
      }}
    >
      {children}
    </div>
  );
}
