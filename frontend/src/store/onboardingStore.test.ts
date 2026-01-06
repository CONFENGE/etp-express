import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOnboardingStore, ONBOARDING_TASKS } from './onboardingStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('onboardingStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    const { result } = renderHook(() => useOnboardingStore());
    act(() => {
      result.current.resetOnboarding();
    });
  });

  describe('initial state', () => {
    it('should start with empty completed tasks', () => {
      const { result } = renderHook(() => useOnboardingStore());
      expect(result.current.completedTasks).toEqual([]);
    });

    it('should not be dismissed initially', () => {
      const { result } = renderHook(() => useOnboardingStore());
      expect(result.current.isDismissed).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should mark a task as completed', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
      });

      expect(result.current.completedTasks).toContain('create-first-etp');
    });

    it('should not duplicate completed tasks', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
        result.current.completeTask('create-first-etp');
      });

      expect(
        result.current.completedTasks.filter((t) => t === 'create-first-etp')
          .length,
      ).toBe(1);
    });

    it('should allow completing multiple different tasks', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
        result.current.completeTask('generate-suggestion');
      });

      expect(result.current.completedTasks).toContain('create-first-etp');
      expect(result.current.completedTasks).toContain('generate-suggestion');
      expect(result.current.completedTasks).toHaveLength(2);
    });
  });

  describe('uncompleteTask', () => {
    it('should remove a task from completed', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
      });
      expect(result.current.completedTasks).toContain('create-first-etp');

      act(() => {
        result.current.uncompleteTask('create-first-etp');
      });
      expect(result.current.completedTasks).not.toContain('create-first-etp');
    });
  });

  describe('isTaskCompleted', () => {
    it('should return true for completed tasks', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('export-etp');
      });

      expect(result.current.isTaskCompleted('export-etp')).toBe(true);
    });

    it('should return false for incomplete tasks', () => {
      const { result } = renderHook(() => useOnboardingStore());
      expect(result.current.isTaskCompleted('export-etp')).toBe(false);
    });
  });

  describe('dismissChecklist', () => {
    it('should set isDismissed to true', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.dismissChecklist();
      });

      expect(result.current.isDismissed).toBe(true);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Complete some tasks and dismiss
      act(() => {
        result.current.completeTask('create-first-etp');
        result.current.completeTask('export-etp');
        result.current.dismissChecklist();
      });

      expect(result.current.completedTasks.length).toBe(2);
      expect(result.current.isDismissed).toBe(true);

      // Reset
      act(() => {
        result.current.resetOnboarding();
      });

      expect(result.current.completedTasks).toEqual([]);
      expect(result.current.isDismissed).toBe(false);
    });
  });

  describe('getCompletionPercentage', () => {
    it('should return 0 when no tasks completed', () => {
      const { result } = renderHook(() => useOnboardingStore());
      expect(result.current.getCompletionPercentage()).toBe(0);
    });

    it('should return 25 when 1 of 4 tasks completed', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
      });

      expect(result.current.getCompletionPercentage()).toBe(25);
    });

    it('should return 50 when 2 of 4 tasks completed', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        result.current.completeTask('create-first-etp');
        result.current.completeTask('generate-suggestion');
      });

      expect(result.current.getCompletionPercentage()).toBe(50);
    });

    it('should return 100 when all tasks completed', () => {
      const { result } = renderHook(() => useOnboardingStore());

      act(() => {
        ONBOARDING_TASKS.forEach((task) => {
          result.current.completeTask(task.id);
        });
      });

      expect(result.current.getCompletionPercentage()).toBe(100);
    });
  });

  describe('ONBOARDING_TASKS', () => {
    it('should have exactly 4 tasks', () => {
      expect(ONBOARDING_TASKS).toHaveLength(4);
    });

    it('should have required task ids', () => {
      const taskIds = ONBOARDING_TASKS.map((t) => t.id);
      expect(taskIds).toContain('complete-tour');
      expect(taskIds).toContain('create-first-etp');
      expect(taskIds).toContain('generate-suggestion');
      expect(taskIds).toContain('export-etp');
    });

    it('should have labels and descriptions for all tasks', () => {
      ONBOARDING_TASKS.forEach((task) => {
        expect(task.label).toBeTruthy();
        expect(task.description).toBeTruthy();
      });
    });
  });
});
