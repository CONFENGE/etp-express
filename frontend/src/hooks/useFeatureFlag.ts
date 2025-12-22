import { useEffect, useMemo } from 'react';
import { useFeatureFlagsStore } from '@/store/featureFlagsStore';
import { UseFeatureFlagResult, FeatureFlag } from '@/types/feature-flags';
import { useAuth } from './useAuth';

/**
 * Hook for checking if a specific feature flag is enabled.
 *
 * Automatically fetches flags if not loaded and user is authenticated.
 * Returns default value while loading or if API fails.
 *
 * @param flag - The feature flag to check (use FeatureFlag enum)
 * @param defaultValue - Default value if flag is not found (default: false)
 * @returns Object with enabled status and loading state
 *
 * @example
 * ```tsx
 * const { enabled, isLoading } = useFeatureFlag(FeatureFlag.NEW_DASHBOARD);
 *
 * if (isLoading) return <Skeleton />;
 * if (!enabled) return <OldDashboard />;
 * return <NewDashboard />;
 * ```
 *
 * @see #866 - Feature Flags: Integração frontend
 */
export function useFeatureFlag(
  flag: FeatureFlag | string,
  defaultValue: boolean = false,
): UseFeatureFlagResult {
  const { isAuthenticated } = useAuth();
  const { isLoading, fetchFlags, isEnabled, isCacheValid } =
    useFeatureFlagsStore();

  // Fetch flags on mount if authenticated and cache is invalid
  useEffect(() => {
    if (isAuthenticated && !isCacheValid()) {
      fetchFlags();
    }
  }, [isAuthenticated, fetchFlags, isCacheValid]);

  // Memoize result to prevent unnecessary re-renders
  const result = useMemo(
    (): UseFeatureFlagResult => ({
      enabled: isEnabled(flag, defaultValue),
      isLoading,
    }),
    [flag, defaultValue, isEnabled, isLoading],
  );

  return result;
}
