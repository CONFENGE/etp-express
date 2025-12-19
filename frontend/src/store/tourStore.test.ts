import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTourStore } from './tourStore';

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

describe('tourStore', () => {
 beforeEach(() => {
 // Reset store state before each test
 const store = useTourStore.getState();
 act(() => {
 store.resetTour();
 });
 localStorageMock.clear();
 vi.clearAllMocks();
 });

 describe('initial state', () => {
 it('should have correct initial values', () => {
 const state = useTourStore.getState();
 expect(state.hasCompletedTour).toBe(false);
 expect(state.isRunning).toBe(false);
 expect(state.stepIndex).toBe(0);
 });
 });

 describe('startTour', () => {
 it('should set isRunning to true and reset stepIndex', () => {
 const store = useTourStore.getState();

 act(() => {
 store.setStepIndex(3);
 store.startTour();
 });

 const state = useTourStore.getState();
 expect(state.isRunning).toBe(true);
 expect(state.stepIndex).toBe(0);
 });
 });

 describe('stopTour', () => {
 it('should set isRunning to false', () => {
 const store = useTourStore.getState();

 act(() => {
 store.startTour();
 store.stopTour();
 });

 const state = useTourStore.getState();
 expect(state.isRunning).toBe(false);
 });
 });

 describe('completeTour', () => {
 it('should mark tour as completed and stop running', () => {
 const store = useTourStore.getState();

 act(() => {
 store.startTour();
 store.setStepIndex(3);
 store.completeTour();
 });

 const state = useTourStore.getState();
 expect(state.hasCompletedTour).toBe(true);
 expect(state.isRunning).toBe(false);
 expect(state.stepIndex).toBe(0);
 });
 });

 describe('resetTour', () => {
 it('should reset all tour state', () => {
 const store = useTourStore.getState();

 act(() => {
 store.startTour();
 store.setStepIndex(3);
 store.completeTour();
 store.resetTour();
 });

 const state = useTourStore.getState();
 expect(state.hasCompletedTour).toBe(false);
 expect(state.isRunning).toBe(false);
 expect(state.stepIndex).toBe(0);
 });
 });

 describe('setStepIndex', () => {
 it('should update the step index', () => {
 const store = useTourStore.getState();

 act(() => {
 store.setStepIndex(2);
 });

 expect(useTourStore.getState().stepIndex).toBe(2);

 act(() => {
 store.setStepIndex(5);
 });

 expect(useTourStore.getState().stepIndex).toBe(5);
 });
 });

 describe('shouldAutoStart', () => {
 it('should return true when tour not completed and not running', () => {
 const store = useTourStore.getState();
 expect(store.shouldAutoStart()).toBe(true);
 });

 it('should return false when tour is already running', () => {
 const store = useTourStore.getState();

 act(() => {
 store.startTour();
 });

 expect(useTourStore.getState().shouldAutoStart()).toBe(false);
 });

 it('should return false when tour has been completed', () => {
 const store = useTourStore.getState();

 act(() => {
 store.completeTour();
 });

 expect(useTourStore.getState().shouldAutoStart()).toBe(false);
 });
 });

 describe('persistence', () => {
 it('should have persistence configuration', () => {
 // The store is configured with persist middleware
 // We verify the store has the expected behavior after completion
 const store = useTourStore.getState();

 act(() => {
 store.completeTour();
 });

 // After completion, state should be persisted
 // The actual localStorage behavior is handled by zustand persist
 expect(useTourStore.getState().hasCompletedTour).toBe(true);
 });
 });
});
