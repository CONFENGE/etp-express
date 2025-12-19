import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeValidation } from './useRealtimeValidation';

describe('useRealtimeValidation', () => {
 beforeEach(() => {
 vi.useFakeTimers();
 });

 afterEach(() => {
 vi.useRealTimers();
 });

 describe('Initial State', () => {
 it('should start with idle state', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() => useRealtimeValidation(validator));

 expect(result.current.state).toBe('idle');
 });

 it('should not call validator initially', () => {
 const validator = vi.fn().mockReturnValue(true);
 renderHook(() => useRealtimeValidation(validator));

 expect(validator).not.toHaveBeenCalled();
 });
 });

 describe('Validation with Debounce', () => {
 it('should validate after debounce delay', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 act(() => {
 result.current.validate('test@example.com');
 });

 // Should still be idle before debounce
 expect(result.current.state).toBe('idle');
 expect(validator).not.toHaveBeenCalled();

 // Advance timers past debounce
 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(validator).toHaveBeenCalledWith('test@example.com');
 expect(result.current.state).toBe('valid');
 });

 it('should set invalid state when validator returns false', () => {
 const validator = vi.fn().mockReturnValue(false);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 act(() => {
 result.current.validate('invalid-email');
 });

 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(result.current.state).toBe('invalid');
 });

 it('should cancel previous validation when new input arrives', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 act(() => {
 result.current.validate('first');
 });

 // Advance 250ms (halfway)
 act(() => {
 vi.advanceTimersByTime(250);
 });

 // New input arrives
 act(() => {
 result.current.validate('second');
 });

 // Advance 250ms more (total 500ms from first input, 250ms from second)
 act(() => {
 vi.advanceTimersByTime(250);
 });

 // Validator should not have been called yet (debounce reset)
 expect(validator).not.toHaveBeenCalled();

 // Complete debounce for second input
 act(() => {
 vi.advanceTimersByTime(250);
 });

 expect(validator).toHaveBeenCalledTimes(1);
 expect(validator).toHaveBeenCalledWith('second');
 });
 });

 describe('Minimum Length', () => {
 it('should not validate if value is shorter than minLength', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500, minLength: 3 }),
 );

 act(() => {
 result.current.validate('ab');
 });

 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(validator).not.toHaveBeenCalled();
 expect(result.current.state).toBe('idle');
 });

 it('should validate when value meets minLength', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500, minLength: 3 }),
 );

 act(() => {
 result.current.validate('abc');
 });

 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(validator).toHaveBeenCalledWith('abc');
 expect(result.current.state).toBe('valid');
 });

 it('should reset to idle when value becomes shorter than minLength', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500, minLength: 3 }),
 );

 // First, validate a valid value
 act(() => {
 result.current.validate('valid');
 });
 act(() => {
 vi.advanceTimersByTime(500);
 });
 expect(result.current.state).toBe('valid');

 // Then clear to short value
 act(() => {
 result.current.validate('ab');
 });

 // Should immediately go to idle (no debounce)
 expect(result.current.state).toBe('idle');
 });
 });

 describe('Reset Function', () => {
 it('should reset state to idle', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 // Set to valid state
 act(() => {
 result.current.validate('test@example.com');
 });
 act(() => {
 vi.advanceTimersByTime(500);
 });
 expect(result.current.state).toBe('valid');

 // Reset
 act(() => {
 result.current.reset();
 });

 expect(result.current.state).toBe('idle');
 });

 it('should cancel pending validation', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 act(() => {
 result.current.validate('test@example.com');
 });

 // Reset before debounce completes
 act(() => {
 result.current.reset();
 });

 // Complete debounce time
 act(() => {
 vi.advanceTimersByTime(500);
 });

 // Validator should not have been called
 expect(validator).not.toHaveBeenCalled();
 expect(result.current.state).toBe('idle');
 });
 });

 describe('Default Options', () => {
 it('should use default delay of 500ms', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() => useRealtimeValidation(validator));

 act(() => {
 result.current.validate('test');
 });

 // 499ms - should not validate yet
 act(() => {
 vi.advanceTimersByTime(499);
 });
 expect(validator).not.toHaveBeenCalled();

 // 1ms more - should validate
 act(() => {
 vi.advanceTimersByTime(1);
 });
 expect(validator).toHaveBeenCalled();
 });

 it('should use default minLength of 1', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() => useRealtimeValidation(validator));

 // Single character should trigger validation
 act(() => {
 result.current.validate('a');
 });
 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(validator).toHaveBeenCalledWith('a');
 });

 it('should not validate empty string with default minLength', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result } = renderHook(() => useRealtimeValidation(validator));

 act(() => {
 result.current.validate('');
 });
 act(() => {
 vi.advanceTimersByTime(500);
 });

 expect(validator).not.toHaveBeenCalled();
 expect(result.current.state).toBe('idle');
 });
 });

 describe('Cleanup', () => {
 it('should clear timeout on unmount', () => {
 const validator = vi.fn().mockReturnValue(true);
 const { result, unmount } = renderHook(() =>
 useRealtimeValidation(validator, { delay: 500 }),
 );

 act(() => {
 result.current.validate('test');
 });

 // Unmount before debounce completes
 unmount();

 // Complete debounce time
 act(() => {
 vi.advanceTimersByTime(500);
 });

 // Validator should not have been called (timeout was cleared)
 expect(validator).not.toHaveBeenCalled();
 });
 });
});
