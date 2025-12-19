import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Configuration for an undo toast notification
 */
export interface UndoToastConfig {
  /** Message to display in the toast */
  message: string;
  /** Callback to execute if user clicks undo (before timeout) */
  undoAction: () => void | Promise<void>;
  /** Callback to execute when timeout completes without undo */
  onConfirm: () => void | Promise<void>;
  /** Duration in milliseconds before action is confirmed (default: 5000ms) */
  duration?: number;
}

/**
 * State of an active undo toast
 */
export interface UndoToastState {
  /** Unique identifier for the toast */
  id: string;
  /** Display message */
  message: string;
  /** Remaining seconds before auto-confirm */
  countdown: number;
  /** Total duration in seconds */
  totalDuration: number;
}

let toastIdCounter = 0;

/**
 * Hook for managing undo toasts with countdown timers.
 * Provides a safety net for destructive actions by allowing users
 * to undo within a configurable time window.
 *
 * @example
 * ```tsx
 * const { showUndoToast, handleUndo, dismiss, activeToasts, isProcessing } = useUndoToast();
 *
 * const handleDelete = async (id: string) => {
 * // Hide item from UI immediately (optimistic)
 * hideItem(id);
 *
 * showUndoToast({
 * message: 'Item excluído',
 * undoAction: () => restoreItem(id),
 * onConfirm: () => api.delete(`/items/${id}`),
 * duration: 5000,
 * });
 * };
 * ```
 */
export function useUndoToast() {
  const [activeToasts, setActiveToasts] = useState<UndoToastState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store callbacks and timers keyed by toast id
  const callbacksRef = useRef<
    Map<
      string,
      {
        undoAction: () => void | Promise<void>;
        onConfirm: () => void | Promise<void>;
        countdownInterval: NodeJS.Timeout | null;
        confirmTimeout: NodeJS.Timeout | null;
      }
    >
  >(new Map());

  /**
   * Show a new undo toast
   */
  const showUndoToast = useCallback((config: UndoToastConfig) => {
    const { message, undoAction, onConfirm, duration = 5000 } = config;
    const id = `undo-toast-${++toastIdCounter}`;
    const totalSeconds = Math.ceil(duration / 1000);

    // Create new toast state
    const newToast: UndoToastState = {
      id,
      message,
      countdown: totalSeconds,
      totalDuration: totalSeconds,
    };

    setActiveToasts((prev) => [...prev, newToast]);

    // Setup countdown interval
    const countdownInterval = setInterval(() => {
      setActiveToasts((prev) =>
        prev.map((toast) =>
          toast.id === id
            ? { ...toast, countdown: Math.max(0, toast.countdown - 1) }
            : toast,
        ),
      );
    }, 1000);

    // Setup confirm timeout
    const confirmTimeout = setTimeout(async () => {
      // Clear interval
      const callbacks = callbacksRef.current.get(id);
      if (callbacks?.countdownInterval) {
        clearInterval(callbacks.countdownInterval);
      }

      // Remove toast from active list
      setActiveToasts((prev) => prev.filter((toast) => toast.id !== id));

      // Execute confirm action
      setIsProcessing(true);
      try {
        await onConfirm();
      } finally {
        setIsProcessing(false);
        callbacksRef.current.delete(id);
      }
    }, duration);

    // Store callbacks and timers
    callbacksRef.current.set(id, {
      undoAction,
      onConfirm,
      countdownInterval,
      confirmTimeout,
    });

    return id;
  }, []);

  /**
   * Handle undo action for a specific toast
   */
  const handleUndo = useCallback(async (toastId: string) => {
    const callbacks = callbacksRef.current.get(toastId);
    if (!callbacks) return;

    // Clear timers
    if (callbacks.countdownInterval) {
      clearInterval(callbacks.countdownInterval);
    }
    if (callbacks.confirmTimeout) {
      clearTimeout(callbacks.confirmTimeout);
    }

    // Remove toast from active list
    setActiveToasts((prev) => prev.filter((toast) => toast.id !== toastId));

    // Execute undo action
    setIsProcessing(true);
    try {
      await callbacks.undoAction();
    } finally {
      setIsProcessing(false);
      callbacksRef.current.delete(toastId);
    }
  }, []);

  /**
   * Dismiss a toast without executing either action
   * (User intentionally closes without undo - confirm will still happen)
   */
  const dismiss = useCallback((toastId: string) => {
    const callbacks = callbacksRef.current.get(toastId);
    if (!callbacks) return;

    // Just clear the countdown interval, let confirm timeout continue
    if (callbacks.countdownInterval) {
      clearInterval(callbacks.countdownInterval);
    }

    // Remove from visible toasts but keep timeout running
    setActiveToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  /**
   * Cancel a toast and prevent the confirm action from executing
   */
  const cancel = useCallback((toastId: string) => {
    const callbacks = callbacksRef.current.get(toastId);
    if (!callbacks) return;

    // Clear all timers
    if (callbacks.countdownInterval) {
      clearInterval(callbacks.countdownInterval);
    }
    if (callbacks.confirmTimeout) {
      clearTimeout(callbacks.confirmTimeout);
    }

    // Remove toast and cleanup
    setActiveToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    callbacksRef.current.delete(toastId);
  }, []);

  /**
   * Clear all toasts and cancel all pending operations
   */
  const clearAll = useCallback(() => {
    callbacksRef.current.forEach((callbacks) => {
      if (callbacks.countdownInterval) {
        clearInterval(callbacks.countdownInterval);
      }
      if (callbacks.confirmTimeout) {
        clearTimeout(callbacks.confirmTimeout);
      }
    });
    callbacksRef.current.clear();
    setActiveToasts([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    // Capture the ref value for cleanup
    const callbacks = callbacksRef.current;
    return () => {
      callbacks.forEach((cb) => {
        if (cb.countdownInterval) {
          clearInterval(cb.countdownInterval);
        }
        if (cb.confirmTimeout) {
          clearTimeout(cb.confirmTimeout);
        }
      });
    };
  }, []);

  return {
    /** Show a new undo toast */
    showUndoToast,
    /** Handle undo action for a specific toast */
    handleUndo,
    /** Dismiss a toast (confirm will still happen) */
    dismiss,
    /** Cancel a toast (prevent confirm from happening) */
    cancel,
    /** Clear all active toasts */
    clearAll,
    /** Currently active toasts */
    activeToasts,
    /** Whether an undo/confirm action is being processed */
    isProcessing,
  };
}

export default useUndoToast;
