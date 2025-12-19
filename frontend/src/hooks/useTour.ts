import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTourStore } from '@/store/tourStore';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to manage the guided tour.
 * Automatically starts the tour on first login and provides controls.
 */
export function useTour() {
 const location = useLocation();
 const { isAuthenticated, isAuthInitialized } = useAuth();
 const {
 hasCompletedTour,
 isRunning,
 stepIndex,
 startTour,
 stopTour,
 completeTour,
 resetTour,
 setStepIndex,
 shouldAutoStart,
 } = useTourStore();

 // Auto-start tour on dashboard for new users
 useEffect(() => {
 // Only auto-start on dashboard and when auth is ready
 if (
 isAuthInitialized &&
 isAuthenticated &&
 location.pathname === '/dashboard' &&
 shouldAutoStart()
 ) {
 // Small delay to ensure DOM is ready
 const timer = setTimeout(() => {
 startTour();
 }, 1000);
 return () => clearTimeout(timer);
 }
 }, [
 isAuthInitialized,
 isAuthenticated,
 location.pathname,
 shouldAutoStart,
 startTour,
 ]);

 // Stop tour when navigating away from protected routes
 useEffect(() => {
 const publicRoutes = [
 '/login',
 '/register',
 '/forgot-password',
 '/reset-password',
 ];
 if (isRunning && publicRoutes.includes(location.pathname)) {
 stopTour();
 }
 }, [location.pathname, isRunning, stopTour]);

 const handleSkip = useCallback(() => {
 completeTour();
 }, [completeTour]);

 const handleRestart = useCallback(() => {
 resetTour();
 startTour();
 }, [resetTour, startTour]);

 return {
 hasCompletedTour,
 isRunning,
 stepIndex,
 startTour,
 stopTour,
 completeTour,
 resetTour,
 setStepIndex,
 handleSkip,
 handleRestart,
 };
}
