import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { complianceApi } from '@/lib/compliance';
import { ComplianceSuggestion, ChecklistItemCategory } from '@/types/compliance';
import { logger } from '@/lib/logger';

/**
 * Options for the useComplianceAlerts hook.
 */
interface UseComplianceAlertsOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceMs?: number;
  /** Whether to enable automatic validation (default: true) */
  enabled?: boolean;
  /** Filter alerts by category (optional) */
  categoryFilter?: ChecklistItemCategory;
}

/**
 * Return type for the useComplianceAlerts hook.
 */
interface UseComplianceAlertsReturn {
  /** List of compliance alerts for current context */
  alerts: ComplianceSuggestion[];
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Set of dismissed alert IDs */
  dismissedAlerts: Set<string>;
  /** Dismiss an alert by its ID */
  dismissAlert: (alertId: string) => void;
  /** Clear all dismissed alerts */
  clearDismissed: () => void;
  /** Manually trigger validation */
  validate: () => Promise<void>;
  /** Total count of active (non-dismissed) alerts */
  activeCount: number;
  /** Count by priority */
  countByPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Generate a unique ID for an alert based on its properties.
 */
function getAlertId(alert: ComplianceSuggestion): string {
  return `${alert.category}-${alert.title}-${alert.field || 'general'}`;
}

/**
 * Hook for real-time compliance validation with debounce.
 *
 * Monitors content changes and validates against TCU compliance rules
 * with a configurable debounce delay to avoid excessive API calls.
 *
 * Issue #1266 - [Compliance-e] Alertas de nao-conformidade em tempo real
 *
 * @param etpId - ID of the ETP being edited
 * @param content - Current content being edited (triggers revalidation on change)
 * @param sectionNumber - Current section number (for filtering relevant alerts)
 * @param options - Configuration options
 * @returns Alerts, validation state, and control functions
 *
 * @example
 * ```tsx
 * const { alerts, isValidating, dismissAlert, activeCount } = useComplianceAlerts(
 *   etpId,
 *   content,
 *   activeSection,
 *   { debounceMs: 500 }
 * );
 * ```
 */
export function useComplianceAlerts(
  etpId: string,
  content: string,
  sectionNumber: number,
  options: UseComplianceAlertsOptions = {},
): UseComplianceAlertsReturn {
  const { debounceMs = 500, enabled = true, categoryFilter } = options;

  const [alerts, setAlerts] = useState<ComplianceSuggestion[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  // Track last validated content to avoid redundant calls
  const lastValidatedRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map section number to category for filtering (memoized to avoid recreating on each render)
  const sectionToCategory = useMemo<Record<number, ChecklistItemCategory>>(
    () => ({
      1: 'IDENTIFICATION',
      2: 'JUSTIFICATION',
      3: 'REQUIREMENTS',
      4: 'REQUIREMENTS',
      5: 'PRICING',
      6: 'RISKS',
      7: 'CONCLUSION',
      8: 'DOCUMENTATION',
    }),
    [],
  );

  // Use refs to avoid recreation of validate callback on content change
  const contentRef = useRef(content);
  contentRef.current = content;

  const validate = useCallback(async () => {
    if (!etpId || !enabled) {
      return;
    }

    setIsValidating(true);

    try {
      const suggestions = await complianceApi.getSuggestions(etpId);

      // Filter by section category if available
      const currentCategory =
        categoryFilter || sectionToCategory[sectionNumber];
      const filteredAlerts = currentCategory
        ? suggestions.filter((s) => s.category === currentCategory)
        : suggestions;

      setAlerts(filteredAlerts);
      lastValidatedRef.current = contentRef.current;

      logger.debug('Compliance alerts updated', {
        etpId,
        sectionNumber,
        totalAlerts: suggestions.length,
        filteredAlerts: filteredAlerts.length,
      });
    } catch (error) {
      logger.error('Failed to fetch compliance alerts', { error, etpId });
      // Don't clear existing alerts on error - keep last known state
    } finally {
      setIsValidating(false);
    }
  }, [etpId, enabled, categoryFilter, sectionNumber, sectionToCategory]);

  // Debounced validation on content change
  useEffect(() => {
    if (!enabled || !etpId) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip if content hasn't changed
    if (content === lastValidatedRef.current) {
      return;
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      validate();
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, etpId, enabled, debounceMs, validate]);

  // Re-validate when section changes
  useEffect(() => {
    if (enabled && etpId) {
      validate();
    }
  }, [sectionNumber, etpId, enabled, validate]);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedAlerts(new Set());
  }, []);

  // Calculate active (non-dismissed) alerts
  const activeAlerts = alerts.filter(
    (alert) => !dismissedAlerts.has(getAlertId(alert)),
  );

  const countByPriority = {
    high: activeAlerts.filter((a) => a.priority === 'high').length,
    medium: activeAlerts.filter((a) => a.priority === 'medium').length,
    low: activeAlerts.filter((a) => a.priority === 'low').length,
  };

  return {
    alerts: activeAlerts,
    isValidating,
    dismissedAlerts,
    dismissAlert,
    clearDismissed,
    validate,
    activeCount: activeAlerts.length,
    countByPriority,
  };
}

export { getAlertId };
