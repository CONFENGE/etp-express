import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useETPPreview } from './useETPPreview';
import { useETPStore } from '@/store/etpStore';

// Mock the store
vi.mock('@/store/etpStore', () => ({
  useETPStore: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useETPPreview', () => {
  const mockFetchPreview = vi.fn();
  const mockBlob = new Blob(['mock pdf'], { type: 'application/pdf' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useETPStore).mockReturnValue({
      fetchPreview: mockFetchPreview,
    } as ReturnType<typeof useETPStore>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with closed state', () => {
    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.pdfBlob).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('opens preview and fetches PDF', async () => {
    mockFetchPreview.mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    await act(async () => {
      result.current.openPreview();
    });

    expect(result.current.isOpen).toBe(true);

    await waitFor(() => {
      expect(result.current.pdfBlob).toBe(mockBlob);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchPreview).toHaveBeenCalledWith(
      'test-id',
      expect.any(Object),
    );
  });

  it('sets loading state during fetch', async () => {
    mockFetchPreview.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockBlob), 100)),
    );

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    act(() => {
      result.current.openPreview();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Erro ao carregar preview';
    mockFetchPreview.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    await act(async () => {
      result.current.openPreview();
    });

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.pdfBlob).toBeNull();
    });
  });

  it('closes preview and clears state', async () => {
    mockFetchPreview.mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    // Open and load
    await act(async () => {
      result.current.openPreview();
    });

    await waitFor(() => {
      expect(result.current.pdfBlob).toBe(mockBlob);
    });

    // Close
    act(() => {
      result.current.closePreview();
    });

    expect(result.current.isOpen).toBe(false);

    // State should be cleared after timeout
    await waitFor(
      () => {
        expect(result.current.pdfBlob).toBeNull();
      },
      { timeout: 500 },
    );
  });

  it('retries fetch on retry call', async () => {
    mockFetchPreview.mockRejectedValueOnce(new Error('First error'));
    mockFetchPreview.mockResolvedValueOnce(mockBlob);

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    // First attempt fails
    await act(async () => {
      result.current.openPreview();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('First error');
    });

    // Retry succeeds
    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.pdfBlob).toBe(mockBlob);
      expect(result.current.error).toBeNull();
    });
  });

  it('aborts previous request when opening again', async () => {
    mockFetchPreview.mockImplementation(async () => {
      return new Promise((resolve) => setTimeout(() => resolve(mockBlob), 100));
    });

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    // First open
    act(() => {
      result.current.openPreview();
    });

    // Second open before first completes
    act(() => {
      result.current.openPreview();
    });

    // Should have called fetchPreview twice
    expect(mockFetchPreview).toHaveBeenCalledTimes(2);
  });

  it('handles CanceledError silently', async () => {
    const canceledError = new Error('canceled');
    canceledError.name = 'CanceledError';
    mockFetchPreview.mockRejectedValue(canceledError);

    const { result } = renderHook(() => useETPPreview({ etpId: 'test-id' }));

    await act(async () => {
      result.current.openPreview();
    });

    // Should not set error for canceled requests
    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('aborts request on unmount', async () => {
    mockFetchPreview.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockBlob), 1000)),
    );

    const { result, unmount } = renderHook(() =>
      useETPPreview({ etpId: 'test-id' }),
    );

    act(() => {
      result.current.openPreview();
    });

    // Unmount while loading
    unmount();

    // No error should be thrown
  });
});
