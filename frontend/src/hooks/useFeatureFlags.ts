import { useEffect, useCallback, useMemo } from 'react';
import { useFeatureFlagsStore } from '@/store/featureFlagsStore';
import { UseFeatureFlagsResult } from '@/types/feature-flags';
import { useAuth } from './useAuth';

/**
 * Hook for accessing all feature flags at once.
 *
 * Useful when a component needs to check multiple flags.
 * Automatically fetches flags if not loaded and user is authenticated.
 *
 * @returns Object with all flags, loading state, and refetch function
 *
 * @example
 * ```tsx
 * const { flags, isLoading, refetch } = useFeatureFlags();
 *
 * if (isLoading) return <Skeleton />;
 *
 * return (
 *   <div>
 *     {flags.new_dashboard && <NewDashboardBanner />}
 *     {flags.ai_suggestions && <AISuggestionsPanel />}
 *     <button onClick={refetch}>Refresh Flags</button>
 *   </div>
 * );
 * ```
 *
 * @see #866 - Feature Flags: Integração frontend
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const { isAuthenticated } = useAuth();
  const { flags, isLoading, fetchFlags, isCacheValid } = useFeatureFlagsStore();

  // Fetch flags on mount if authenticated and cache is invalid
  useEffect(() => {
    if (isAuthenticated && !isCacheValid()) {
      fetchFlags();
    }
  }, [isAuthenticated, fetchFlags, isCacheValid]);

  // Force refetch (bypasses cache)
  const refetch = useCallback(async () => {
    // Clear cache by setting lastFetchedAt to null through store
    useFeatureFlagsStore.setState({ lastFetchedAt: null });
    await fetchFlags();
  }, [fetchFlags]);

  // Memoize result to prevent unnecessary re-renders
  const result = useMemo(
    (): UseFeatureFlagsResult => ({
      flags,
      isLoading,
      refetch,
    }),
    [flags, isLoading, refetch],
  );

  return result;
}
