import { useState, useCallback, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import type { CheckPriceResponse, AlertLevel } from '@/types/analytics';

/**
 * Hook state for price alert.
 */
export interface PriceAlertState {
  /** Whether a price check is in progress */
  isLoading: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Alert response from backend (null if not checked or no benchmark) */
  alert: CheckPriceResponse | null;
  /** Whether benchmark data is available for this check */
  benchmarkAvailable: boolean;
}

/**
 * Hook options for customization.
 */
export interface UsePriceAlertOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceMs?: number;
  /** Minimum price value to trigger check (default: 1) */
  minPrice?: number;
  /** Whether to persist alerts to database (default: false for wizard) */
  persistAlert?: boolean;
}

/**
 * Hook return value.
 */
export interface UsePriceAlertReturn extends PriceAlertState {
  /** Check price against benchmark */
  checkPrice: (
    price: number,
    itemDescription: string,
    uf: string,
    etpId?: string,
  ) => void;
  /** Reset alert state */
  reset: () => void;
  /** Current alert level (convenience accessor) */
  alertLevel: AlertLevel | null;
  /** Median price (convenience accessor) */
  medianPrice: number | null;
  /** Suggested price range (convenience accessor) */
  suggestedRange: { low: number; high: number } | null;
  /** Percentage deviation from median */
  percentageAbove: number | null;
}

/**
 * Hook for checking prices against regional benchmarks with debounce.
 *
 * This hook integrates with the overprice alert system (Issue #1272) to provide
 * real-time feedback during ETP creation (Issue #1274).
 *
 * Features:
 * - Debounced API calls to avoid excessive requests
 * - Silent error handling (doesn't break UX on API failure)
 * - Caches last check to avoid redundant calls
 * - Clean reset on unmount
 *
 * @param options - Configuration options
 * @returns Price alert state and control functions
 *
 * @example
 * ```tsx
 * const priceAlert = usePriceAlert({ debounceMs: 500 });
 *
 * // When user changes price field
 * useEffect(() => {
 *   if (valorUnitario > 0) {
 *     priceAlert.checkPrice(valorUnitario, objeto, 'SP');
 *   }
 * }, [valorUnitario]);
 *
 * // Render alert badge
 * {priceAlert.alertLevel && (
 *   <PriceAlertBadge
 *     alertLevel={priceAlert.alertLevel}
 *     medianPrice={priceAlert.medianPrice}
 *     suggestedRange={priceAlert.suggestedRange}
 *   />
 * )}
 * ```
 */
export function usePriceAlert(
  options: UsePriceAlertOptions = {},
): UsePriceAlertReturn {
  const { debounceMs = 500, minPrice = 1, persistAlert = false } = options;

  const [state, setState] = useState<PriceAlertState>({
    isLoading: false,
    error: null,
    alert: null,
    benchmarkAvailable: false,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    lastCheckRef.current = null;
    setState({
      isLoading: false,
      error: null,
      alert: null,
      benchmarkAvailable: false,
    });
  }, []);

  const checkPrice = useCallback(
    (price: number, itemDescription: string, uf: string, etpId?: string) => {
      // Clear any pending check
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Validate inputs
      if (price < minPrice || !itemDescription.trim() || !uf.trim()) {
        reset();
        return;
      }

      // Create unique key for this check
      const checkKey = `${price}-${itemDescription}-${uf}`;

      // Skip if same check
      if (checkKey === lastCheckRef.current) {
        return;
      }

      // Debounce the API call
      timeoutRef.current = setTimeout(async () => {
        // Abort any in-flight request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const response = await api.post<CheckPriceResponse>(
            '/analytics/check-price',
            {
              price,
              itemDescription: itemDescription.substring(0, 500), // Limit to backend max
              uf: uf.toUpperCase().substring(0, 2),
              persistAlert,
              etpId,
            },
            { signal: abortControllerRef.current?.signal },
          );

          lastCheckRef.current = checkKey;

          setState({
            isLoading: false,
            error: null,
            alert: response.data,
            benchmarkAvailable: response.data.benchmarkAvailable,
          });
        } catch (error) {
          // Silent fail - don't break UX on API failure
          // Only log for debugging, don't set error state
          if ((error as Error).name !== 'CanceledError') {
            logger.warn('Price check failed (non-blocking)', {
              error: error instanceof Error ? error.message : String(error),
            });
            setState((prev) => ({
              ...prev,
              isLoading: false,
              // Don't set error - silent fail
              alert: null,
              benchmarkAvailable: false,
            }));
          }
        }
      }, debounceMs);
    },
    [debounceMs, minPrice, persistAlert, reset],
  );

  // Convenience accessors
  const alertLevel = state.alert?.alertLevel ?? null;
  const medianPrice = state.alert?.medianPrice ?? null;
  const suggestedRange = state.alert
    ? {
        low: state.alert.suggestedPriceLow,
        high: state.alert.suggestedPriceHigh,
      }
    : null;
  const percentageAbove = state.alert?.percentageAbove ?? null;

  return {
    ...state,
    checkPrice,
    reset,
    alertLevel,
    medianPrice,
    suggestedRange,
    percentageAbove,
  };
}
