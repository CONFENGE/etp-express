import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  FeatureFlagsState,
  DEFAULT_FLAG_VALUES,
  FLAGS_CACHE_TTL_MS,
} from '@/types/feature-flags';

/**
 * Feature Flags Store
 *
 * Zustand store for managing feature flags state.
 * Handles fetching from API with graceful fallback to defaults.
 *
 * @see #866 - Feature Flags: Integração frontend
 */

interface FeatureFlagsStore extends FeatureFlagsState {
  /** Fetch flags from API */
  fetchFlags: () => Promise<void>;

  /** Check if a specific flag is enabled */
  isEnabled: (flag: string, defaultValue?: boolean) => boolean;

  /** Check if cache is still valid */
  isCacheValid: () => boolean;

  /** Clear flags (for logout) */
  clearFlags: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>((set, get) => ({
  flags: { ...DEFAULT_FLAG_VALUES },
  isLoading: false,
  lastFetchedAt: null,
  error: null,

  fetchFlags: async () => {
    // Skip if already loading
    if (get().isLoading) {
      return;
    }

    // Skip if cache is still valid
    if (get().isCacheValid()) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const flags =
        await apiHelpers.get<Record<string, boolean>>('/api/feature-flags');

      set({
        flags: { ...DEFAULT_FLAG_VALUES, ...flags },
        isLoading: false,
        lastFetchedAt: Date.now(),
        error: null,
      });

      logger.debug('Feature flags fetched successfully', {
        flagCount: Object.keys(flags).length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch feature flags';

      logger.warn('Failed to fetch feature flags, using defaults', {
        error: errorMessage,
      });

      set({
        flags: { ...DEFAULT_FLAG_VALUES },
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  isEnabled: (flag: string, defaultValue?: boolean) => {
    const { flags } = get();

    if (flag in flags) {
      return flags[flag];
    }

    // Use provided default or false
    return defaultValue ?? false;
  },

  isCacheValid: () => {
    const { lastFetchedAt } = get();

    if (!lastFetchedAt) {
      return false;
    }

    return Date.now() - lastFetchedAt < FLAGS_CACHE_TTL_MS;
  },

  clearFlags: () => {
    set({
      flags: { ...DEFAULT_FLAG_VALUES },
      isLoading: false,
      lastFetchedAt: null,
      error: null,
    });
  },
}));
