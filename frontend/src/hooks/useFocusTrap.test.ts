import { renderHook } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';
import { describe, it, expect } from 'vitest';

describe('useFocusTrap', () => {
  it('should return a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    expect(result.current).toHaveProperty('current');
    expect(result.current.current).toBeNull(); // Initially null until attached
  });

  it('should not crash when isOpen is false', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    expect(result.current).toHaveProperty('current');
  });

  it('should update when isOpen changes', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useFocusTrap(isOpen),
      {
        initialProps: { isOpen: false },
      },
    );

    expect(result.current).toHaveProperty('current');

    // Change isOpen to true
    rerender({ isOpen: true });

    expect(result.current).toHaveProperty('current');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useFocusTrap(true));

    // Should not crash on unmount
    expect(() => unmount()).not.toThrow();
  });
});
