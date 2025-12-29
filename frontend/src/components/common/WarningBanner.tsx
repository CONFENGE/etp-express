import { AlertTriangle } from 'lucide-react';
import { WARNING_MESSAGE } from '@/lib/constants';

/**
 * WarningBanner - Subtle AI disclaimer banner following design system (#1049)
 *
 * Design principles:
 * - Uses warm gray palette (#1011) instead of saturated yellow
 * - Glass-subtle effect for modern, non-intrusive appearance (#1012)
 * - Reduced padding for less visual weight
 * - WCAG 2.1 AA compliant contrast ratios maintained
 */
export function WarningBanner() {
  return (
    <div
      className="sticky top-0 z-50 w-full glass-subtle border-b border-[var(--border-secondary)]"
      style={{
        // Fallback for browsers without backdrop-filter support
        backgroundColor: 'var(--surface-secondary)',
      }}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <AlertTriangle
            className="h-4 w-4 flex-shrink-0 text-[var(--apple-orange)]"
            aria-hidden="true"
          />
          <p
            className="text-xs font-medium text-center tracking-wide"
            role="alert"
          >
            {WARNING_MESSAGE}
          </p>
        </div>
      </div>
    </div>
  );
}
