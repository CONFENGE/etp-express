import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

// Mock react-router
const mockBlocker = {
  state: 'unblocked' as 'unblocked' | 'blocked' | 'proceeding',
  proceed: vi.fn(),
  reset: vi.fn(),
  location: undefined,
};

vi.mock('react-router', () => ({
  useBlocker: vi.fn((callback: unknown) => {
    // Store the callback for testing
    (mockBlocker as unknown as { _callback: unknown })._callback = callback;
    return mockBlocker;
  }),
}));

describe('useUnsavedChangesWarning', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBlocker.state = 'unblocked';
    mockBlocker.proceed.mockClear();
    mockBlocker.reset.mockClear();

    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('Initial State', () => {
    it('should return isBlocking as false when not blocking', () => {
      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: false }),
      );

      expect(result.current.isBlocking).toBe(false);
    });

    it('should return isBlocking as true when blocker is blocked', () => {
      mockBlocker.state = 'blocked';

      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      expect(result.current.isBlocking).toBe(true);
    });
  });

  describe('Browser Navigation Blocking', () => {
    it('should add beforeunload listener when dirty', () => {
      renderHook(() => useUnsavedChangesWarning({ isDirty: true }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );
    });

    it('should add beforeunload listener when not dirty', () => {
      renderHook(() => useUnsavedChangesWarning({ isDirty: false }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );
    });

    it('should remove beforeunload listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );
    });

    it('should prevent unload and set returnValue when dirty', () => {
      renderHook(() => useUnsavedChangesWarning({ isDirty: true }));

      // Get the beforeunload handler
      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload',
      )?.[1] as EventListener;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      Object.defineProperty(event, 'preventDefault', {
        value: vi.fn(),
        writable: true,
      });
      Object.defineProperty(event, 'returnValue', {
        value: '',
        writable: true,
      });

      const result = handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe(
        'Você tem alterações não salvas. Deseja sair mesmo assim?',
      );
      expect(result).toBe(
        'Você tem alterações não salvas. Deseja sair mesmo assim?',
      );
    });

    it('should not prevent unload when not dirty', () => {
      renderHook(() => useUnsavedChangesWarning({ isDirty: false }));

      // Get the beforeunload handler
      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload',
      )?.[1] as EventListener;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      Object.defineProperty(event, 'preventDefault', {
        value: vi.fn(),
        writable: true,
      });
      Object.defineProperty(event, 'returnValue', {
        value: '',
        writable: true,
      });

      handler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should use custom message in beforeunload', () => {
      const customMessage = 'Custom warning message';
      renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true, message: customMessage }),
      );

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload',
      )?.[1] as EventListener;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      Object.defineProperty(event, 'preventDefault', {
        value: vi.fn(),
        writable: true,
      });
      Object.defineProperty(event, 'returnValue', {
        value: '',
        writable: true,
      });

      const result = handler(event);

      expect(event.returnValue).toBe(customMessage);
      expect(result).toBe(customMessage);
    });
  });

  describe('proceed and reset', () => {
    it('should call blocker.proceed when proceed is called', () => {
      mockBlocker.state = 'blocked';

      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      act(() => {
        result.current.proceed();
      });

      expect(mockBlocker.proceed).toHaveBeenCalled();
    });

    it('should not call blocker.proceed when not blocked', () => {
      mockBlocker.state = 'unblocked';

      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      act(() => {
        result.current.proceed();
      });

      expect(mockBlocker.proceed).not.toHaveBeenCalled();
    });

    it('should call blocker.reset when reset is called', () => {
      mockBlocker.state = 'blocked';

      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      act(() => {
        result.current.reset();
      });

      expect(mockBlocker.reset).toHaveBeenCalled();
    });

    it('should not call blocker.reset when not blocked', () => {
      mockBlocker.state = 'unblocked';

      const { result } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      act(() => {
        result.current.reset();
      });

      expect(mockBlocker.reset).not.toHaveBeenCalled();
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable proceed reference', () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      const proceedRef = result.current.proceed;

      rerender();

      expect(result.current.proceed).toBe(proceedRef);
    });

    it('should maintain stable reset reference', () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      const resetRef = result.current.reset;

      rerender();

      expect(result.current.reset).toBe(resetRef);
    });
  });

  describe('State Transitions', () => {
    it('should update isBlocking when blocker state changes', () => {
      mockBlocker.state = 'unblocked';

      const { result, rerender } = renderHook(() =>
        useUnsavedChangesWarning({ isDirty: true }),
      );

      expect(result.current.isBlocking).toBe(false);

      // Simulate blocker becoming blocked
      mockBlocker.state = 'blocked';
      rerender();

      expect(result.current.isBlocking).toBe(true);
    });
  });
});
