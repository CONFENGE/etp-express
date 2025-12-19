import * as Sentry from '@sentry/react';

/**
 * Log level types for the logging service.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Context object for structured logging.
 * Allows attaching arbitrary metadata to log entries.
 */
export interface LogContext {
  [key: string]: unknown;
}

const isDev =
  import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test';

/**
 * Formats a log message with timestamp and level.
 *
 * @param level - Log level
 * @param message - Log message
 * @returns Formatted log string
 */
const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Internal logging function that handles console output in development.
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Optional context object
 */
const logToConsole = (
  level: LogLevel,
  message: string,
  context?: LogContext,
): void => {
  if (!isDev) return;

  const formattedMessage = formatMessage(level, message);
  const args = context ? [formattedMessage, context] : [formattedMessage];

  switch (level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      // Error logging is handled separately with stack trace
      break;
  }
};

/**
 * Frontend logging service with Sentry integration.
 *
 * Features:
 * - Structured logging with context
 * - Console output in development
 * - Sentry error tracking in production
 * - Consistent log format across application
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Simple logging
 * logger.debug('Loading component');
 * logger.info('User logged in');
 * logger.warn('Rate limit approaching');
 *
 * // Error with context
 * try {
 * await fetchData();
 * } catch (error) {
 * logger.error('Failed to fetch data', error, { userId: '123' });
 * }
 * ```
 */
export const logger = {
  /**
   * Log debug message (development only).
   *
   * @param message - Debug message
   * @param context - Optional context object
   */
  debug: (message: string, context?: LogContext): void => {
    logToConsole('debug', message, context);
  },

  /**
   * Log informational message.
   *
   * @param message - Info message
   * @param context - Optional context object
   */
  info: (message: string, context?: LogContext): void => {
    logToConsole('info', message, context);

    // Add breadcrumb for production tracing
    if (!isDev) {
      Sentry.addBreadcrumb({
        category: 'app',
        message,
        level: 'info',
        data: context,
      });
    }
  },

  /**
   * Log warning message.
   *
   * @param message - Warning message
   * @param context - Optional context object
   */
  warn: (message: string, context?: LogContext): void => {
    logToConsole('warn', message, context);

    // Add breadcrumb for production tracing
    if (!isDev) {
      Sentry.addBreadcrumb({
        category: 'app',
        message,
        level: 'warning',
        data: context,
      });
    }
  },

  /**
   * Log error and send to Sentry.
   *
   * @param message - Error message
   * @param error - Error object or unknown value
   * @param context - Optional context object
   */
  error: (
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): void => {
    const errorObj =
      error instanceof Error
        ? error
        : new Error(
            typeof error === 'string' ? error : String(error ?? message),
          );

    // Development: console with stack trace
    if (isDev) {
      const formattedMessage = formatMessage('error', message);
      if (context) {
        console.error(formattedMessage, errorObj, context);
      } else {
        console.error(formattedMessage, errorObj);
      }
    }

    // Production: send to Sentry
    Sentry.captureException(errorObj, {
      extra: {
        message,
        ...context,
      },
      tags: {
        errorType: 'application_error',
      },
    });
  },

  /**
   * Set user context for Sentry tracking.
   *
   * @param user - User information
   */
  setUser: (
    user: { id: string; email?: string; username?: string } | null,
  ): void => {
    Sentry.setUser(user);
  },

  /**
   * Add custom context to all subsequent Sentry events.
   *
   * @param name - Context name
   * @param context - Context object
   */
  setContext: (name: string, context: LogContext | null): void => {
    Sentry.setContext(name, context);
  },
};
