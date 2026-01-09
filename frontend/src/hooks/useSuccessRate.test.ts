import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSuccessRate, type SuccessRateData } from './useSuccessRate';

// Mock the API module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
  },
  default: {},
}));

// Mock the error handling module
vi.mock('@/lib/api-errors', () => ({
  getContextualErrorMessage: vi.fn(
    (action, resource, _error) => `Erro ao ${action} ${resource}`,
  ),
}));

import { apiHelpers } from '@/lib/api';

describe('useSuccessRate', () => {
  const mockSuccessRateData: SuccessRateData = {
    rate: 75.5,
    trend: 'up',
    completedCount: 15,
    totalCount: 20,
    previousRate: 60.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch success rate on mount when autoFetch is true', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockSuccessRateData });

    const { result } = renderHook(() => useSuccessRate({ autoFetch: true }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSuccessRateData);
    expect(apiHelpers.get).toHaveBeenCalledWith(
      '/etps/metrics/success-rate?periodDays=30',
    );
  });

  it('should not fetch on mount when autoFetch is false', async () => {
    const { result } = renderHook(() => useSuccessRate({ autoFetch: false }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(apiHelpers.get).not.toHaveBeenCalled();
  });

  it('should use custom periodDays parameter', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockSuccessRateData });

    renderHook(() => useSuccessRate({ periodDays: 7, autoFetch: true }));

    await waitFor(() => {
      expect(apiHelpers.get).toHaveBeenCalledWith(
        '/etps/metrics/success-rate?periodDays=7',
      );
    });
  });

  it('should handle API errors', async () => {
    vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSuccessRate({ autoFetch: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Erro ao carregar taxa de sucesso');
    expect(result.current.data).toBeNull();
  });

  it('should allow manual fetch with custom period', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockSuccessRateData });

    const { result } = renderHook(() => useSuccessRate({ autoFetch: false }));

    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.fetch(90);
    });

    expect(apiHelpers.get).toHaveBeenCalledWith(
      '/etps/metrics/success-rate?periodDays=90',
    );
    expect(result.current.data).toEqual(mockSuccessRateData);
  });

  it('should clear error on new fetch', async () => {
    vi.mocked(apiHelpers.get)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockSuccessRateData });

    const { result } = renderHook(() => useSuccessRate({ autoFetch: true }));

    await waitFor(() => {
      expect(result.current.error).toBe('Erro ao carregar taxa de sucesso');
    });

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockSuccessRateData);
  });

  it('should set isLoading to false after successful fetch', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockSuccessRateData });

    const { result } = renderHook(() => useSuccessRate({ autoFetch: false }));

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockSuccessRateData);
  });
});
