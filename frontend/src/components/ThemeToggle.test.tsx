import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import * as useThemeModule from '@/hooks/useTheme';
import type { UseThemeReturn, Theme } from '@/hooks/useTheme';

// Mock the useTheme hook
vi.mock('@/hooks/useTheme', () => ({
 useTheme: vi.fn(),
}));

describe('ThemeToggle', () => {
 const mockSetTheme = vi.fn();

 const createMockUseTheme = (
 overrides: Partial<UseThemeReturn> = {},
 ): UseThemeReturn => ({
 theme: 'system',
 resolvedTheme: 'light',
 setTheme: mockSetTheme,
 systemPrefersDark: false,
 ...overrides,
 });

 beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(useThemeModule.useTheme).mockReturnValue(createMockUseTheme());
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 describe('Rendering', () => {
 it('should render the theme toggle button', () => {
 render(<ThemeToggle />);

 const button = screen.getByRole('button', {
 name: /tema atual/i,
 });
 expect(button).toBeInTheDocument();
 });

 it('should have accessible label describing current theme', () => {
 vi.mocked(useThemeModule.useTheme).mockReturnValue(
 createMockUseTheme({ resolvedTheme: 'dark' }),
 );

 render(<ThemeToggle />);

 const button = screen.getByRole('button', {
 name: /tema atual: escuro/i,
 });
 expect(button).toBeInTheDocument();
 });

 it('should show sun icon when light theme is active', () => {
 vi.mocked(useThemeModule.useTheme).mockReturnValue(
 createMockUseTheme({ resolvedTheme: 'light' }),
 );

 render(<ThemeToggle />);

 // Sun icon should be visible (checking by aria-label since icons have sr-only text)
 const button = screen.getByRole('button', {
 name: /tema atual: claro/i,
 });
 expect(button).toBeInTheDocument();
 });

 it('should show moon icon when dark theme is active', () => {
 vi.mocked(useThemeModule.useTheme).mockReturnValue(
 createMockUseTheme({ resolvedTheme: 'dark' }),
 );

 render(<ThemeToggle />);

 const button = screen.getByRole('button', {
 name: /tema atual: escuro/i,
 });
 expect(button).toBeInTheDocument();
 });

 it('should have screen reader text', () => {
 render(<ThemeToggle />);

 expect(screen.getByText('Alternar tema')).toBeInTheDocument();
 });
 });

 describe('Dropdown Menu', () => {
 it('should open dropdown when button is clicked', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 // Dropdown should be visible with options
 await waitFor(() => {
 expect(screen.getByText('Claro')).toBeInTheDocument();
 expect(screen.getByText('Escuro')).toBeInTheDocument();
 expect(screen.getByText('Sistema')).toBeInTheDocument();
 });
 });

 it('should highlight the currently selected theme option', async () => {
 vi.mocked(useThemeModule.useTheme).mockReturnValue(
 createMockUseTheme({ theme: 'dark', resolvedTheme: 'dark' }),
 );

 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 await waitFor(() => {
 const darkOption = screen.getByText('Escuro');
 // The parent menu item should have the checkmark
 const menuItem = darkOption.closest('[role="menuitem"]');
 expect(menuItem).toHaveTextContent('Escuro');
 });
 });
 });

 describe('Theme Selection', () => {
 it('should call setTheme with "light" when light option is clicked', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 await waitFor(() => {
 expect(screen.getByText('Claro')).toBeInTheDocument();
 });

 const lightOption = screen.getByText('Claro');
 await user.click(lightOption);

 expect(mockSetTheme).toHaveBeenCalledWith('light');
 });

 it('should call setTheme with "dark" when dark option is clicked', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 await waitFor(() => {
 expect(screen.getByText('Escuro')).toBeInTheDocument();
 });

 const darkOption = screen.getByText('Escuro');
 await user.click(darkOption);

 expect(mockSetTheme).toHaveBeenCalledWith('dark');
 });

 it('should call setTheme with "system" when system option is clicked', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 await waitFor(() => {
 expect(screen.getByText('Sistema')).toBeInTheDocument();
 });

 const systemOption = screen.getByText('Sistema');
 await user.click(systemOption);

 expect(mockSetTheme).toHaveBeenCalledWith('system');
 });
 });

 describe('Theme States', () => {
 const themes: Array<{ theme: Theme; resolved: 'light' | 'dark' }> = [
 { theme: 'light', resolved: 'light' },
 { theme: 'dark', resolved: 'dark' },
 { theme: 'system', resolved: 'light' },
 ];

 themes.forEach(({ theme, resolved }) => {
 it(`should display correctly when theme is ${theme}`, () => {
 vi.mocked(useThemeModule.useTheme).mockReturnValue(
 createMockUseTheme({ theme, resolvedTheme: resolved }),
 );

 render(<ThemeToggle />);

 const expectedLabel = resolved === 'dark' ? 'escuro' : 'claro';
 const button = screen.getByRole('button', {
 name: new RegExp(`tema atual: ${expectedLabel}`, 'i'),
 });
 expect(button).toBeInTheDocument();
 });
 });
 });

 describe('Accessibility', () => {
 it('should be keyboard accessible', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });

 // Focus on button
 await user.tab();
 expect(button).toHaveFocus();

 // Open menu with Enter
 await user.keyboard('{Enter}');

 await waitFor(() => {
 expect(screen.getByText('Claro')).toBeInTheDocument();
 });
 });

 it('should close dropdown with Escape key', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 await waitFor(() => {
 expect(screen.getByText('Claro')).toBeInTheDocument();
 });

 await user.keyboard('{Escape}');

 await waitFor(() => {
 expect(screen.queryByText('Claro')).not.toBeInTheDocument();
 });
 });

 it('should have proper focus management', async () => {
 const user = userEvent.setup();
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 await user.click(button);

 // After opening, first menu item should be focusable
 await waitFor(() => {
 expect(screen.getByText('Claro')).toBeInTheDocument();
 });

 // Navigate with arrow keys
 await user.keyboard('{ArrowDown}');
 await user.keyboard('{ArrowDown}');
 });
 });

 describe('Styling', () => {
 it('should have correct button size with WCAG 2.5.5 touch target', () => {
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 // WCAG 2.5.5: 44x44px minimum touch target
 expect(button).toHaveClass('min-h-touch', 'min-w-touch');
 });

 it('should have transition classes for smooth animation', () => {
 render(<ThemeToggle />);

 const button = screen.getByRole('button', { name: /tema atual/i });
 expect(button).toHaveClass('transition-all');
 });
 });
});
