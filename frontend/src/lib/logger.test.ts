import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { logger, type LogContext } from './logger';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
}));

describe('logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logging methods', () => {
    it('should log debug messages to console', () => {
      logger.debug('Test debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleDebugSpy.mock.calls[0][0]).toContain(
        '[DEBUG] Test debug message',
      );
    });

    it('should log debug messages with context', () => {
      const context: LogContext = { userId: '123', action: 'test' };
      logger.debug('Test with context', context);
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleDebugSpy.mock.calls[0][1]).toEqual(context);
    });

    it('should log info messages to console', () => {
      logger.info('Test info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleInfoSpy.mock.calls[0][0]).toContain(
        '[INFO] Test info message',
      );
    });

    it('should log info messages with context', () => {
      const context: LogContext = { page: 'home' };
      logger.info('User visited page', context);
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleInfoSpy.mock.calls[0][1]).toEqual(context);
    });

    it('should log warn messages to console', () => {
      logger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN] Test warning');
    });

    it('should log warn messages with context', () => {
      const context: LogContext = { limit: 100 };
      logger.warn('Rate limit approaching', context);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][1]).toEqual(context);
    });

    it('should log error messages to console with Error object', () => {
      const testError = new Error('Test error');
      logger.error('Error occurred', testError);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        '[ERROR] Error occurred',
      );
      expect(consoleErrorSpy.mock.calls[0][1]).toBe(testError);
    });

    it('should log error messages with context', () => {
      const testError = new Error('Test error');
      const context: LogContext = { endpoint: '/api/test' };
      logger.error('Error occurred', testError, context);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][2]).toEqual(context);
    });

    it('should convert string errors to Error objects', () => {
      logger.error('String error', 'Error string message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('Error string message');
    });

    it('should create Error from message when error is undefined', () => {
      logger.error('No error object');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('No error object');
    });
  });

  describe('Sentry integration', () => {
    it('should send errors to Sentry with captureException', () => {
      const testError = new Error('Sentry test error');
      const context: LogContext = { userId: '456' };
      logger.error('Error for Sentry', testError, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
        extra: {
          message: 'Error for Sentry',
          userId: '456',
        },
        tags: {
          errorType: 'application_error',
        },
      });
    });

    it('should send error without context to Sentry', () => {
      const testError = new Error('Simple error');
      logger.error('Simple error message', testError);

      expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
        extra: {
          message: 'Simple error message',
        },
        tags: {
          errorType: 'application_error',
        },
      });
    });

    it('should call setUser with user object', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      logger.setUser(user);
      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should call setUser with null to clear', () => {
      logger.setUser(null);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should call setContext', () => {
      const context: LogContext = { organization: 'test-org' };
      logger.setContext('app', context);
      expect(Sentry.setContext).toHaveBeenCalledWith('app', context);
    });

    it('should call setContext with null to clear', () => {
      logger.setContext('app', null);
      expect(Sentry.setContext).toHaveBeenCalledWith('app', null);
    });
  });

  describe('log format', () => {
    it('should include ISO timestamp in log message', () => {
      logger.info('Timestamp test');
      const logMessage = consoleInfoSpy.mock.calls[0][0];
      // Match ISO 8601 format
      expect(logMessage).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/,
      );
    });

    it('should include WARN level in uppercase', () => {
      logger.warn('Level test');
      const logMessage = consoleWarnSpy.mock.calls[0][0];
      expect(logMessage).toContain('[WARN]');
    });

    it('should include DEBUG level in uppercase', () => {
      logger.debug('Debug format');
      const logMessage = consoleDebugSpy.mock.calls[0][0];
      expect(logMessage).toContain('[DEBUG]');
    });

    it('should include ERROR level in uppercase', () => {
      logger.error('Error format', new Error('test'));
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('[ERROR]');
    });

    it('should include INFO level in uppercase', () => {
      logger.info('Info format');
      const logMessage = consoleInfoSpy.mock.calls[0][0];
      expect(logMessage).toContain('[INFO]');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null error gracefully', () => {
      logger.error('Null error', null);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('Null error');
    });

    it('should handle number as error', () => {
      logger.error('Number error', 404);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('404');
    });

    it('should handle object as error', () => {
      const errorObj = { code: 'ERR_001', details: 'Something went wrong' };
      logger.error('Object error', errorObj);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
    });

    it('should handle undefined error', () => {
      logger.error('Undefined error', undefined);
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
    });

    it('should handle empty string as error', () => {
      logger.error('Empty string error', '');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorArg = consoleErrorSpy.mock.calls[0][1];
      expect(errorArg).toBeInstanceOf(Error);
    });
  });
});
