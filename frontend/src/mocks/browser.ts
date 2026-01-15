/**
 * MSW Browser Worker Setup for CI Environment
 * @see #1488 - Lighthouse CI with MSW mocking
 */
import { setupWorker } from 'msw/browser';
import { ciHandlers } from './handlers.ci';

/**
 * Create MSW service worker with CI handlers
 * This worker will intercept network requests when enabled
 */
export const worker = setupWorker(...ciHandlers);
