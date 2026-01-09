import { useState, useCallback, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

/**
 * Average completion time metric data returned from the API.
 * Part of advanced metrics feature (Issue #1364).
 */
export interface AvgCompletionTimeData {
  /** Average time in minutes */
  avgTimeMinutes: number;
  /** Human-readable formatted duration (e.g., "2 dias 4h") */
  formatted: string;
  /** Number of completed ETPs used for calculation */
  completedCount: number;
}

interface UseAvgCompletionTimeOptions {
  /** Whether to fetch automatically on mount */
  autoFetch?: boolean;
}

interface UseAvgCompletionTimeReturn {
  /** Average completion time data */
  data: AvgCompletionTimeData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Fetch/refresh the average completion time data */
  fetch: () => Promise<void>;
}

/**
 * Hook to fetch ETP average completion time metric.
 *
 * Part of the advanced metrics feature (Issue #1364).
 * Fetches the average time between ETP creation and completion.
 *
 * @param options - Configuration options
 * @returns Average completion time data, loading state, error, and fetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetch } = useAvgCompletionTime();
 *
 * if (data) {
 *   console.log(`Average completion time: ${data.formatted}`);
 * }
 * ```
 */
export function useAvgCompletionTime(
  options: UseAvgCompletionTimeOptions = {},
): UseAvgCompletionTimeReturn {
  const { autoFetch = true } = options;

  const [data, setData] = useState<AvgCompletionTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiHelpers.get<{ data: AvgCompletionTimeData }>(
        `/etps/metrics/avg-completion-time`,
      );
      setData(response.data);
    } catch (err) {
      setError(
        getContextualErrorMessage('carregar', 'tempo medio de criacao', err),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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
