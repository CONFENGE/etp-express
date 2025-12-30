import { useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { TOAST_DURATION } from '@/lib/constants';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

/**
 * Hook for showing toast notifications.
 * All returned functions are memoized with useCallback to prevent
 * infinite re-render loops when used in useEffect dependencies.
 */
export function useToast() {
  // Use Zustand selector for stable reference
  const showToast = useUIStore((state) => state.showToast);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
      duration = TOAST_DURATION,
    }: ToastOptions) => {
      showToast({ title, description, variant, duration });
    },
    [showToast],
  );

  const success = useCallback(
    (description: string, title = 'Sucesso') => {
      showToast({
        title,
        description,
        variant: 'success',
        duration: TOAST_DURATION,
      });
    },
    [showToast],
  );

  const error = useCallback(
    (description: string, title = 'Erro') => {
      showToast({
        title,
        description,
        variant: 'destructive',
        duration: TOAST_DURATION,
      });
    },
    [showToast],
  );

  return { toast, success, error };
}
