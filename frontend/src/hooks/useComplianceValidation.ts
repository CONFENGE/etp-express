import { useState, useCallback, useEffect } from 'react';
import { complianceApi } from '@/lib/compliance';
import { getContextualErrorMessage } from '@/lib/api-errors';
import { ComplianceScoreSummary } from '@/types/compliance';

/**
 * Options for the useComplianceValidation hook.
 */
interface UseComplianceValidationOptions {
  /** Whether to fetch automatically on mount (default: true) */
  autoFetch?: boolean;
  /** Refetch interval in milliseconds (default: 30000 = 30s) */
  refetchInterval?: number;
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
}

/**
 * Return type for the useComplianceValidation hook.
 */
interface UseComplianceValidationReturn {
  /** Compliance score summary data */
  data: ComplianceScoreSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and track compliance validation score for an ETP.
 *
 * Provides real-time compliance score with automatic polling.
 * Used by ComplianceScorecard to display TCU conformity status.
 *
 * Issue #1386 - [TCU-1163e] Componente indicador de conformidade no ETP Editor
 *
 * @param etpId - ID of the ETP to validate (empty string disables fetching)
 * @param options - Configuration options
 * @returns Score data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useComplianceValidation(etpId, {
 *   refetchInterval: 30000, // Re-validate every 30s
 * });
 *
 * if (data) {
 *   console.log(`Compliance score: ${data.score}% (${data.status})`);
 * }
 * ```
 */
export function useComplianceValidation(
  etpId: string,
  options: UseComplianceValidationOptions = {},
): UseComplianceValidationReturn {
  const {
    autoFetch = true,
    refetchInterval = 30000,
    enablePolling = true,
  } = options;

  const [data, setData] = useState<ComplianceScoreSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!etpId) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await complianceApi.getScore(etpId);
      setData(result);
    } catch (err) {
      setError(
        getContextualErrorMessage('validar', 'conformidade do ETP', err),
      );
    } finally {
      setIsLoading(false);
    }
  }, [etpId]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && etpId) {
      fetch();
    }
  }, [autoFetch, etpId, fetch]);

  // Polling
  useEffect(() => {
    if (!enablePolling || !etpId || refetchInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetch();
    }, refetchInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enablePolling, etpId, refetchInterval, fetch]);

  return {
    data,
    isLoading,
    error,
    refetch: fetch,
  };
}
