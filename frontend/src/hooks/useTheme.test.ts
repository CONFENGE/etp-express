import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, type Theme } from './useTheme';

describe('useTheme', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Save original localStorage
    originalLocalStorage = window.localStorage;

    // Create fresh storage for each test
    mockStorage = {};

    // Mock localStorage with a fresh implementation each time
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        }),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock matchMedia
    mockMatchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    });

    // Mock document.documentElement.classList
    vi.spyOn(document.documentElement.classList, 'add').mockImplementation(
      vi.fn(),
    );
    vi.spyOn(document.documentElement.classList, 'remove').mockImplementation(
      vi.fn(),
    );
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should default to system theme when no preference stored', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
    });

    it('should load stored light theme from localStorage', () => {
      mockStorage['theme'] = 'light';

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
    });

    it('should load stored dark theme from localStorage', () => {
      mockStorage['theme'] = 'dark';

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('should ignore invalid stored theme values', () => {
      mockStorage['theme'] = 'invalid-theme';

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
    });
  });

  describe('Resolved Theme', () => {
    it('should resolve to light when theme is light', () => {
      mockStorage['theme'] = 'light';

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should resolve to dark when theme is dark', () => {
      mockStorage['theme'] = 'dark';

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should resolve to light when system prefers light', () => {
      mockMatchMedia.mockImplementation(() => ({
        matches: false, // System prefers light
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should resolve to dark when system prefers dark', () => {
      mockMatchMedia.mockImplementation(() => ({
        matches: true, // System prefers dark
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should update theme to light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(mockStorage['theme']).toBe('light');
    });

    it('should update theme to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(mockStorage['theme']).toBe('dark');
    });

    it('should update theme to system', () => {
      mockStorage['theme'] = 'dark';

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
      expect(mockStorage['theme']).toBe('system');
    });

    it('should persist theme to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('DOM Updates', () => {
    it('should apply light class to document element', () => {
      mockStorage['theme'] = 'light';

      renderHook(() => useTheme());

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
        'light',
        'dark',
      );
      expect(document.documentElement.classList.add).toHaveBeenCalledWith(
        'light',
      );
    });

    it('should apply dark class to document element', () => {
      mockStorage['theme'] = 'dark';

      renderHook(() => useTheme());

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
        'light',
        'dark',
      );
      expect(document.documentElement.classList.add).toHaveBeenCalledWith(
        'dark',
      );
    });

    it('should update DOM when theme changes', () => {
      mockStorage['theme'] = 'light';

      const { result } = renderHook(() => useTheme());

      // Clear initial calls
      vi.mocked(document.documentElement.classList.add).mockClear();
      vi.mocked(document.documentElement.classList.remove).mockClear();

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.add).toHaveBeenCalledWith(
        'dark',
      );
    });
  });

  describe('System Preference', () => {
    it('should track systemPrefersDark accurately when dark', () => {
      mockMatchMedia.mockImplementation(() => ({
        matches: true,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      expect(result.current.systemPrefersDark).toBe(true);
    });

    it('should track systemPrefersDark accurately when light', () => {
      mockMatchMedia.mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme());

      expect(result.current.systemPrefersDark).toBe(false);
    });
  });

  describe('Theme Switching Scenarios', () => {
    it('should cycle through all themes correctly', () => {
      const { result } = renderHook(() => useTheme());
      const themes: Theme[] = ['light', 'dark', 'system'];

      themes.forEach((theme) => {
        act(() => {
          result.current.setTheme(theme);
        });
        expect(result.current.theme).toBe(theme);
      });
    });

    it('should handle rapid theme changes', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
        result.current.setTheme('light');
        result.current.setTheme('dark');
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable setTheme reference', () => {
      const { result, rerender } = renderHook(() => useTheme());

      const setThemeRef = result.current.setTheme;

      rerender();

      expect(result.current.setTheme).toBe(setThemeRef);
    });
  });
});
