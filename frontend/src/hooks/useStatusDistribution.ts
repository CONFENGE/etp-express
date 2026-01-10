import { useState, useCallback, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Single status distribution item.
 * Part of advanced metrics feature (Issue #1365).
 * Includes index signature for Recharts compatibility.
 */
export interface StatusDistributionItem {
  /** Status key (e.g., 'draft', 'in_progress') */
  status: string;
  /** Localized label (e.g., 'Rascunho', 'Em Andamento') */
  label: string;
  /** Count of ETPs in this status */
  count: number;
  /** Percentage of total ETPs */
  percentage: number;
  /** Color for the chart segment */
  color: string;
  /** Index signature for Recharts compatibility */
  [key: string]: string | number;
}

/**
 * Status distribution data returned from the API.
 * Part of advanced metrics feature (Issue #1365).
 */
export type StatusDistributionData = StatusDistributionItem[];

interface UseStatusDistributionOptions {
  /** Number of days for the calculation period (default: 0 = all time) (#1366) */
  periodDays?: number;
  /** Whether to fetch automatically on mount */
  autoFetch?: boolean;
}

interface UseStatusDistributionReturn {
  /** Status distribution data */
  data: StatusDistributionData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Fetch/refresh the distribution data */
  fetch: (periodDays?: number) => Promise<void>;
}

/**
 * Hook to fetch ETP status distribution metric.
 *
 * Part of the advanced metrics feature (Issue #1365).
 * Updated in Issue #1366 to support period filtering.
 * Fetches the distribution of ETPs by status for donut chart visualization.
 *
 * @param options - Configuration options
 * @returns Status distribution data, loading state, error, and fetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetch } = useStatusDistribution({ periodDays: 30 });
 *
 * if (data) {
 *   console.log(`Total statuses: ${data.length}`);
 *   data.forEach(item => {
 *     console.log(`${item.label}: ${item.count} (${item.percentage}%)`);
 *   });
 * }
 * ```
 */
export function useStatusDistribution(
  options: UseStatusDistributionOptions = {},
): UseStatusDistributionReturn {
  const { periodDays = 0, autoFetch = true } = options;

  const [data, setData] = useState<StatusDistributionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (days?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const queryPeriod = days ?? periodDays;
        // Build query string - only add periodDays if > 0 (#1366)
        const queryParams = queryPeriod > 0 ? `?periodDays=${queryPeriod}` : '';
        const response = await apiHelpers.get<{ data: StatusDistributionData }>(
          `/etps/metrics/distribution-by-status${queryParams}`,
        );
        setData(response.data);
      } catch (err) {
        setError(
          getContextualErrorMessage('carregar', 'distribuicao por status', err),
        );
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
