import { useCallback } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';

/**
 * Hook to track onboarding task completion.
 *
 * Usage:
 * ```ts
 * const { markETPCreated, markSuggestionGenerated, markETPExported } = useOnboardingTasks();
 *
 * // After creating an ETP
 * markETPCreated();
 *
 * // After generating a suggestion
 * markSuggestionGenerated();
 *
 * // After exporting an ETP
 * markETPExported();
 * ```
 */
export function useOnboardingTasks() {
  const { completeTask, isTaskCompleted } = useOnboardingStore();

  const markETPCreated = useCallback(() => {
    if (!isTaskCompleted('create-first-etp')) {
      completeTask('create-first-etp');
    }
  }, [completeTask, isTaskCompleted]);

  const markSuggestionGenerated = useCallback(() => {
    if (!isTaskCompleted('generate-suggestion')) {
      completeTask('generate-suggestion');
    }
  }, [completeTask, isTaskCompleted]);

  const markETPExported = useCallback(() => {
    if (!isTaskCompleted('export-etp')) {
      completeTask('export-etp');
    }
  }, [completeTask, isTaskCompleted]);

  return {
    markETPCreated,
    markSuggestionGenerated,
    markETPExported,
  };
}
