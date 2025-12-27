import { useEffect, useRef } from 'react';
import { useETPStore } from '@/store/etpStore';

export function useETPs() {
  const {
    etps,
    currentETP,
    isLoading,
    error,
    fetchETPs,
    fetchETP,
    createETP,
    updateETP,
    deleteETP,
    setCurrentETP,
  } = useETPStore();

  // Track if initial fetch was already attempted to prevent infinite loops (#983)
  // When API returns empty array, etps.length stays 0, causing re-fetch without this guard
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current && etps.length === 0 && !isLoading) {
      hasFetchedRef.current = true;
      fetchETPs();
    }
  }, [etps.length, fetchETPs, isLoading]);

  return {
    etps,
    currentETP,
    isLoading,
    error,
    fetchETPs,
    fetchETP,
    createETP,
    updateETP,
    deleteETP,
    setCurrentETP,
  };
}
