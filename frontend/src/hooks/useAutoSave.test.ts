import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  let mockOnLine: boolean;
  let originalNavigator: Navigator;

  beforeEach(() => {
    vi.useFakeTimers();
    originalNavigator = window.navigator;
    mockOnLine = true;

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        get onLine() {
          return mockOnLine;
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('Initial State', () => {
    it('should start with idle status', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave('initial content', { onSave }),
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isOnline).toBe(true);
    });

    it('should reflect offline state from navigator', () => {
      mockOnLine = false;
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave('initial content', { onSave }),
      );

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Debounced Auto-Save', () => {
    it('should set pending status when content changes', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 1000 }),
        { initialProps: { content: 'initial' } },
      );

      // Change content
      rerender({ content: 'changed content' });

      expect(result.current.status).toBe('pending');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should trigger save after delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 1000 }),
        { initialProps: { content: 'initial' } },
      );

      // Change content
      rerender({ content: 'changed content' });

      expect(result.current.status).toBe('pending');

      // Advance timer past debounce delay
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on subsequent changes', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 1000 }),
        { initialProps: { content: 'initial' } },
      );

      // First change
      rerender({ content: 'change 1' });

      // Advance halfway through delay
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onSave).not.toHaveBeenCalled();

      // Second change - should reset timer
      rerender({ content: 'change 2' });

      // Advance another 500ms (total 1000ms from first change, 500ms from second)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should not have saved yet (timer was reset)
      expect(onSave).not.toHaveBeenCalled();

      // Advance remaining 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Now should have saved
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should not trigger save when content returns to original', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 1000 }),
        { initialProps: { content: 'initial' } },
      );

      // Change content
      rerender({ content: 'changed' });
      expect(result.current.status).toBe('pending');

      // Change back to original
      rerender({ content: 'initial' });

      // Advance timer
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should not have saved since content is same as initial
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Save Status', () => {
    it('should set saving status during save operation', async () => {
      let resolveSave: () => void;
      const onSave = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          }),
      );

      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 100 }),
        { initialProps: { content: 'initial' } },
      );

      // Change content
      rerender({ content: 'changed' });

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('saving');

      // Resolve save
      await act(async () => {
        resolveSave!();
      });

      expect(result.current.status).toBe('saved');
    });

    it('should call onSuccess after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      const { rerender } = renderHook(
        ({ content }) =>
          useAutoSave(content, { onSave, onSuccess, delay: 100 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      await act(async () => {
        vi.advanceTimersByTime(100);
        // Allow promises to resolve
        await vi.runAllTimersAsync();
      });

      expect(onSave).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call onError on save failure', async () => {
      const saveError = new Error('Save failed');
      const onSave = vi.fn().mockRejectedValue(saveError);
      const onError = vi.fn();

      const { rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, onError, delay: 100 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      await act(async () => {
        vi.advanceTimersByTime(100);
        await vi.runAllTimersAsync();
      });

      expect(onSave).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(saveError);
    });
  });

  describe('Offline Behavior', () => {
    it('should set offline status when going offline', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave('content', { onSave }));

      expect(result.current.isOnline).toBe(true);

      await act(async () => {
        mockOnLine = false;
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.status).toBe('offline');
    });

    it('should queue save when offline', async () => {
      mockOnLine = false;
      const onSave = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 100 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should not have called onSave when offline
      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('offline');
    });
  });

  describe('Force Save', () => {
    it('should save immediately when forceSave is called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 30000 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      expect(result.current.status).toBe('pending');

      await act(async () => {
        await result.current.forceSave();
      });

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should clear pending debounce timer when forceSave is called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 30000 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      await act(async () => {
        await result.current.forceSave();
      });

      // Advance past original debounce
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      // Should only have been called once (from forceSave)
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry', () => {
    it('should provide retry function', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useAutoSave('content', { onSave }));

      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('Enabled Option', () => {
    it('should not auto-save when disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content, enabled }) =>
          useAutoSave(content, { onSave, delay: 100, enabled }),
        { initialProps: { content: 'initial', enabled: false } },
      );

      rerender({ content: 'changed', enabled: false });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });

    it('should start auto-saving when enabled becomes true', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, rerender } = renderHook(
        ({ content, enabled }) =>
          useAutoSave(content, { onSave, delay: 100, enabled }),
        { initialProps: { content: 'initial', enabled: false } },
      );

      // Enable auto-save with changed content
      rerender({ content: 'changed', enabled: true });

      expect(result.current.status).toBe('pending');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear timers on unmount', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { rerender, unmount } = renderHook(
        ({ content }) => useAutoSave(content, { onSave, delay: 1000 }),
        { initialProps: { content: 'initial' } },
      );

      rerender({ content: 'changed' });

      // Unmount before timer fires
      unmount();

      // Advance past delay
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Save should not have been called
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should remove event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const onSave = vi.fn().mockResolvedValue(undefined);

      const { unmount } = renderHook(() => useAutoSave('content', { onSave }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function),
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
