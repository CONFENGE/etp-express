import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureFlagsStore } from './featureFlagsStore';
import { apiHelpers } from '@/lib/api';
import {
  FeatureFlag,
  DEFAULT_FLAG_VALUES,
  FLAGS_CACHE_TTL_MS,
} from '@/types/feature-flags';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('featureFlagsStore', () => {
  const mockFlags = {
    [FeatureFlag.NEW_DASHBOARD]: true,
    [FeatureFlag.AI_SUGGESTIONS]: false,
    [FeatureFlag.EXPORT_V2]: true,
    [FeatureFlag.ADVANCED_ANALYTICS]: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    useFeatureFlagsStore.setState({
      flags: { ...DEFAULT_FLAG_VALUES },
      isLoading: false,
      lastFetchedAt: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with default flag values', () => {
      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.flags).toEqual(DEFAULT_FLAG_VALUES);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastFetchedAt).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchFlags', () => {
    it('should fetch and merge flags from API', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockFlags);

      const { result } = renderHook(() => useFeatureFlagsStore());

      await act(async () => {
        await result.current.fetchFlags();
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/api/feature-flags');
      expect(result.current.flags[FeatureFlag.NEW_DASHBOARD]).toBe(true);
      expect(result.current.flags[FeatureFlag.AI_SUGGESTIONS]).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastFetchedAt).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: unknown) => void;
      vi.mocked(apiHelpers.get).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useFeatureFlagsStore());

      act(() => {
        result.current.fetchFlags();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockFlags);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should use defaults when API fails', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useFeatureFlagsStore());

      await act(async () => {
        await result.current.fetchFlags();
      });

      expect(result.current.flags).toEqual(DEFAULT_FLAG_VALUES);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should not fetch if already loading', async () => {
      useFeatureFlagsStore.setState({ isLoading: true });

      const { result } = renderHook(() => useFeatureFlagsStore());

      await act(async () => {
        await result.current.fetchFlags();
      });

      expect(apiHelpers.get).not.toHaveBeenCalled();
    });

    it('should not fetch if cache is valid', async () => {
      useFeatureFlagsStore.setState({
        flags: mockFlags,
        lastFetchedAt: Date.now(),
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      await act(async () => {
        await result.current.fetchFlags();
      });

      expect(apiHelpers.get).not.toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled flag', () => {
      useFeatureFlagsStore.setState({
        flags: { ...DEFAULT_FLAG_VALUES, [FeatureFlag.NEW_DASHBOARD]: true },
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isEnabled(FeatureFlag.NEW_DASHBOARD)).toBe(true);
    });

    it('should return false for disabled flag', () => {
      useFeatureFlagsStore.setState({
        flags: { ...DEFAULT_FLAG_VALUES, [FeatureFlag.NEW_DASHBOARD]: false },
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isEnabled(FeatureFlag.NEW_DASHBOARD)).toBe(false);
    });

    it('should return default value for unknown flag', () => {
      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isEnabled('unknown_flag', true)).toBe(true);
      expect(result.current.isEnabled('unknown_flag', false)).toBe(false);
      expect(result.current.isEnabled('unknown_flag')).toBe(false);
    });
  });

  describe('isCacheValid', () => {
    it('should return false if never fetched', () => {
      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isCacheValid()).toBe(false);
    });

    it('should return true if fetched within TTL', () => {
      useFeatureFlagsStore.setState({
        lastFetchedAt: Date.now() - 1000, // 1 second ago
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isCacheValid()).toBe(true);
    });

    it('should return false if cache expired', () => {
      useFeatureFlagsStore.setState({
        lastFetchedAt: Date.now() - FLAGS_CACHE_TTL_MS - 1000, // TTL + 1 second ago
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      expect(result.current.isCacheValid()).toBe(false);
    });
  });

  describe('clearFlags', () => {
    it('should reset to default state', () => {
      useFeatureFlagsStore.setState({
        flags: mockFlags,
        isLoading: true,
        lastFetchedAt: Date.now(),
        error: 'Some error',
      });

      const { result } = renderHook(() => useFeatureFlagsStore());

      act(() => {
        result.current.clearFlags();
      });

      expect(result.current.flags).toEqual(DEFAULT_FLAG_VALUES);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastFetchedAt).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
