import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDemoConversion } from './useDemoConversion';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';

// Mock the authStore
vi.mock('@/store/authStore', () => ({
 useAuthStore: vi.fn(),
}));

describe('useDemoConversion', () => {
 const mockDemoUser: User = {
 id: 'demo-user-1',
 email: 'demo@example.com',
 name: 'Demo User',
 role: 'demo',
 };

 const mockRegularUser: User = {
 id: 'user-1',
 email: 'user@example.com',
 name: 'Regular User',
 role: 'user',
 };

 const mockSessionStorage: Record<string, string> = {};

 beforeEach(() => {
 vi.clearAllMocks();

 // Mock sessionStorage
 vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
 (key) => mockSessionStorage[key] || null,
 );
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
 mockSessionStorage[key] = value;
 });

 // Clear session storage mock
 Object.keys(mockSessionStorage).forEach(
 (key) => delete mockSessionStorage[key],
 );
 });

 afterEach(() => {
 vi.restoreAllMocks();
 });

 function setupAuthMock(user: User | null) {
 vi.mocked(useAuthStore).mockReturnValue({
 user,
 } as ReturnType<typeof useAuthStore>);
 }

 describe('isDemoUser', () => {
 it('should return true for demo users', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 expect(result.current.isDemoUser).toBe(true);
 });

 it('should return false for regular users', () => {
 setupAuthMock(mockRegularUser);

 const { result } = renderHook(() => useDemoConversion());

 expect(result.current.isDemoUser).toBe(false);
 });

 it('should return false when user is null', () => {
 setupAuthMock(null);

 const { result } = renderHook(() => useDemoConversion());

 expect(result.current.isDemoUser).toBe(false);
 });
 });

 describe('triggerBanner', () => {
 it('should show banner for demo users', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 expect(result.current.showBanner).toBe(false);

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);
 expect(result.current.lastTrigger).toBe('ai_generation');
 });

 it('should NOT show banner for regular users', () => {
 setupAuthMock(mockRegularUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(false);
 });

 it('should set correct trigger type for ai_generation', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.lastTrigger).toBe('ai_generation');
 });

 it('should set correct trigger type for etp_completion', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('etp_completion');
 });

 expect(result.current.lastTrigger).toBe('etp_completion');
 });

 it('should set correct trigger type for pdf_export', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('pdf_export');
 });

 expect(result.current.lastTrigger).toBe('pdf_export');
 });

 it('should NOT show banner if recently dismissed', () => {
 setupAuthMock(mockDemoUser);

 // Set recent dismissal (1 minute ago)
 mockSessionStorage['demo-banner-dismissed'] = String(
 Date.now() - 60 * 1000,
 );

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(false);
 });

 it('should show banner if dismissal was more than 5 minutes ago', () => {
 setupAuthMock(mockDemoUser);

 // Set old dismissal (10 minutes ago)
 mockSessionStorage['demo-banner-dismissed'] = String(
 Date.now() - 10 * 60 * 1000,
 );

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);
 });
 });

 describe('dismissBanner', () => {
 it('should hide banner when dismissed', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);

 act(() => {
 result.current.dismissBanner();
 });

 expect(result.current.showBanner).toBe(false);
 });

 it('should clear lastTrigger when dismissed', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('pdf_export');
 });

 expect(result.current.lastTrigger).toBe('pdf_export');

 act(() => {
 result.current.dismissBanner();
 });

 expect(result.current.lastTrigger).toBeNull();
 });

 it('should store dismissal time in sessionStorage', () => {
 setupAuthMock(mockDemoUser);

 const { result } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 result.current.dismissBanner();
 });

 expect(mockSessionStorage['demo-banner-dismissed']).toBeDefined();
 const dismissedAt = parseInt(
 mockSessionStorage['demo-banner-dismissed'],
 10,
 );
 expect(dismissedAt).toBeGreaterThan(Date.now() - 1000);
 });
 });

 describe('User Change', () => {
 it('should hide banner when user changes to non-demo', () => {
 setupAuthMock(mockDemoUser);

 const { result, rerender } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);

 // User changes to regular user
 setupAuthMock(mockRegularUser);
 rerender();

 expect(result.current.showBanner).toBe(false);
 });

 it('should hide banner when user becomes null', () => {
 setupAuthMock(mockDemoUser);

 const { result, rerender } = renderHook(() => useDemoConversion());

 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);

 // User logs out
 setupAuthMock(null);
 rerender();

 expect(result.current.showBanner).toBe(false);
 });
 });

 describe('Edge Cases', () => {
 it('should handle sessionStorage errors gracefully', () => {
 setupAuthMock(mockDemoUser);

 // Mock sessionStorage to throw
 vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
 throw new Error('Storage not available');
 });
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
 throw new Error('Storage not available');
 });

 const { result } = renderHook(() => useDemoConversion());

 // Should still work without crashing
 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);

 act(() => {
 result.current.dismissBanner();
 });

 expect(result.current.showBanner).toBe(false);
 });

 it('should handle invalid sessionStorage value', () => {
 setupAuthMock(mockDemoUser);

 mockSessionStorage['demo-banner-dismissed'] = 'invalid-number';

 const { result } = renderHook(() => useDemoConversion());

 // Should show banner since invalid value means not recently dismissed
 act(() => {
 result.current.triggerBanner('ai_generation');
 });

 expect(result.current.showBanner).toBe(true);
 });
 });
});
