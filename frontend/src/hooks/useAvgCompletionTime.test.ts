import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useAvgCompletionTime,
  type AvgCompletionTimeData,
} from './useAvgCompletionTime';

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

describe('useAvgCompletionTime', () => {
  const mockAvgTimeData: AvgCompletionTimeData = {
    avgTimeMinutes: 2880, // 2 days
    formatted: '2 dias',
    completedCount: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch average completion time on mount when autoFetch is true', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockAvgTimeData });

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: true }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockAvgTimeData);
    expect(apiHelpers.get).toHaveBeenCalledWith(
      '/etps/metrics/avg-completion-time',
    );
  });

  it('should not fetch on mount when autoFetch is false', async () => {
    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(apiHelpers.get).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      'Erro ao carregar tempo medio de criacao',
    );
    expect(result.current.data).toBeNull();
  });

  it('should allow manual fetch', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockAvgTimeData });

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: false }),
    );

    expect(result.current.data).toBeNull();

    await act(async () => {
      await result.current.fetch();
    });

    expect(apiHelpers.get).toHaveBeenCalledWith(
      '/etps/metrics/avg-completion-time',
    );
    expect(result.current.data).toEqual(mockAvgTimeData);
  });

  it('should clear error on new fetch', async () => {
    vi.mocked(apiHelpers.get)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockAvgTimeData });

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: true }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Erro ao carregar tempo medio de criacao',
      );
    });

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockAvgTimeData);
  });

  it('should set isLoading to false after successful fetch', async () => {
    vi.mocked(apiHelpers.get).mockResolvedValue({ data: mockAvgTimeData });

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: false }),
    );

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockAvgTimeData);
  });

  it('should handle zero completed ETPs', async () => {
    const noDataResponse: AvgCompletionTimeData = {
      avgTimeMinutes: 0,
      formatted: 'Sem dados',
      completedCount: 0,
    };

    vi.mocked(apiHelpers.get).mockResolvedValue({ data: noDataResponse });

    const { result } = renderHook(() =>
      useAvgCompletionTime({ autoFetch: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(noDataResponse);
    expect(result.current.data?.completedCount).toBe(0);
    expect(result.current.data?.formatted).toBe('Sem dados');
  });
});
