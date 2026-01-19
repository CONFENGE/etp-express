import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceAlert } from './usePriceAlert';
import api from '@/lib/api';
import { AlertLevel } from '@/types/analytics';

// Mock the API module
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockApiPost = vi.mocked(api.post);

describe('usePriceAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() => usePriceAlert());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.alert).toBeNull();
      expect(result.current.alertLevel).toBeNull();
      expect(result.current.medianPrice).toBeNull();
      expect(result.current.suggestedRange).toBeNull();
      expect(result.current.benchmarkAvailable).toBe(false);
    });

    it('should not call API initially', () => {
      renderHook(() => usePriceAlert());

      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('Price Check with Debounce', () => {
    it('should call API after debounce delay', async () => {
      const mockResponse = {
        data: {
          alertLevel: AlertLevel.WARNING,
          medianPrice: 3450,
          percentageAbove: 44.93,
          suggestedPriceLow: 3200,
          suggestedPriceHigh: 3700,
          benchmarkSampleCount: 245,
          benchmarkUf: 'SP',
          persisted: false,
          benchmarkAvailable: true,
        },
      };
      mockApiPost.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        usePriceAlert({ debounceMs: 500 }),
      );

      act(() => {
        result.current.checkPrice(5000, 'Microcomputador Desktop', 'SP');
      });

      // Should not call API immediately
      expect(mockApiPost).not.toHaveBeenCalled();

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        {
          price: 5000,
          itemDescription: 'Microcomputador Desktop',
          uf: 'SP',
          persistAlert: false,
          etpId: undefined,
        },
        expect.any(Object),
      );
    });

    it('should cancel previous request when new input arrives', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() => usePriceAlert({ debounceMs: 500 }));

      // First check
      act(() => {
        result.current.checkPrice(3000, 'Item A', 'SP');
      });

      // Wait 250ms (halfway)
      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      // Second check arrives
      act(() => {
        result.current.checkPrice(5000, 'Item B', 'RJ');
      });

      // Wait 250ms more
      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      // API should not have been called yet
      expect(mockApiPost).not.toHaveBeenCalled();

      // Complete debounce for second check
      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(mockApiPost).toHaveBeenCalledTimes(1);
      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        expect.objectContaining({
          price: 5000,
          itemDescription: 'Item B',
          uf: 'RJ',
        }),
        expect.any(Object),
      );
    });
  });

  describe('Validation', () => {
    it('should not check price below minPrice', async () => {
      const { result } = renderHook(() =>
        usePriceAlert({ debounceMs: 100, minPrice: 10 }),
      );

      act(() => {
        result.current.checkPrice(5, 'Item', 'SP');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should not check with empty item description', async () => {
      const { result } = renderHook(() => usePriceAlert({ debounceMs: 100 }));

      act(() => {
        result.current.checkPrice(5000, '', 'SP');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should not check with empty UF', async () => {
      const { result } = renderHook(() => usePriceAlert({ debounceMs: 100 }));

      act(() => {
        result.current.checkPrice(5000, 'Item', '');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });

    it('should truncate long item description', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() => usePriceAlert({ debounceMs: 100 }));

      const longDescription = 'A'.repeat(600);

      act(() => {
        result.current.checkPrice(5000, longDescription, 'SP');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        expect.objectContaining({
          itemDescription: 'A'.repeat(500),
        }),
        expect.any(Object),
      );
    });

    it('should uppercase UF', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() => usePriceAlert({ debounceMs: 100 }));

      act(() => {
        result.current.checkPrice(5000, 'Item', 'sp');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        expect.objectContaining({
          uf: 'SP',
        }),
        expect.any(Object),
      );
    });
  });

  describe('Reset Function', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => usePriceAlert());

      // Manually trigger a check
      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.alert).toBeNull();
      expect(result.current.alertLevel).toBeNull();
      expect(result.current.medianPrice).toBeNull();
      expect(result.current.suggestedRange).toBeNull();
      expect(result.current.benchmarkAvailable).toBe(false);
    });

    it('should cancel pending request', async () => {
      const { result } = renderHook(() => usePriceAlert({ debounceMs: 500 }));

      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP');
      });

      // Reset before debounce completes
      act(() => {
        result.current.reset();
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        usePriceAlert({ debounceMs: 500 }),
      );

      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP');
      });

      // Unmount before debounce completes
      unmount();

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // API should not have been called
      expect(mockApiPost).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Accessors', () => {
    it('should return null for all accessors when no alert', () => {
      const { result } = renderHook(() => usePriceAlert());

      expect(result.current.alertLevel).toBeNull();
      expect(result.current.medianPrice).toBeNull();
      expect(result.current.suggestedRange).toBeNull();
      expect(result.current.percentageAbove).toBeNull();
    });
  });

  describe('Options', () => {
    it('should use default debounceMs of 500', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() => usePriceAlert());

      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP');
      });

      // 499ms - should not call yet
      await act(async () => {
        vi.advanceTimersByTime(499);
      });
      expect(mockApiPost).not.toHaveBeenCalled();

      // 1ms more - should call
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(mockApiPost).toHaveBeenCalled();
    });

    it('should pass persistAlert option to API', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() =>
        usePriceAlert({ debounceMs: 100, persistAlert: true }),
      );

      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        expect.objectContaining({
          persistAlert: true,
        }),
        expect.any(Object),
      );
    });

    it('should pass etpId to API when provided', async () => {
      mockApiPost.mockResolvedValue({
        data: { alertLevel: AlertLevel.OK, benchmarkAvailable: true },
      });

      const { result } = renderHook(() => usePriceAlert({ debounceMs: 100 }));

      act(() => {
        result.current.checkPrice(5000, 'Item', 'SP', 'etp-123');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockApiPost).toHaveBeenCalledWith(
        '/analytics/check-price',
        expect.objectContaining({
          etpId: 'etp-123',
        }),
        expect.any(Object),
      );
    });
  });
});
