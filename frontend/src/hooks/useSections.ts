import { useETPStore } from '@/store/etpStore';

export function useSections() {
  const {
    currentETP,
    updateSection,
    generateSection,
    regenerateSection,
    aiGenerating,
  } = useETPStore();

  return {
    sections: currentETP?.sections || [],
    updateSection,
    generateSection,
    regenerateSection,
    aiGenerating,
  };
}
