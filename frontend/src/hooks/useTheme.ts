import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Theme options available in the application.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Resolved theme after applying system preference.
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Return type for the useTheme hook.
 */
export interface UseThemeReturn {
 /** Current theme setting (light, dark, or system) */
 theme: Theme;
 /** Resolved theme after system preference (light or dark) */
 resolvedTheme: ResolvedTheme;
 /** Function to change the theme */
 setTheme: (theme: Theme) => void;
 /** Whether the system prefers dark mode */
 systemPrefersDark: boolean;
}

const THEME_STORAGE_KEY = 'theme';

/**
 * Gets the system color scheme preference.
 */
function getSystemTheme(): ResolvedTheme {
 if (typeof window === 'undefined') return 'light';
 return window.matchMedia('(prefers-color-scheme: dark)').matches
 ? 'dark'
 : 'light';
}

/**
 * Gets the stored theme from localStorage.
 */
function getStoredTheme(): Theme {
 if (typeof window === 'undefined') return 'system';
 const stored = localStorage.getItem(THEME_STORAGE_KEY);
 if (stored === 'light' || stored === 'dark' || stored === 'system') {
 return stored;
 }
 return 'system';
}

/**
 * Resolves the actual theme to apply based on setting and system preference.
 */
function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
 if (theme === 'system') {
 return systemTheme;
 }
 return theme;
}

/**
 * Applies the theme class to the document element.
 */
function applyTheme(resolvedTheme: ResolvedTheme): void {
 if (typeof document === 'undefined') return;
 const root = document.documentElement;
 root.classList.remove('light', 'dark');
 root.classList.add(resolvedTheme);
}

/**
 * Subscribes to system theme changes using matchMedia.
 */
function subscribeToSystemTheme(callback: () => void): () => void {
 if (typeof window === 'undefined') return () => {};
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 mediaQuery.addEventListener('change', callback);
 return () => mediaQuery.removeEventListener('change', callback);
}

/**
 * Hook for managing application theme with system preference support.
 *
 * Features:
 * - Supports light, dark, and system themes
 * - Persists preference in localStorage
 * - Respects prefers-color-scheme media query
 * - Prevents flash of wrong theme on load (via inline script in index.html)
 * - Smooth transitions between themes (handled via CSS)
 *
 * @example
 * ```tsx
 * const { theme, resolvedTheme, setTheme } = useTheme();
 *
 * return (
 * <button onClick={() => setTheme('dark')}>
 * Current: {resolvedTheme}
 * </button>
 * );
 * ```
 */
export function useTheme(): UseThemeReturn {
 const [theme, setThemeState] = useState<Theme>(getStoredTheme);

 // Use useSyncExternalStore for system preference to ensure consistency
 const systemPrefersDark = useSyncExternalStore(
 subscribeToSystemTheme,
 () => getSystemTheme() === 'dark',
 () => false, // Server-side default
 );

 const systemTheme: ResolvedTheme = systemPrefersDark ? 'dark' : 'light';
 const resolvedTheme = resolveTheme(theme, systemTheme);

 // Apply theme whenever it changes
 useEffect(() => {
 applyTheme(resolvedTheme);
 }, [resolvedTheme]);

 // Update theme function with localStorage persistence
 const setTheme = useCallback((newTheme: Theme) => {
 setThemeState(newTheme);
 localStorage.setItem(THEME_STORAGE_KEY, newTheme);
 }, []);

 return {
 theme,
 resolvedTheme,
 setTheme,
 systemPrefersDark,
 };
}

export default useTheme;
