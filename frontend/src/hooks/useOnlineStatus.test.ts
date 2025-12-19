import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
 let originalNavigator: Navigator;
 let mockOnLine: boolean;

 beforeEach(() => {
 originalNavigator = window.navigator;
 mockOnLine = true;

 Object.defineProperty(window, 'navigator', {
 value: {
 ...originalNavigator,
 get onLine() {
 return mockOnLine;
 },
 },
 writable: true,
 configurable: true,
 });
 });

 afterEach(() => {
 Object.defineProperty(window, 'navigator', {
 value: originalNavigator,
 writable: true,
 configurable: true,
 });
 });

 describe('Initial State', () => {
 it('should start with online status from navigator.onLine', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 expect(result.current.isOnline).toBe(true);
 expect(result.current.wasOffline).toBe(false);
 });

 it('should start with offline status when navigator.onLine is false', () => {
 mockOnLine = false;
 const { result } = renderHook(() => useOnlineStatus());

 expect(result.current.isOnline).toBe(false);
 expect(result.current.wasOffline).toBe(false);
 });
 });

 describe('Online/Offline Events', () => {
 it('should update isOnline to false when offline event fires', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 expect(result.current.isOnline).toBe(true);

 act(() => {
 mockOnLine = false;
 window.dispatchEvent(new Event('offline'));
 });

 expect(result.current.isOnline).toBe(false);
 expect(result.current.wasOffline).toBe(true);
 });

 it('should update isOnline to true when online event fires', () => {
 mockOnLine = false;
 const { result } = renderHook(() => useOnlineStatus());

 act(() => {
 // First go offline to set wasOffline
 window.dispatchEvent(new Event('offline'));
 });

 act(() => {
 mockOnLine = true;
 window.dispatchEvent(new Event('online'));
 });

 expect(result.current.isOnline).toBe(true);
 });

 it('should set wasOffline to true after going offline', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 expect(result.current.wasOffline).toBe(false);

 act(() => {
 mockOnLine = false;
 window.dispatchEvent(new Event('offline'));
 });

 expect(result.current.wasOffline).toBe(true);
 });

 it('should keep wasOffline true after reconnecting', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 // Go offline
 act(() => {
 mockOnLine = false;
 window.dispatchEvent(new Event('offline'));
 });

 expect(result.current.wasOffline).toBe(true);

 // Go back online
 act(() => {
 mockOnLine = true;
 window.dispatchEvent(new Event('online'));
 });

 // wasOffline should remain true (used for showing reconnection toast)
 expect(result.current.wasOffline).toBe(true);
 });
 });

 describe('checkConnection Function', () => {
 it('should return current online status', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 expect(result.current.checkConnection()).toBe(true);
 });

 it('should update state and return new status', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 // Simulate going offline without event
 mockOnLine = false;

 let status: boolean;
 act(() => {
 status = result.current.checkConnection();
 });

 expect(status!).toBe(false);
 expect(result.current.isOnline).toBe(false);
 });
 });

 describe('Event Listener Cleanup', () => {
 it('should remove event listeners on unmount', () => {
 const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
 const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

 const { unmount } = renderHook(() => useOnlineStatus());

 expect(addEventListenerSpy).toHaveBeenCalledWith(
 'online',
 expect.any(Function),
 );
 expect(addEventListenerSpy).toHaveBeenCalledWith(
 'offline',
 expect.any(Function),
 );

 unmount();

 expect(removeEventListenerSpy).toHaveBeenCalledWith(
 'online',
 expect.any(Function),
 );
 expect(removeEventListenerSpy).toHaveBeenCalledWith(
 'offline',
 expect.any(Function),
 );

 addEventListenerSpy.mockRestore();
 removeEventListenerSpy.mockRestore();
 });
 });

 describe('Multiple State Changes', () => {
 it('should handle rapid online/offline transitions', () => {
 mockOnLine = true;
 const { result } = renderHook(() => useOnlineStatus());

 // Rapid transitions
 act(() => {
 mockOnLine = false;
 window.dispatchEvent(new Event('offline'));
 });

 act(() => {
 mockOnLine = true;
 window.dispatchEvent(new Event('online'));
 });

 act(() => {
 mockOnLine = false;
 window.dispatchEvent(new Event('offline'));
 });

 expect(result.current.isOnline).toBe(false);
 expect(result.current.wasOffline).toBe(true);
 });
 });
});
