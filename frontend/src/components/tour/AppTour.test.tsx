import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from '@testing-library/react';
import { AppTour } from './AppTour';
import { useTourStore } from '@/store/tourStore';

// Mock react-joyride
vi.mock('react-joyride', () => ({
  default: vi.fn(({ run, steps, stepIndex, callback }) => {
    if (!run) return null;
    const step = steps[stepIndex];
    return (
      <div data-testid="joyride-tour">
        <div data-testid="tour-step-content">{step?.content}</div>
        <button
          data-testid="tour-next"
          onClick={() =>
            callback({
              type: 'step:after',
              action: 'next',
              index: stepIndex,
              status: 'running',
            })
          }
        >
          Next
        </button>
        <button
          data-testid="tour-skip"
          onClick={() =>
            callback({
              type: 'tour:end',
              action: 'skip',
              index: stepIndex,
              status: 'skipped',
            })
          }
        >
          Skip
        </button>
        <button
          data-testid="tour-finish"
          onClick={() =>
            callback({
              type: 'tour:end',
              action: 'next',
              index: stepIndex,
              status: 'finished',
            })
          }
        >
          Finish
        </button>
      </div>
    );
  }),
  STATUS: {
    FINISHED: 'finished',
    SKIPPED: 'skipped',
    RUNNING: 'running',
    READY: 'ready',
    IDLE: 'idle',
  },
  ACTIONS: {
    NEXT: 'next',
    PREV: 'prev',
    CLOSE: 'close',
    SKIP: 'skip',
  },
  EVENTS: {
    STEP_AFTER: 'step:after',
    TOUR_END: 'tour:end',
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAuthInitialized: true,
  }),
}));

describe('AppTour', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useTourStore.getState().resetTour();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderAppTour = () => {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppTour />
      </MemoryRouter>,
    );
  };

  describe('rendering', () => {
    it('should not render when tour is not running', () => {
      renderAppTour();

      expect(screen.queryByTestId('joyride-tour')).not.toBeInTheDocument();
    });

    it('should render when tour is running', () => {
      act(() => {
        useTourStore.getState().startTour();
      });

      renderAppTour();

      expect(screen.getByTestId('joyride-tour')).toBeInTheDocument();
    });
  });

  describe('tour flow', () => {
    it('should render first step content when started', () => {
      act(() => {
        useTourStore.getState().startTour();
      });

      renderAppTour();

      // First step contains welcome message
      expect(screen.getByTestId('tour-step-content')).toBeInTheDocument();
    });

    it('should complete tour when finished', async () => {
      act(() => {
        useTourStore.getState().startTour();
      });

      renderAppTour();

      const finishButton = screen.getByTestId('tour-finish');
      act(() => {
        finishButton.click();
      });

      await waitFor(() => {
        expect(useTourStore.getState().hasCompletedTour).toBe(true);
        expect(useTourStore.getState().isRunning).toBe(false);
      });
    });

    it('should complete tour when skipped', async () => {
      act(() => {
        useTourStore.getState().startTour();
      });

      renderAppTour();

      const skipButton = screen.getByTestId('tour-skip');
      act(() => {
        skipButton.click();
      });

      await waitFor(() => {
        expect(useTourStore.getState().hasCompletedTour).toBe(true);
      });
    });
  });

  describe('step navigation', () => {
    it('should advance to next step when clicking next', async () => {
      act(() => {
        useTourStore.getState().startTour();
      });

      renderAppTour();

      expect(useTourStore.getState().stepIndex).toBe(0);

      const nextButton = screen.getByTestId('tour-next');
      act(() => {
        nextButton.click();
      });

      await waitFor(() => {
        expect(useTourStore.getState().stepIndex).toBe(1);
      });
    });
  });
});
