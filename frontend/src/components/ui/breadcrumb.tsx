import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb item configuration.
 */
export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Navigation href. If undefined, renders as static text (current page) */
  href?: string;
}

/**
 * Props for the Breadcrumb component.
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the home icon as first item. Defaults to true */
  showHome?: boolean;
  /** Home path. Defaults to '/dashboard' */
  homePath?: string;
}

/**
 * Breadcrumb navigation component following Apple HIG design.
 *
 * Features:
 * - Home icon as optional first item
 * - Links for intermediate levels
 * - Static text for current page (last item)
 * - Accessible with proper ARIA labels
 * - Responsive with truncation on mobile
 * - Apple-style transitions and hover states
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Administração', href: '/admin' },
 *     { label: 'Domínios', href: '/admin/domains' },
 *     { label: 'example.com' }, // current page, no href
 *   ]}
 * />
 * ```
 */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className, showHome = true, homePath = '/dashboard' }, ref) => {
    if (items.length === 0) return null;

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center text-sm', className)}
      >
        <ol className="flex items-center gap-1 flex-wrap">
          {/* Home icon */}
          {showHome && (
            <li className="flex items-center">
              <Link
                to={homePath}
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  'transition-colors duration-apple ease-apple',
                  'p-1 rounded-apple hover:bg-surface-secondary',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-apple-accent focus-visible:ring-offset-2',
                )}
                aria-label="Início"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          )}

          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center gap-1">
                {/* Separator */}
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground flex-shrink-0"
                  aria-hidden="true"
                />

                {/* Breadcrumb item */}
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className={cn(
                      'text-muted-foreground hover:text-foreground',
                      'transition-colors duration-apple ease-apple',
                      'px-1.5 py-0.5 rounded-apple hover:bg-surface-secondary',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-apple-accent focus-visible:ring-offset-2',
                      'max-w-[150px] truncate sm:max-w-none',
                    )}
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'text-foreground font-medium',
                      'px-1.5 py-0.5',
                      'max-w-[150px] truncate sm:max-w-[200px] md:max-w-none',
                    )}
                    aria-current={isLast ? 'page' : undefined}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  },
);

Breadcrumb.displayName = 'Breadcrumb';
