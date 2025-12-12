import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
}

interface UseOnlineStatusReturn extends OnlineStatusState {
  checkConnection: () => boolean;
}

/**
 * Hook to track online/offline status of the browser.
 * Provides current status, tracks if connection was lost, and offers manual check.
 *
 * @returns {UseOnlineStatusReturn} Online status state and utilities
 *
 * @example
 * const { isOnline, wasOffline } = useOnlineStatus();
 *
 * if (!isOnline) {
 *   toast.error('No connection');
 * }
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [state, setState] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });

  const checkConnection = useCallback((): boolean => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setState((prev) => ({ ...prev, isOnline: online }));
    return online;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({
        isOnline: true,
        wasOffline: prev.wasOffline,
      }));
    };

    const handleOffline = () => {
      setState({
        isOnline: false,
        wasOffline: true,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    ...state,
    checkConnection,
  };
}
