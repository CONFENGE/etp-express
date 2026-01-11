import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Type of proactive suggestion
 */
export type SuggestionType = 'incomplete' | 'improvement' | 'warning';

/**
 * Priority level for suggestions
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Proactive suggestion data from API
 */
export interface ProactiveSuggestion {
  type: SuggestionType;
  field: string;
  message: string;
  priority: SuggestionPriority;
  helpPrompt?: string;
}

/**
 * Response from suggestions API
 */
interface SuggestionsApiResponse {
  suggestions: ProactiveSuggestion[];
  totalIssues: number;
  highPriorityCount: number;
}

/**
 * Hook options
 */
export interface UseProactiveSuggestionsOptions {
  enabled?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface UseProactiveSuggestionsReturn {
  suggestions: ProactiveSuggestion[];
  isLoading: boolean;
  error: Error | null;
  totalIssues: number;
  highPriorityCount: number;
  refresh: () => Promise<void>;
  getSuggestionForField: (field: string) => ProactiveSuggestion | undefined;
}

/**
 * Custom hook for fetching and managing proactive AI suggestions for an ETP.
 *
 * Features:
 * - Fetches suggestions on mount and when ETP/field changes
 * - Optional auto-refresh at configurable interval
 * - Debounced field changes to avoid excessive API calls
 * - Error handling with retry
 * - Helper to get suggestion for specific field
 *
 * @param etpId - UUID of the ETP being edited
 * @param currentField - Optional current field/section being edited
 * @param options - Configuration options
 * @returns Suggestions state and control functions
 *
 * @example
 * ```tsx
 * const { suggestions, highPriorityCount, getSuggestionForField } = useProactiveSuggestions(
 *   etpId,
 *   'Justificativa',
 *   { refreshInterval: 30000 }
 * );
 *
 * const currentSuggestion = getSuggestionForField('Justificativa');
 * ```
 *
 * Issue #1397 - [CHAT-1167f] Add proactive suggestions and field validation hints
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export function useProactiveSuggestions(
  etpId: string,
  currentField?: string,
  options: UseProactiveSuggestionsOptions = {},
): UseProactiveSuggestionsReturn {
  const { enabled = true, refreshInterval, onError } = options;

  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalIssues, setTotalIssues] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);

  // Track mounted state
  const isMountedRef = useRef(true);

  // Debounce timer for field changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch suggestions from API
   */
  const fetchSuggestions = useCallback(
    async (field?: string) => {
      if (!etpId || !enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = field ? { field } : undefined;
        const response = await api.get<SuggestionsApiResponse>(
          `/chat/etp/${etpId}/suggestions`,
          { params },
        );

        if (!isMountedRef.current) return;

        setSuggestions(response.data.suggestions);
        setTotalIssues(response.data.totalIssues);
        setHighPriorityCount(response.data.highPriorityCount);
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao carregar sugestoes';
        const suggestionsError = new Error(errorMessage);

        setError(suggestionsError);
        onError?.(suggestionsError);

        logger.warn('Failed to fetch proactive suggestions', {
          error: errorMessage,
          etpId,
        });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [etpId, enabled, onError],
  );

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchSuggestions(currentField);
  }, [fetchSuggestions, currentField]);

  /**
   * Get suggestion for a specific field
   */
  const getSuggestionForField = useCallback(
    (field: string): ProactiveSuggestion | undefined => {
      if (!suggestions || suggestions.length === 0) return undefined;
      return suggestions.find(
        (s) => s.field.toLowerCase() === field.toLowerCase(),
      );
    },
    [suggestions],
  );

  // Initial fetch on mount
  useEffect(() => {
    if (!etpId || !enabled) return;

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etpId, enabled]);

  // Debounced fetch when field changes
  useEffect(() => {
    if (!etpId || !enabled) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce field changes to avoid excessive API calls
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(currentField);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentField, fetchSuggestions, etpId, enabled]);

  // Optional auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !enabled || !etpId) return;

    const intervalId = setInterval(() => {
      fetchSuggestions(currentField);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval, enabled, etpId, currentField, fetchSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    totalIssues,
    highPriorityCount,
    refresh,
    getSuggestionForField,
  };
}
