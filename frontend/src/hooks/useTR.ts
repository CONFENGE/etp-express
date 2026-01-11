import { useTRStore } from '@/store/trStore';

/**
 * Hook wrapper for Termo de Referencia operations.
 *
 * Provides a clean interface to the TR store, following the same
 * pattern as useETPs.ts for consistency.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 * @see Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 *
 * @example
 * ```tsx
 * const { currentTR, fetchTR, updateTR, isLoading, error } = useTR();
 *
 * useEffect(() => {
 *   fetchTR(id);
 * }, [id, fetchTR]);
 * ```
 */
export function useTR() {
  const {
    trs,
    currentTR,
    isLoading,
    isGenerating,
    error,
    fetchTRs,
    fetchTRsByEtp,
    fetchTR,
    generateFromEtp,
    updateTR,
    deleteTR,
    setCurrentTR,
    clearError,
    resetStore,
  } = useTRStore();

  return {
    // Data
    trs,
    currentTR,

    // Loading states
    isLoading,
    isGenerating,
    error,

    // Operations
    fetchTRs,
    fetchTRsByEtp,
    fetchTR,
    generateFromEtp,
    updateTR,
    deleteTR,
    setCurrentTR,

    // Utility
    clearError,
    resetStore,
  };
}
