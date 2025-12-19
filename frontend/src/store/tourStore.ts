import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOUR_STORAGE_KEY = 'etp-express-tour';

interface TourState {
 /** Whether the tour has been completed */
 hasCompletedTour: boolean;
 /** Whether the tour is currently running */
 isRunning: boolean;
 /** Current step index */
 stepIndex: number;

 // Actions
 /** Start the tour */
 startTour: () => void;
 /** Stop/pause the tour */
 stopTour: () => void;
 /** Mark tour as completed */
 completeTour: () => void;
 /** Reset tour to show again */
 resetTour: () => void;
 /** Go to a specific step */
 setStepIndex: (index: number) => void;
 /** Check if tour should auto-start (first login) */
 shouldAutoStart: () => boolean;
}

export const useTourStore = create<TourState>()(
 persist(
 (set, get) => ({
 hasCompletedTour: false,
 isRunning: false,
 stepIndex: 0,

 startTour: () => set({ isRunning: true, stepIndex: 0 }),

 stopTour: () => set({ isRunning: false }),

 completeTour: () =>
 set({ hasCompletedTour: true, isRunning: false, stepIndex: 0 }),

 resetTour: () =>
 set({ hasCompletedTour: false, isRunning: false, stepIndex: 0 }),

 setStepIndex: (index: number) => set({ stepIndex: index }),

 shouldAutoStart: () => {
 const state = get();
 return !state.hasCompletedTour && !state.isRunning;
 },
 }),
 {
 name: TOUR_STORAGE_KEY,
 partialize: (state) => ({
 hasCompletedTour: state.hasCompletedTour,
 }),
 },
 ),
);
