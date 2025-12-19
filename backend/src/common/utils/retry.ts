/**
 * Retry Utility with Exponential Backoff
 *
 * Provides resilient retry logic for transient failures in external API calls.
 * Works together with Circuit Breakers to provide comprehensive fault tolerance.
 *
 * @module common/utils/retry
 */

import { Logger } from '@nestjs/common';

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000ms) */
  baseDelay: number;
  /** Maximum delay cap in milliseconds (default: 10000ms) */
  maxDelay: number;
  /** Error codes/messages that should trigger a retry */
  retryableErrors: string[];
  /** Optional logger instance for retry logging */
  logger?: Logger;
  /** Operation name for logging (default: 'operation') */
  operationName?: string;
}

/**
 * Default retry configuration optimized for external API calls
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableErrors: [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
    'rate_limit',
    'rate_limit_exceeded',
    '429',
    '500',
    '502',
    '503',
    '504',
    'timeout',
    'network error',
  ],
};

/**
 * Sleep utility for async delay
 * @param ms Milliseconds to sleep
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 *
 * Uses exponential backoff formula: baseDelay * 2^attempt + random jitter
 * Jitter prevents thundering herd problem when multiple clients retry simultaneously
 *
 * @param attempt Current attempt number (0-indexed)
 * @param options Retry options containing delay configuration
 * @returns Calculated delay in milliseconds
 */
export function calculateBackoff(
  attempt: number,
  options: Pick<RetryOptions, 'baseDelay' | 'maxDelay'>,
): number {
  const exponential = options.baseDelay * Math.pow(2, attempt);
  // Add 10% random jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * exponential;
  return Math.min(exponential + jitter, options.maxDelay);
}

/**
 * Check if an error is retryable based on configured error patterns
 *
 * @param error The error to check
 * @param retryableErrors List of error codes/messages that are retryable
 * @returns True if the error is retryable
 */
export function isRetryableError(
  error: unknown,
  retryableErrors: string[],
): boolean {
  if (!error) return false;

  const errorObj = error as Record<string, unknown>;
  const errorCode = String(errorObj.code || '').toLowerCase();
  const errorMessage = String(errorObj.message || '').toLowerCase();
  const errorStatus = String(errorObj.status || errorObj.statusCode || '');
  const responseStatus = String(
    (errorObj.response as Record<string, unknown>)?.status || '',
  );

  return retryableErrors.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    return (
      errorCode.includes(lowerPattern) ||
      errorMessage.includes(lowerPattern) ||
      errorStatus === pattern ||
      responseStatus === pattern
    );
  });
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * This function wraps any async operation with retry capability,
 * automatically retrying on transient failures with increasing delays.
 *
 * @template T Return type of the wrapped function
 * @param fn Async function to execute with retry
 * @param options Retry configuration (uses defaults if not provided)
 * @returns Promise resolving to the function result
 * @throws Last error encountered if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 * () => this.openai.chat.completions.create(request),
 * {
 * maxRetries: 3,
 * baseDelay: 1000,
 * maxDelay: 8000,
 * retryableErrors: ['ETIMEDOUT', '429'],
 * logger: this.logger,
 * operationName: 'OpenAI completion'
 * }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const {
    maxRetries,
    retryableErrors,
    logger,
    operationName = 'operation',
  } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        logger?.debug(
          `[${operationName}] Non-retryable error encountered: ${(error as Error).message}`,
        );
        throw error;
      }

      // Check if we have retries left
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, config);

        logger?.warn(
          `[${operationName}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${(error as Error).message}. ` +
            `Retrying in ${Math.round(delay)}ms...`,
        );

        await sleep(delay);
      } else {
        logger?.error(
          `[${operationName}] All ${maxRetries + 1} attempts exhausted. Last error: ${(error as Error).message}`,
        );
      }
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Create a retry wrapper with pre-configured options
 *
 * Useful for creating service-specific retry functions
 *
 * @param defaultOptions Default options for all retries using this wrapper
 * @returns A configured withRetry function
 *
 * @example
 * ```typescript
 * const openAIRetry = createRetryWrapper({
 * maxRetries: 3,
 * logger: this.logger,
 * operationName: 'OpenAI API'
 * });
 *
 * const result = await openAIRetry(() => this.callAPI());
 * ```
 */
export function createRetryWrapper(defaultOptions: Partial<RetryOptions>) {
  return <T>(
    fn: () => Promise<T>,
    overrideOptions: Partial<RetryOptions> = {},
  ): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions });
  };
}
