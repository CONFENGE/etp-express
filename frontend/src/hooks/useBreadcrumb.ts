import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';

/**
 * Route labels mapping for automatic breadcrumb generation.
 * Maps URL segments to human-readable labels.
 */
const routeLabels: Record<string, string> = {
  admin: 'Administração',
  domains: 'Domínios',
  users: 'Usuários',
  etps: 'ETPs',
  manager: 'Gerenciamento',
  dashboard: 'Dashboard',
  new: 'Novo',
  edit: 'Editar',
};

/**
 * Base routes configuration for breadcrumb hierarchy.
 * Defines the parent routes for each section.
 */
const routeHierarchy: Record<string, { label: string; href: string }[]> = {
  '/admin': [],
  '/admin/domains': [{ label: 'Administração', href: '/admin' }],
  '/admin/domains/:id': [
    { label: 'Administração', href: '/admin' },
    { label: 'Domínios', href: '/admin/domains' },
  ],
  '/manager': [],
  '/manager/users': [{ label: 'Gerenciamento', href: '/manager' }],
  '/etps/:id': [{ label: 'ETPs', href: '/etps' }],
};

/**
 * Get the breadcrumb label for a URL segment.
 * Returns the mapped label or capitalizes the segment as fallback.
 */
function getSegmentLabel(segment: string): string {
  // Check if it's a UUID or ID (skip labeling)
  if (
    segment.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    return segment;
  }

  // Check mapped labels
  if (routeLabels[segment]) {
    return routeLabels[segment];
  }

  // Capitalize fallback
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Find the matching route pattern for the current path.
 */
function findRoutePattern(pathname: string): string | null {
  // Direct match
  if (routeHierarchy[pathname]) {
    return pathname;
  }

  // Pattern match with :id
  const patterns = Object.keys(routeHierarchy);
  for (const pattern of patterns) {
    const regex = new RegExp('^' + pattern.replace(/:id/g, '[^/]+') + '$');
    if (regex.test(pathname)) {
      return pattern;
    }
  }

  return null;
}

export interface UseBreadcrumbOptions {
  /**
   * Custom label for the current page.
   * If not provided, will attempt to derive from URL segment.
   */
  currentPageLabel?: string;

  /**
   * Custom breadcrumb items to override automatic generation.
   * When provided, automatic generation is skipped.
   */
  customItems?: BreadcrumbItem[];
}

export interface UseBreadcrumbResult {
  /** Generated breadcrumb items */
  items: BreadcrumbItem[];
  /** Current pathname */
  pathname: string;
}

/**
 * Hook for automatic breadcrumb generation based on current route.
 *
 * Features:
 * - Automatic route parsing and label generation
 * - Support for dynamic segments (:id)
 * - Custom label override for current page
 * - Full custom items override
 *
 * @example
 * ```tsx
 * // Automatic generation
 * const { items } = useBreadcrumb();
 *
 * // With custom current page label
 * const { items } = useBreadcrumb({
 * currentPageLabel: domain?.name || 'Carregando...',
 * });
 *
 * // Full custom items
 * const { items } = useBreadcrumb({
 * customItems: [
 * { label: 'Administração', href: '/admin' },
 * { label: 'Domínios', href: '/admin/domains' },
 * { label: 'example.com' },
 * ],
 * });
 * ```
 */
export function useBreadcrumb(
  options: UseBreadcrumbOptions = {},
): UseBreadcrumbResult {
  const { currentPageLabel, customItems } = options;
  const location = useLocation();
  const params = useParams();

  const items = useMemo(() => {
    // Use custom items if provided
    if (customItems) {
      return customItems;
    }

    const pathname = location.pathname;

    // Try to find a matching route pattern
    const routePattern = findRoutePattern(pathname);

    if (routePattern) {
      // Get hierarchy for this route
      const hierarchy = routeHierarchy[routePattern] || [];

      // Get current page label
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];

      // Determine current page label
      let finalLabel = currentPageLabel;
      if (!finalLabel) {
        // Check if last segment is an ID
        if (params.id && lastSegment === params.id) {
          finalLabel = currentPageLabel || 'Detalhes';
        } else {
          finalLabel = getSegmentLabel(lastSegment);
        }
      }

      // Build breadcrumb items
      const breadcrumbItems: BreadcrumbItem[] = [
        ...hierarchy,
        { label: finalLabel },
      ];

      return breadcrumbItems;
    }

    // Fallback: Generate from pathname segments
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      return [];
    }

    const breadcrumbItems: BreadcrumbItem[] = segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const path = '/' + segments.slice(0, index + 1).join('/');

      // Use custom label for last item
      const label =
        isLast && currentPageLabel
          ? currentPageLabel
          : getSegmentLabel(segment);

      return {
        label,
        href: isLast ? undefined : path,
      };
    });

    return breadcrumbItems;
  }, [location.pathname, params.id, currentPageLabel, customItems]);

  return {
    items,
    pathname: location.pathname,
  };
}
