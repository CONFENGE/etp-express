import confetti from 'canvas-confetti';
import { useCallback, useRef } from 'react';

/**
 * Hook for triggering confetti celebrations
 * Respects user's prefers-reduced-motion preference
 * Prevents duplicate celebrations within a cooldown period
 *
 * @example
 * const { celebrate } = useConfetti();
 * // Trigger on achievement
 * if (progress === 100) celebrate();
 */
export function useConfetti() {
 const lastCelebrationRef = useRef<number>(0);
 const cooldownMs = 5000; // Prevent rapid-fire celebrations

 /**
 * Check if user prefers reduced motion
 */
 const prefersReducedMotion = useCallback(() => {
 if (typeof window === 'undefined') return false;
 return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 }, []);

 /**
 * Main celebration - central burst with side cannons
 * Used for major achievements like ETP 100% completion
 */
 const celebrate = useCallback(() => {
 // Respect reduced motion preference
 if (prefersReducedMotion()) return;

 // Prevent duplicate celebrations
 const now = Date.now();
 if (now - lastCelebrationRef.current < cooldownMs) return;
 lastCelebrationRef.current = now;

 // Central burst
 confetti({
 particleCount: 100,
 spread: 70,
 origin: { y: 0.6 },
 colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
 });

 // Side cannons with delay for dramatic effect
 setTimeout(() => {
 // Left cannon
 confetti({
 particleCount: 50,
 angle: 60,
 spread: 55,
 origin: { x: 0, y: 0.7 },
 colors: ['#FFD700', '#FF6B6B', '#4ECDC4'],
 });
 // Right cannon
 confetti({
 particleCount: 50,
 angle: 120,
 spread: 55,
 origin: { x: 1, y: 0.7 },
 colors: ['#45B7D1', '#96CEB4', '#FFD700'],
 });
 }, 200);
 }, [prefersReducedMotion]);

 /**
 * Subtle celebration - smaller burst for minor achievements
 * Used for intermediate milestones
 */
 const celebrateSubtle = useCallback(() => {
 if (prefersReducedMotion()) return;

 const now = Date.now();
 if (now - lastCelebrationRef.current < cooldownMs) return;
 lastCelebrationRef.current = now;

 confetti({
 particleCount: 30,
 spread: 60,
 origin: { y: 0.7 },
 colors: ['#FFD700', '#4ECDC4', '#45B7D1'],
 });
 }, [prefersReducedMotion]);

 /**
 * Reset celebration cooldown
 * Use when loading a new ETP to allow fresh celebration
 */
 const resetCooldown = useCallback(() => {
 lastCelebrationRef.current = 0;
 }, []);

 return {
 celebrate,
 celebrateSubtle,
 resetCooldown,
 prefersReducedMotion,
 };
}
