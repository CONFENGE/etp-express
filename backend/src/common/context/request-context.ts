import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request Context Store (#653)
 *
 * Uses Node.js AsyncLocalStorage to propagate request context across
 * async operations without explicitly passing it through function calls.
 *
 * This enables request-scoped data like requestId to be accessed from anywhere
 * in the call chain, including services, repositories, and external API calls.
 *
 * @example
 * // Get current request ID from anywhere in the code
 * const requestId = getRequestId();
 *
 * @see https://nodejs.org/api/async_context.html
 */

export interface RequestContextData {
  /**
   * Unique identifier for the request (UUID v4)
   * Can be generated internally or accepted from X-Request-ID header
   */
  requestId: string;

  /**
   * Timestamp when request started (for duration calculations)
   */
  startTime?: number;
}

/**
 * Global AsyncLocalStorage instance for request context
 * Automatically propagates context through async call chains
 */
export const requestContextStorage =
  new AsyncLocalStorage<RequestContextData>();

/**
 * Get the current request context
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContextData | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the current request ID
 * Returns undefined if called outside of a request context
 *
 * @example
 * ```typescript
 * // In any service or function
 * const requestId = getRequestId();
 * this.logger.log('Processing', { requestId });
 * ```
 */
export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}

/**
 * Get request start time
 * Returns undefined if called outside of a request context
 */
export function getRequestStartTime(): number | undefined {
  return getRequestContext()?.startTime;
}

/**
 * Run a function within a request context
 * Use this to establish a new request context for async operations
 *
 * @param context - Request context data to propagate
 * @param fn - Function to run within the context
 * @returns The return value of the function
 *
 * @example
 * ```typescript
 * runInRequestContext({ requestId: 'abc-123' }, async () => {
 * // All async operations here will have access to requestId
 * await someService.doSomething();
 * });
 * ```
 */
export function runInRequestContext<T>(
  context: RequestContextData,
  fn: () => T,
): T {
  return requestContextStorage.run(context, fn);
}
