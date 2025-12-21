/**
 * Feature Flags Types
 *
 * Type definitions for frontend feature flags integration.
 * Synchronized with backend types from feature-flags.types.ts
 *
 * @see #866 - Feature Flags: Integração frontend
 */

/**
 * Available feature flags in the system.
 * Must be kept in sync with backend FeatureFlag enum.
 */
export enum FeatureFlag {
  // Staged rollout flags (#110)
  STAGED_ROLLOUT_ALPHA = 'staged_rollout_alpha',
  STAGED_ROLLOUT_BETA = 'staged_rollout_beta',
  STAGED_ROLLOUT_GA = 'staged_rollout_ga',

  // Feature-specific flags
  NEW_DASHBOARD = 'new_dashboard',
  AI_SUGGESTIONS = 'ai_suggestions',
  EXPORT_V2 = 'export_v2',
  ADVANCED_ANALYTICS = 'advanced_analytics',
}

/**
 * Feature flags state for the store
 */
export interface FeatureFlagsState {
  /** Map of flag keys to their enabled status */
  flags: Record<string, boolean>;

  /** Whether flags are currently being fetched */
  isLoading: boolean;

  /** Last successful fetch timestamp (for cache invalidation) */
  lastFetchedAt: number | null;

  /** Error message if last fetch failed */
  error: string | null;
}

/**
 * Result of useFeatureFlag hook
 */
export interface UseFeatureFlagResult {
  /** Whether the flag is enabled */
  enabled: boolean;

  /** Whether flags are currently loading */
  isLoading: boolean;
}

/**
 * Result of useFeatureFlags hook
 */
export interface UseFeatureFlagsResult {
  /** Map of all flags to their enabled status */
  flags: Record<string, boolean>;

  /** Whether flags are currently loading */
  isLoading: boolean;

  /** Manually refetch flags */
  refetch: () => Promise<void>;
}

/**
 * Default values for feature flags when API is unavailable
 */
export const DEFAULT_FLAG_VALUES: Record<string, boolean> = {
  [FeatureFlag.STAGED_ROLLOUT_ALPHA]: false,
  [FeatureFlag.STAGED_ROLLOUT_BETA]: false,
  [FeatureFlag.STAGED_ROLLOUT_GA]: true,
  [FeatureFlag.NEW_DASHBOARD]: false,
  [FeatureFlag.AI_SUGGESTIONS]: true,
  [FeatureFlag.EXPORT_V2]: false,
  [FeatureFlag.ADVANCED_ANALYTICS]: false,
};

/** Cache TTL in milliseconds (5 minutes) */
export const FLAGS_CACHE_TTL_MS = 5 * 60 * 1000;
