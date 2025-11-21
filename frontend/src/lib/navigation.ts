/**
 * Navigation Singleton
 *
 * Provides global access to React Router's navigate function without causing
 * window.location reloads that break React state.
 *
 * Usage:
 * 1. Initialize in App.tsx: setNavigate(navigate)
 * 2. Use anywhere: getNavigate()('/path')
 *
 * @module navigation
 */

import { NavigateFunction } from 'react-router-dom';

/**
 * Singleton instance of React Router's navigate function.
 * Initialized by App.tsx on mount.
 */
let navigateInstance: NavigateFunction | null = null;

/**
 * Sets the global navigate instance.
 * Must be called once in App.tsx before any navigation occurs.
 *
 * @param navigate - The navigate function from useNavigate()
 *
 * @example
 * ```typescript
 * const navigate = useNavigate();
 * useEffect(() => {
 *   setNavigate(navigate);
 * }, [navigate]);
 * ```
 */
export const setNavigate = (navigate: NavigateFunction): void => {
  navigateInstance = navigate;
};

/**
 * Gets the global navigate instance.
 * Throws if called before setNavigate() initialization.
 *
 * @returns The navigate function
 * @throws Error if navigate not initialized
 *
 * @example
 * ```typescript
 * const navigate = getNavigate();
 * navigate('/login', { replace: true });
 * ```
 */
export const getNavigate = (): NavigateFunction => {
  if (!navigateInstance) {
    throw new Error(
      'Navigate not initialized. Call setNavigate() in App.tsx before using getNavigate().',
    );
  }
  return navigateInstance;
};
