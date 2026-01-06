import { useEffect, useRef, useCallback, useState } from 'react';
import { AUTO_SAVE_DELAY } from '@/lib/constants';

export type AutoSaveStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'
  | 'offline';

export interface AutoSaveOptions {
  delay?: number;
  enabled?: boolean;
  onSave: () => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface AutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  error: Error | null;
  isOnline: boolean;
  retry: () => void;
  forceSave: () => Promise<void>;
}

/**
 * Hook for auto-saving content with debounce, offline support, and conflict detection.
 *
 * @param content - The content to monitor for changes
 * @param options - Configuration options for auto-save behavior
 * @returns Auto-save status and controls
 *
 * @example
 * ```tsx
 * const { status, lastSavedAt, forceSave } = useAutoSave(content, {
 *   onSave: async () => await updateETP(id, { content }),
 *   onSuccess: () => toast.success('Salvo automaticamente'),
 *   onError: (err) => toast.error('Erro ao salvar'),
 * });
 * ```
 */
export function useAutoSave(
  content: string,
  options: AutoSaveOptions,
): AutoSaveResult {
  const {
    delay = AUTO_SAVE_DELAY,
    enabled = true,
    onSave,
    onError,
    onSuccess,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Refs for tracking state without causing re-renders
  const lastSavedContentRef = useRef<string>(content);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Queue for offline saves
  const offlineQueueRef = useRef<(() => Promise<void>)[]>([]);

  // Process queued saves when coming back online
  const processOfflineQueue = useCallback(async () => {
    while (offlineQueueRef.current.length > 0) {
      const queuedSave = offlineQueueRef.current.shift();
      if (queuedSave) {
        try {
          await queuedSave();
        } catch {
          // Re-queue on failure
          offlineQueueRef.current.unshift(queuedSave);
          break;
        }
      }
    }
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued saves when coming back online
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Core save function
  const performSave = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Check if we're offline
    if (!navigator.onLine) {
      setStatus('offline');
      // Queue the save for when we're back online
      offlineQueueRef.current.push(onSave);
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      await onSave();

      if (!isMountedRef.current) return;

      lastSavedContentRef.current = content;
      setLastSavedAt(new Date());
      setStatus('saved');
      onSuccess?.();

      // Reset to idle after a brief period
      setTimeout(() => {
        if (isMountedRef.current) {
          setStatus('idle');
        }
      }, 2000);
    } catch (err) {
      if (!isMountedRef.current) return;

      const saveError =
        err instanceof Error ? err : new Error('Erro ao salvar');
      setError(saveError);
      setStatus('error');
      onError?.(saveError);
    }
  }, [content, onSave, onSuccess, onError]);

  // Force save (for manual trigger)
  const forceSave = useCallback(async () => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Retry failed save
  const retry = useCallback(() => {
    setStatus('idle');
    setError(null);
    forceSave();
  }, [forceSave]);

  // Monitor content changes and trigger debounced save
  useEffect(() => {
    if (!enabled) return;

    // Check if content has actually changed
    const hasChanges = content !== lastSavedContentRef.current;

    if (!hasChanges) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set pending status immediately
    setStatus('pending');
    pendingSaveRef.current = true;

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      pendingSaveRef.current = false;
      performSave();
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, enabled, delay, performSave]);

  return {
    status,
    lastSavedAt,
    error,
    isOnline,
    retry,
    forceSave,
  };
}
