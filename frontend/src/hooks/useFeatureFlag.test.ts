import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeatureFlag } from './useFeatureFlag';
import { useFeatureFlagsStore } from '@/store/featureFlagsStore';
import { useAuthStore } from '@/store/authStore';
import { apiHelpers } from '@/lib/api';
import { FeatureFlag, DEFAULT_FLAG_VALUES } from '@/types/feature-flags';

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

describe('useFeatureFlag', () => {
  const mockFlags = {
    [FeatureFlag.NEW_DASHBOARD]: true,
    [FeatureFlag.AI_SUGGESTIONS]: false,
    [FeatureFlag.EXPORT_V2]: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset feature flags store
    useFeatureFlagsStore.setState({
      flags: { ...DEFAULT_FLAG_VALUES },
      isLoading: false,
      lastFetchedAt: null,
      error: null,
    });

    // Set authenticated user
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        organization: { id: 'org-1', name: 'Test Org' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      isAuthInitialized: true,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return flag enabled status when API succeeds', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockFlags);

      const { result } = renderHook(() =>
        useFeatureFlag(FeatureFlag.NEW_DASHBOARD),
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
    });

    it('should return false for disabled flag', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockFlags);

      const { result } = renderHook(() =>
        useFeatureFlag(FeatureFlag.AI_SUGGESTIONS),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
    });

    it('should use default value when flag is not in response', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce({});

      const { result } = renderHook(() => useFeatureFlag('unknown_flag', true));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
    });

    it('should use false as default when no default provided', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValueOnce({});

      const { result } = renderHook(() => useFeatureFlag('unknown_flag'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(false);
    });
  });

  describe('Fallback behavior', () => {
    it('should use DEFAULT_FLAG_VALUES when API fails', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() =>
        useFeatureFlag(FeatureFlag.AI_SUGGESTIONS),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use default from DEFAULT_FLAG_VALUES
      expect(result.current.enabled).toBe(
        DEFAULT_FLAG_VALUES[FeatureFlag.AI_SUGGESTIONS],
      );
    });

    it('should use provided default when flag not in defaults and API fails', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useFeatureFlag('custom_flag', true));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.enabled).toBe(true);
    });
  });

  describe('Caching behavior', () => {
    it('should not refetch if cache is valid', async () => {
      // Set up valid cache
      useFeatureFlagsStore.setState({
        flags: mockFlags,
        isLoading: false,
        lastFetchedAt: Date.now(),
        error: null,
      });

      renderHook(() => useFeatureFlag(FeatureFlag.NEW_DASHBOARD));

      // Should not call API because cache is valid
      expect(apiHelpers.get).not.toHaveBeenCalled();
    });

    it('should refetch if cache is expired', async () => {
      // Set up expired cache (6 minutes ago, TTL is 5 minutes)
      useFeatureFlagsStore.setState({
        flags: mockFlags,
        isLoading: false,
        lastFetchedAt: Date.now() - 6 * 60 * 1000,
        error: null,
      });

      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockFlags);

      renderHook(() => useFeatureFlag(FeatureFlag.NEW_DASHBOARD));

      await waitFor(() => {
        expect(apiHelpers.get).toHaveBeenCalledWith('/api/feature-flags');
      });
    });
  });

  describe('Authentication handling', () => {
    it('should not fetch if user is not authenticated', () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAuthInitialized: true,
        error: null,
      });

      const { result } = renderHook(() =>
        useFeatureFlag(FeatureFlag.NEW_DASHBOARD),
      );

      // Should not call API
      expect(apiHelpers.get).not.toHaveBeenCalled();

      // Should return default value
      expect(result.current.enabled).toBe(
        DEFAULT_FLAG_VALUES[FeatureFlag.NEW_DASHBOARD],
      );
    });
  });

  describe('Loading state', () => {
    it('should show loading state while fetching', async () => {
      // Delay the API response
      vi.mocked(apiHelpers.get).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockFlags), 100)),
      );

      const { result } = renderHook(() =>
        useFeatureFlag(FeatureFlag.NEW_DASHBOARD),
      );

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
