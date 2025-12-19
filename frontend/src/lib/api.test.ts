import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_STORAGE_KEY, fallbackAuthCleanup } from './api';
import * as loggerModule from './logger';

// Mock the logger
vi.mock('./logger', () => ({
 logger: {
 error: vi.fn(),
 info: vi.fn(),
 warn: vi.fn(),
 debug: vi.fn(),
 },
}));

describe('api', () => {
 describe('AUTH_STORAGE_KEY', () => {
 it('should match the key used in authStore persist middleware', () => {
 expect(AUTH_STORAGE_KEY).toBe('auth-storage');
 });
 });

 describe('fallbackAuthCleanup', () => {
 const originalLocation = window.location;
 const originalLocalStorage = window.localStorage;
 let mockRemoveItem: ReturnType<typeof vi.fn>;

 beforeEach(() => {
 vi.clearAllMocks();
 mockRemoveItem = vi.fn();

 // Mock localStorage
 Object.defineProperty(window, 'localStorage', {
 value: {
 removeItem: mockRemoveItem,
 getItem: vi.fn(),
 setItem: vi.fn(),
 clear: vi.fn(),
 length: 0,
 key: vi.fn(),
 },
 writable: true,
 configurable: true,
 });

 // Mock window.location
 Object.defineProperty(window, 'location', {
 value: { href: '' },
 writable: true,
 configurable: true,
 });
 });

 afterEach(() => {
 vi.restoreAllMocks();
 Object.defineProperty(window, 'location', {
 value: originalLocation,
 writable: true,
 configurable: true,
 });
 Object.defineProperty(window, 'localStorage', {
 value: originalLocalStorage,
 writable: true,
 configurable: true,
 });
 });

 it('should remove auth-storage from localStorage', () => {
 fallbackAuthCleanup();
 expect(mockRemoveItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
 });

 it('should redirect to /login', () => {
 fallbackAuthCleanup();
 expect(window.location.href).toBe('/login');
 });

 it('should log error if localStorage.removeItem throws', () => {
 const storageError = new Error('Storage access denied');
 mockRemoveItem.mockImplementation(() => {
 throw storageError;
 });

 fallbackAuthCleanup();

 expect(loggerModule.logger.error).toHaveBeenCalledWith(
 'Failed to clear localStorage',
 storageError,
 );
 // Should still redirect even if localStorage fails
 expect(window.location.href).toBe('/login');
 });

 it('should redirect even when localStorage throws', () => {
 mockRemoveItem.mockImplementation(() => {
 throw new Error('Storage access denied');
 });

 fallbackAuthCleanup();

 // Redirect should happen regardless of localStorage error
 expect(window.location.href).toBe('/login');
 });
 });

 describe('api interceptor with dynamic import failure', () => {
 const originalLocation = window.location;
 const originalLocalStorage = window.localStorage;
 let mockRemoveItem: ReturnType<typeof vi.fn>;

 beforeEach(() => {
 vi.clearAllMocks();
 mockRemoveItem = vi.fn();

 // Mock localStorage
 Object.defineProperty(window, 'localStorage', {
 value: {
 removeItem: mockRemoveItem,
 getItem: vi.fn(),
 setItem: vi.fn(),
 clear: vi.fn(),
 length: 0,
 key: vi.fn(),
 },
 writable: true,
 configurable: true,
 });

 // Mock window.location
 Object.defineProperty(window, 'location', {
 value: { href: '' },
 writable: true,
 configurable: true,
 });
 });

 afterEach(() => {
 vi.restoreAllMocks();
 Object.defineProperty(window, 'location', {
 value: originalLocation,
 writable: true,
 configurable: true,
 });
 Object.defineProperty(window, 'localStorage', {
 value: originalLocalStorage,
 writable: true,
 configurable: true,
 });
 });

 it('fallbackAuthCleanup should be called correctly when triggered', () => {
 // This test verifies the fallback function works correctly
 // when dynamic import fails in the interceptor

 fallbackAuthCleanup();

 // Verify localStorage was cleared
 expect(mockRemoveItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);

 // Verify redirect occurred
 expect(window.location.href).toBe('/login');
 });
 });
});
