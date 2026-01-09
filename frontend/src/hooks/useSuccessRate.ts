import { useState, useCallback, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Success rate metric data returned from the API.
 * Part of advanced metrics feature (Issue #1363).
 */
export interface SuccessRateData {
  /** Success rate percentage (0-100) */
  rate: number;
  /** Trend indicator compared to previous period */
  trend: 'up' | 'down' | 'stable';
  /** Number of completed ETPs in the period */
  completedCount: number;
  /** Total number of ETPs in the period */
  totalCount: number;
  /** Previous period's success rate for comparison */
  previousRate: number;
}

interface UseSuccessRateOptions {
  /** Number of days for the calculation period (default: 30) */
  periodDays?: number;
  /** Whether to fetch automatically on mount */
  autoFetch?: boolean;
}

interface UseSuccessRateReturn {
  /** Success rate data */
  data: SuccessRateData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Fetch/refresh the success rate data */
  fetch: (periodDays?: number) => Promise<void>;
}

/**
 * Hook to fetch ETP success rate metric.
 *
 * Part of the advanced metrics feature (Issue #1363).
 * Fetches the success rate (completed ETPs / total ETPs) with trend indicator.
 *
 * @param options - Configuration options
 * @returns Success rate data, loading state, error, and fetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetch } = useSuccessRate({ periodDays: 30 });
 *
 * if (data) {
 *   console.log(`Success rate: ${data.rate}% (${data.trend})`);
 * }
 * ```
 */
export function useSuccessRate(
  options: UseSuccessRateOptions = {},
): UseSuccessRateReturn {
  const { periodDays = 30, autoFetch = true } = options;

  const [data, setData] = useState<SuccessRateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (days?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryPeriod = days ?? periodDays;
        const response = await apiHelpers.get<{ data: SuccessRateData }>(
          `/etps/metrics/success-rate?periodDays=${queryPeriod}`,
        );
        setData(response.data);
      } catch (err) {
        setError(getContextualErrorMessage('carregar', 'taxa de sucesso', err));
      } finally {
        setIsLoading(false);
      }
    },
    [periodDays],
  );

  useEffect(() => {
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch]);

  return {
    data,
    isLoading,
    error,
    fetch,
  };
}
