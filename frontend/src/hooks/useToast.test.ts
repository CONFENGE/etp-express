import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from './useToast';
import { useUIStore } from '@/store/uiStore';

// Mock the uiStore
vi.mock('@/store/uiStore', () => ({
  useUIStore: vi.fn(),
}));

describe('useToast', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUIStore).mockImplementation((selector) => {
      // Handle selector pattern
      if (typeof selector === 'function') {
        return selector({ showToast: mockShowToast });
      }
      return { showToast: mockShowToast };
    });
  });

  describe('function reference stability', () => {
    it('should return stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useToast());

      const firstToast = result.current.toast;
      const firstSuccess = result.current.success;
      const firstError = result.current.error;

      // Re-render
      rerender();

      // Functions should be the same reference (memoized with useCallback)
      expect(result.current.toast).toBe(firstToast);
      expect(result.current.success).toBe(firstSuccess);
      expect(result.current.error).toBe(firstError);
    });

    it('should return stable references even after multiple re-renders', () => {
      const { result, rerender } = renderHook(() => useToast());

      const initialToast = result.current.toast;
      const initialSuccess = result.current.success;
      const initialError = result.current.error;

      // Multiple re-renders
      rerender();
      rerender();
      rerender();
      rerender();
      rerender();

      expect(result.current.toast).toBe(initialToast);
      expect(result.current.success).toBe(initialSuccess);
      expect(result.current.error).toBe(initialError);
    });
  });

  describe('toast function', () => {
    it('should call showToast with correct default parameters', () => {
      const { result } = renderHook(() => useToast());

      result.current.toast({ description: 'Test message' });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: undefined,
        description: 'Test message',
        variant: 'default',
        duration: expect.any(Number),
      });
    });

    it('should call showToast with custom variant', () => {
      const { result } = renderHook(() => useToast());

      result.current.toast({
        title: 'Custom Title',
        description: 'Test message',
        variant: 'destructive',
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Custom Title',
        description: 'Test message',
        variant: 'destructive',
        duration: expect.any(Number),
      });
    });

    it('should call showToast with custom duration', () => {
      const { result } = renderHook(() => useToast());

      result.current.toast({
        description: 'Test message',
        duration: 10000,
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: undefined,
        description: 'Test message',
        variant: 'default',
        duration: 10000,
      });
    });
  });

  describe('success function', () => {
    it('should call showToast with success variant', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('Success message');

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Sucesso',
        description: 'Success message',
        variant: 'success',
        duration: expect.any(Number),
      });
    });

    it('should call showToast with custom title', () => {
      const { result } = renderHook(() => useToast());

      result.current.success('Success message', 'Custom Title');

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Custom Title',
        description: 'Success message',
        variant: 'success',
        duration: expect.any(Number),
      });
    });
  });

  describe('error function', () => {
    it('should call showToast with destructive variant', () => {
      const { result } = renderHook(() => useToast());

      result.current.error('Error message');

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Error message',
        variant: 'destructive',
        duration: expect.any(Number),
      });
    });

    it('should call showToast with custom title', () => {
      const { result } = renderHook(() => useToast());

      result.current.error('Error message', 'Custom Error');

      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Custom Error',
        description: 'Error message',
        variant: 'destructive',
        duration: expect.any(Number),
      });
    });
  });

  describe('useEffect compatibility', () => {
    it('should not cause infinite loops when used in useEffect dependency array', () => {
      // This test verifies the fix for the infinite re-render bug
      // When functions are stable, they won't cause useEffect to re-run
      const { result, rerender } = renderHook(() => useToast());

      // Store initial references
      const refs = {
        toast: result.current.toast,
        success: result.current.success,
        error: result.current.error,
      };

      // Simulate multiple component updates
      for (let i = 0; i < 10; i++) {
        rerender();

        // All references should remain stable
        expect(result.current.toast).toBe(refs.toast);
        expect(result.current.success).toBe(refs.success);
        expect(result.current.error).toBe(refs.error);
      }
    });
  });
});
