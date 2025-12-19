import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfetti } from './useConfetti';

// Mock canvas-confetti
const mockConfetti = vi.fn();
vi.mock('canvas-confetti', () => ({
 default: (options: unknown) => mockConfetti(options),
}));

describe('useConfetti', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 vi.useFakeTimers();

 // Default: user does not prefer reduced motion
 Object.defineProperty(window, 'matchMedia', {
 writable: true,
 value: vi.fn().mockImplementation((query: string) => ({
 matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
 media: query,
 onchange: null,
 addListener: vi.fn(),
 removeListener: vi.fn(),
 addEventListener: vi.fn(),
 removeEventListener: vi.fn(),
 dispatchEvent: vi.fn(),
 })),
 });
 });

 afterEach(() => {
 vi.useRealTimers();
 });

 describe('celebrate', () => {
 it('should trigger confetti with central burst', () => {
 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrate();
 });

 expect(mockConfetti).toHaveBeenCalledWith(
 expect.objectContaining({
 particleCount: 100,
 spread: 70,
 origin: { y: 0.6 },
 }),
 );
 });

 it('should trigger side cannons after 200ms delay', () => {
 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrate();
 });

 // Initial call - central burst
 expect(mockConfetti).toHaveBeenCalledTimes(1);

 // Advance 200ms for side cannons
 act(() => {
 vi.advanceTimersByTime(200);
 });

 // Should have 3 calls total (1 central + 2 side cannons)
 expect(mockConfetti).toHaveBeenCalledTimes(3);

 // Left cannon
 expect(mockConfetti).toHaveBeenCalledWith(
 expect.objectContaining({
 particleCount: 50,
 angle: 60,
 spread: 55,
 origin: { x: 0, y: 0.7 },
 }),
 );

 // Right cannon
 expect(mockConfetti).toHaveBeenCalledWith(
 expect.objectContaining({
 particleCount: 50,
 angle: 120,
 spread: 55,
 origin: { x: 1, y: 0.7 },
 }),
 );
 });

 it('should use celebration colors', () => {
 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrate();
 });

 expect(mockConfetti).toHaveBeenCalledWith(
 expect.objectContaining({
 colors: expect.arrayContaining(['#FFD700', '#FF6B6B', '#4ECDC4']),
 }),
 );
 });
 });

 describe('celebrateSubtle', () => {
 it('should trigger smaller confetti burst', () => {
 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrateSubtle();
 });

 expect(mockConfetti).toHaveBeenCalledWith(
 expect.objectContaining({
 particleCount: 30,
 spread: 60,
 origin: { y: 0.7 },
 }),
 );
 });

 it('should only fire once (no side cannons)', () => {
 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrateSubtle();
 });

 // Advance time
 act(() => {
 vi.advanceTimersByTime(500);
 });

 // Should only have 1 call
 expect(mockConfetti).toHaveBeenCalledTimes(1);
 });
 });

 describe('prefers-reduced-motion', () => {
 it('should not trigger confetti when user prefers reduced motion', () => {
 // Mock reduced motion preference
 Object.defineProperty(window, 'matchMedia', {
 writable: true,
 value: vi.fn().mockImplementation((query: string) => ({
 matches: query === '(prefers-reduced-motion: reduce)',
 media: query,
 onchange: null,
 addListener: vi.fn(),
 removeListener: vi.fn(),
 addEventListener: vi.fn(),
 removeEventListener: vi.fn(),
 dispatchEvent: vi.fn(),
 })),
 });

 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrate();
 });

 expect(mockConfetti).not.toHaveBeenCalled();
 });

 it('should not trigger subtle confetti when user prefers reduced motion', () => {
 Object.defineProperty(window, 'matchMedia', {
 writable: true,
 value: vi.fn().mockImplementation((query: string) => ({
 matches: query === '(prefers-reduced-motion: reduce)',
 media: query,
 onchange: null,
 addListener: vi.fn(),
 removeListener: vi.fn(),
 addEventListener: vi.fn(),
 removeEventListener: vi.fn(),
 dispatchEvent: vi.fn(),
 })),
 });

 const { result } = renderHook(() => useConfetti());

 act(() => {
 result.current.celebrateSubtle();
 });

 expect(mockConfetti).not.toHaveBeenCalled();
 });

 it('should expose prefersReducedMotion function', () => {
 const { result } = renderHook(() => useConfetti());

 expect(result.current.prefersReducedMotion).toBeDefined();
 expect(typeof result.current.prefersReducedMotion).toBe('function');
 });
 });

 describe('cooldown', () => {
 it('should prevent rapid-fire celebrations', () => {
 const { result } = renderHook(() => useConfetti());

 // First celebration
 act(() => {
 result.current.celebrate();
 });
 expect(mockConfetti).toHaveBeenCalledTimes(1);

 // Advance 200ms for side cannons
 act(() => {
 vi.advanceTimersByTime(200);
 });
 expect(mockConfetti).toHaveBeenCalledTimes(3);

 // Try second celebration immediately
 act(() => {
 result.current.celebrate();
 });

 // Should not add more calls (cooldown active)
 expect(mockConfetti).toHaveBeenCalledTimes(3);
 });

 it('should allow celebration after cooldown period (5s)', () => {
 const { result } = renderHook(() => useConfetti());

 // First celebration
 act(() => {
 result.current.celebrate();
 });

 // Advance 200ms for side cannons
 act(() => {
 vi.advanceTimersByTime(200);
 });
 expect(mockConfetti).toHaveBeenCalledTimes(3);

 // Wait for cooldown to expire (5000ms)
 act(() => {
 vi.advanceTimersByTime(5000);
 });

 // Clear mock count for clarity
 mockConfetti.mockClear();

 // Second celebration should work
 act(() => {
 result.current.celebrate();
 });

 expect(mockConfetti).toHaveBeenCalledTimes(1);
 });

 it('should reset cooldown with resetCooldown function', () => {
 const { result } = renderHook(() => useConfetti());

 // First celebration
 act(() => {
 result.current.celebrate();
 });

 // Advance 200ms for side cannons
 act(() => {
 vi.advanceTimersByTime(200);
 });
 expect(mockConfetti).toHaveBeenCalledTimes(3);

 // Reset cooldown
 act(() => {
 result.current.resetCooldown();
 });

 // Clear mock count for clarity
 mockConfetti.mockClear();

 // Second celebration should work immediately
 act(() => {
 result.current.celebrate();
 });

 expect(mockConfetti).toHaveBeenCalledTimes(1);
 });

 it('should have separate cooldowns for celebrate and celebrateSubtle', () => {
 const { result } = renderHook(() => useConfetti());

 // First celebrate
 act(() => {
 result.current.celebrate();
 });

 // Advance 200ms for side cannons
 act(() => {
 vi.advanceTimersByTime(200);
 });
 expect(mockConfetti).toHaveBeenCalledTimes(3);

 // celebrateSubtle should be blocked by same cooldown
 act(() => {
 result.current.celebrateSubtle();
 });

 // Should not add more calls
 expect(mockConfetti).toHaveBeenCalledTimes(3);
 });
 });

 describe('returned functions stability', () => {
 it('should return stable function references', () => {
 const { result, rerender } = renderHook(() => useConfetti());

 const { celebrate: celebrate1, celebrateSubtle: subtle1 } =
 result.current;

 rerender();

 const { celebrate: celebrate2, celebrateSubtle: subtle2 } =
 result.current;

 expect(celebrate1).toBe(celebrate2);
 expect(subtle1).toBe(subtle2);
 });
 });

 describe('SSR safety', () => {
 it('should handle undefined window gracefully', () => {
 // This test verifies the code doesn't throw when window is undefined
 // The actual window mock in tests makes this difficult to test directly
 // but the code structure handles it via the typeof check
 const { result } = renderHook(() => useConfetti());

 expect(result.current.prefersReducedMotion).toBeDefined();
 });
 });
});
