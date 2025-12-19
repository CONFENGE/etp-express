import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTour } from './useTour';
import { useTourStore } from '@/store/tourStore';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isAuthInitialized: true,
  })),
}));

// Wrapper with router
const createWrapper =
  (initialEntries: string[] = ['/dashboard']) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );

describe('useTour', () => {
  beforeEach(() => {
    // Reset tour store
    const store = useTourStore.getState();
    act(() => {
      store.resetTour();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return tour state from store', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasCompletedTour).toBe(false);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.stepIndex).toBe(0);
    });
  });

  describe('shouldAutoStart logic', () => {
    it('should indicate auto-start when tour not completed', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(['/dashboard']),
      });

      // shouldAutoStart returns true for new users
      expect(useTourStore.getState().shouldAutoStart()).toBe(true);
      expect(result.current.hasCompletedTour).toBe(false);
    });

    it('should not indicate auto-start if tour already completed', () => {
      // Mark tour as completed
      act(() => {
        useTourStore.getState().completeTour();
      });

      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(['/dashboard']),
      });

      expect(useTourStore.getState().shouldAutoStart()).toBe(false);
      expect(result.current.hasCompletedTour).toBe(true);
    });

    it('should not indicate auto-start if tour is already running', () => {
      // Start tour manually
      act(() => {
        useTourStore.getState().startTour();
      });

      renderHook(() => useTour(), {
        wrapper: createWrapper(['/dashboard']),
      });

      expect(useTourStore.getState().shouldAutoStart()).toBe(false);
      expect(useTourStore.getState().isRunning).toBe(true);
    });
  });

  describe('handleSkip', () => {
    it('should complete tour when skipped', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.startTour();
      });

      expect(useTourStore.getState().isRunning).toBe(true);

      act(() => {
        result.current.handleSkip();
      });

      expect(useTourStore.getState().hasCompletedTour).toBe(true);
      expect(useTourStore.getState().isRunning).toBe(false);
    });
  });

  describe('handleRestart', () => {
    it('should reset and start tour', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(),
      });

      // Complete tour first
      act(() => {
        result.current.completeTour();
      });

      expect(useTourStore.getState().hasCompletedTour).toBe(true);

      // Restart tour
      act(() => {
        result.current.handleRestart();
      });

      expect(useTourStore.getState().hasCompletedTour).toBe(false);
      expect(useTourStore.getState().isRunning).toBe(true);
      expect(useTourStore.getState().stepIndex).toBe(0);
    });
  });

  describe('tour controls', () => {
    it('should expose all store methods', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.startTour).toBe('function');
      expect(typeof result.current.stopTour).toBe('function');
      expect(typeof result.current.completeTour).toBe('function');
      expect(typeof result.current.resetTour).toBe('function');
      expect(typeof result.current.setStepIndex).toBe('function');
    });
  });
});
