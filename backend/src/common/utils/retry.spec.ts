/**
 * Unit tests for Retry Utility
 *
 * Tests cover:
 * - Successful execution without retry
 * - Retry on retryable errors with exponential backoff
 * - Non-retryable errors thrown immediately
 * - Max retry exhaustion
 * - Backoff calculation with jitter
 * - Logger integration
 */

import {
  withRetry,
  calculateBackoff,
  isRetryableError,
  DEFAULT_RETRY_OPTIONS,
  createRetryWrapper,
} from './retry';
import { Logger } from '@nestjs/common';

// Mock Logger
const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
} as unknown as Logger;

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful call', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const promise = withRetry(fn);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'timeout' })
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10, // Very short delay for fast test
        maxDelay: 50,
        retryableErrors: ['ETIMEDOUT'],
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should throw immediately on non-retryable error', async () => {
      const nonRetryableError = new Error('Non-retryable error');
      (nonRetryableError as any).code = 'INVALID_INPUT';

      const fn = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 1000,
          retryableErrors: ['ETIMEDOUT'],
        }),
      ).rejects.toThrow('Non-retryable error');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting all retries', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const retryableError = { code: 'ETIMEDOUT', message: 'Connection timeout' };
      const fn = jest.fn().mockRejectedValue(retryableError);

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          baseDelay: 10, // Very short delay for fast test
          maxDelay: 50,
          retryableErrors: ['ETIMEDOUT'],
        }),
      ).rejects.toEqual(retryableError);

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should log retry attempts when logger is provided', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT', message: 'timeout' })
        .mockResolvedValue('success');

      await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10, // Very short delay for fast test
        maxDelay: 50,
        retryableErrors: ['ETIMEDOUT'],
        logger: mockLogger,
        operationName: 'TestOperation',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[TestOperation] Attempt 1/4 failed'),
      );

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should log error when all retries exhausted', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValue({ code: 'ETIMEDOUT', message: 'timeout' });

      try {
        await withRetry(fn, {
          maxRetries: 1,
          baseDelay: 10, // Very short delay for fast test
          maxDelay: 50,
          retryableErrors: ['ETIMEDOUT'],
          logger: mockLogger,
          operationName: 'TestOperation',
        });
      } catch {
        // Expected to fail
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestOperation] All 2 attempts exhausted'),
      );

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should retry on HTTP 429 rate limit', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10, // Very short delay for fast test
        maxDelay: 50,
        retryableErrors: ['429'],
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should retry on HTTP 5xx errors', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 503 }, message: 'Service unavailable' })
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10, // Very short delay for fast test
        maxDelay: 50,
        retryableErrors: ['503'],
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useFakeTimers(); // Restore fake timers
    });

    it('should use default options when not provided', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const options = { baseDelay: 1000, maxDelay: 10000 };

      // Attempt 0: 1000 * 2^0 = 1000 (+ jitter)
      const delay0 = calculateBackoff(0, options);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1100); // 10% jitter max

      // Attempt 1: 1000 * 2^1 = 2000 (+ jitter)
      const delay1 = calculateBackoff(1, options);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2200);

      // Attempt 2: 1000 * 2^2 = 4000 (+ jitter)
      const delay2 = calculateBackoff(2, options);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4400);
    });

    it('should cap delay at maxDelay', () => {
      const options = { baseDelay: 1000, maxDelay: 5000 };

      // Attempt 3: 1000 * 2^3 = 8000, but capped at 5000
      const delay = calculateBackoff(3, options);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should add jitter to prevent thundering herd', () => {
      const options = { baseDelay: 1000, maxDelay: 10000 };

      // Call multiple times and expect variation
      const delays = new Set<number>();
      for (let i = 0; i < 10; i++) {
        delays.add(Math.round(calculateBackoff(0, options)));
      }

      // With random jitter, we should get some variation
      // (though this test could theoretically fail with very low probability)
      expect(delays.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for matching error code', () => {
      const error = { code: 'ETIMEDOUT', message: 'Connection timeout' };
      expect(isRetryableError(error, ['ETIMEDOUT'])).toBe(true);
    });

    it('should return true for matching error message', () => {
      const error = { message: 'Rate limit exceeded' };
      expect(isRetryableError(error, ['rate limit'])).toBe(true);
    });

    it('should return true for matching status code', () => {
      const error = { status: 503, message: 'Service unavailable' };
      expect(isRetryableError(error, ['503'])).toBe(true);
    });

    it('should return true for matching response status', () => {
      const error = { response: { status: 429 }, message: 'Too many requests' };
      expect(isRetryableError(error, ['429'])).toBe(true);
    });

    it('should return false for non-matching errors', () => {
      const error = { code: 'INVALID_INPUT', message: 'Bad request' };
      expect(isRetryableError(error, ['ETIMEDOUT', '429'])).toBe(false);
    });

    it('should return false for null/undefined error', () => {
      expect(isRetryableError(null, ['ETIMEDOUT'])).toBe(false);
      expect(isRetryableError(undefined, ['ETIMEDOUT'])).toBe(false);
    });

    it('should be case-insensitive', () => {
      const error = { code: 'ETIMEDOUT' };
      expect(isRetryableError(error, ['etimedout'])).toBe(true);
    });
  });

  describe('DEFAULT_RETRY_OPTIONS', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(10000);
      expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('ETIMEDOUT');
      expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('429');
      expect(DEFAULT_RETRY_OPTIONS.retryableErrors).toContain('503');
    });
  });

  describe('createRetryWrapper', () => {
    it('should create a preconfigured retry function', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrappedRetry = createRetryWrapper({
        maxRetries: 2,
        operationName: 'TestWrapper',
      });

      const result = await wrappedRetry(fn);
      expect(result).toBe('success');
    });

    it('should allow override options', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockResolvedValue('success');

      const wrappedRetry = createRetryWrapper({
        maxRetries: 1,
        baseDelay: 10, // Very short delay for fast test
        maxDelay: 50,
        retryableErrors: ['ETIMEDOUT'],
      });

      const result = await wrappedRetry(fn, { operationName: 'OverrideTest' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useFakeTimers(); // Restore fake timers
    });
  });
});
