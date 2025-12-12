import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoToast } from './useUndoToast';

describe('useUndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('showUndoToast', () => {
    it('should add a toast to activeToasts', () => {
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
      });

      expect(result.current.activeToasts).toHaveLength(1);
      expect(result.current.activeToasts[0].message).toBe('Item deleted');
    });

    it('should set countdown to duration/1000', () => {
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
          duration: 5000,
        });
      });

      expect(result.current.activeToasts[0].countdown).toBe(5);
      expect(result.current.activeToasts[0].totalDuration).toBe(5);
    });

    it('should decrement countdown every second', () => {
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
          duration: 5000,
        });
      });

      expect(result.current.activeToasts[0].countdown).toBe(5);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.activeToasts[0].countdown).toBe(4);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.activeToasts[0].countdown).toBe(3);
    });

    it('should call onConfirm after duration expires', async () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 3000,
        });
      });

      expect(onConfirm).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should remove toast after duration expires', async () => {
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
          duration: 3000,
        });
      });

      expect(result.current.activeToasts).toHaveLength(1);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.activeToasts).toHaveLength(0);
    });

    it('should support multiple toasts', () => {
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item 1 deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
        result.current.showUndoToast({
          message: 'Item 2 deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
      });

      expect(result.current.activeToasts).toHaveLength(2);
      expect(result.current.activeToasts[0].message).toBe('Item 1 deleted');
      expect(result.current.activeToasts[1].message).toBe('Item 2 deleted');
    });

    it('should return unique toast ID', () => {
      const { result } = renderHook(() => useUndoToast());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.showUndoToast({
          message: 'Item 1',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
        id2 = result.current.showUndoToast({
          message: 'Item 2',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
      });

      expect(id1!).not.toBe(id2!);
      expect(id1!).toMatch(/^undo-toast-\d+$/);
    });
  });

  describe('handleUndo', () => {
    it('should call undoAction when handleUndo is called', async () => {
      const undoAction = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction,
          onConfirm: vi.fn(),
        });
      });

      await act(async () => {
        await result.current.handleUndo(toastId!);
      });

      expect(undoAction).toHaveBeenCalledTimes(1);
    });

    it('should remove toast when handleUndo is called', async () => {
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm: vi.fn(),
        });
      });

      expect(result.current.activeToasts).toHaveLength(1);

      await act(async () => {
        await result.current.handleUndo(toastId!);
      });

      expect(result.current.activeToasts).toHaveLength(0);
    });

    it('should NOT call onConfirm when handleUndo is called', async () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 3000,
        });
      });

      await act(async () => {
        await result.current.handleUndo(toastId!);
      });

      // Advance time past duration
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should set isProcessing while undo action is running', async () => {
      const undoAction = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction,
          onConfirm: vi.fn(),
        });
      });

      expect(result.current.isProcessing).toBe(false);

      // Start undo but don't await
      let undoPromise: Promise<void>;
      act(() => {
        undoPromise = result.current.handleUndo(toastId!);
      });

      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await undoPromise!;
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it('should do nothing for invalid toast ID', async () => {
      const { result } = renderHook(() => useUndoToast());

      await act(async () => {
        await result.current.handleUndo('invalid-id');
      });

      // Should not throw or affect state
      expect(result.current.activeToasts).toHaveLength(0);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('should remove toast from activeToasts but keep confirm timer', async () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 3000,
        });
      });

      expect(result.current.activeToasts).toHaveLength(1);

      act(() => {
        result.current.dismiss(toastId!);
      });

      expect(result.current.activeToasts).toHaveLength(0);

      // Confirm should still be called after timeout
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('should remove toast and prevent confirm from executing', async () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 3000,
        });
      });

      act(() => {
        result.current.cancel(toastId!);
      });

      expect(result.current.activeToasts).toHaveLength(0);

      // Advance time past duration - confirm should NOT be called
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should remove all toasts and cancel all timers', async () => {
      const onConfirm1 = vi.fn();
      const onConfirm2 = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item 1',
          undoAction: vi.fn(),
          onConfirm: onConfirm1,
          duration: 3000,
        });
        result.current.showUndoToast({
          message: 'Item 2',
          undoAction: vi.fn(),
          onConfirm: onConfirm2,
          duration: 3000,
        });
      });

      expect(result.current.activeToasts).toHaveLength(2);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.activeToasts).toHaveLength(0);

      // Advance time - confirms should NOT be called
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(onConfirm1).not.toHaveBeenCalled();
      expect(onConfirm2).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('should clear all timers on unmount', () => {
      const onConfirm = vi.fn();
      const { result, unmount } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 3000,
        });
      });

      unmount();

      // Advance time - timer should be cleared, confirm should NOT be called
      vi.advanceTimersByTime(5000);

      // Can't directly test this since the component is unmounted,
      // but if timers weren't cleared we'd see errors or memory leaks
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('default duration', () => {
    it('should use 5000ms as default duration', async () => {
      const onConfirm = vi.fn();
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          // No duration specified
        });
      });

      expect(result.current.activeToasts[0].countdown).toBe(5);
      expect(result.current.activeToasts[0].totalDuration).toBe(5);

      // Should call confirm after 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('async callbacks', () => {
    it('should handle async undoAction', async () => {
      const undoAction = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useUndoToast());

      let toastId: string;
      act(() => {
        toastId = result.current.showUndoToast({
          message: 'Item deleted',
          undoAction,
          onConfirm: vi.fn(),
        });
      });

      await act(async () => {
        await result.current.handleUndo(toastId!);
      });

      expect(undoAction).toHaveBeenCalled();
    });

    it('should handle async onConfirm', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useUndoToast());

      act(() => {
        result.current.showUndoToast({
          message: 'Item deleted',
          undoAction: vi.fn(),
          onConfirm,
          duration: 1000,
        });
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        // Wait for the async onConfirm to resolve
        await Promise.resolve();
      });

      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
