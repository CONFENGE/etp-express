import { useEffect } from 'react';
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

  useEffect(() => {
    if (etps.length === 0 && !isLoading) {
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
