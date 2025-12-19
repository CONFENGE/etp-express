import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Structured JSON Logger Service using Winston (#652)
 *
 * Provides environment-aware logging:
 * - Production: JSON format for log aggregation tools (DataDog, ELK, CloudWatch)
 * - Development: Pretty-printed format for readability
 *
 * Standard fields in every log entry:
 * - timestamp: ISO 8601 format
 * - level: error, warn, info, debug
 * - message: Human-readable description
 * - service: Service name (etp-express-backend)
 * - context: NestJS context (controller, service, etc.)
 *
 * @see https://docs.nestjs.com/techniques/logger
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private context?: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    // JSON format for production - easy parsing by log aggregation tools
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    // Pretty format for development - human-readable
    // Only use colorize if stdout is a TTY (not in tests or CI)
    const isTTY = process.stdout.isTTY === true;
    const prettyFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      ...(isTTY ? [winston.format.colorize()] : []),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          const contextStr = context ? `[${context}]` : '';
          const metaStr =
            Object.keys(meta).length > 0
              ? `\n${JSON.stringify(meta, null, 2)}`
              : '';
          return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
        },
      ),
    );

    // Determine log level based on environment
    const logLevel = isTest ? 'error' : isProduction ? 'info' : 'debug';

    this.logger = winston.createLogger({
      level: logLevel,
      format: isProduction ? jsonFormat : prettyFormat,
      defaultMeta: {
        service: 'etp-express-backend',
      },
      transports: [
        new winston.transports.Console({
          silent: isTest && process.env.LOG_IN_TESTS !== 'true',
        }),
      ],
    });
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log at 'info' level
   */
  log(message: string, ...optionalParams: unknown[]): void {
    this.logWithLevel('info', message, optionalParams);
  }

  /**
   * Log at 'error' level
   */
  error(message: string, ...optionalParams: unknown[]): void {
    this.logWithLevel('error', message, optionalParams);
  }

  /**
   * Log at 'warn' level
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    this.logWithLevel('warn', message, optionalParams);
  }

  /**
   * Log at 'debug' level
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    this.logWithLevel('debug', message, optionalParams);
  }

  /**
   * Log at 'verbose' level (mapped to debug in Winston)
   */
  verbose(message: string, ...optionalParams: unknown[]): void {
    this.logWithLevel('debug', message, optionalParams);
  }

  /**
   * Log a structured HTTP request
   */
  logRequest(data: {
    method: string;
    path: string;
    ip?: string;
    userAgent?: string;
    userId?: string;
    organizationId?: string;
    requestId?: string;
  }): void {
    this.logger.info({
      message: 'HTTP Request received',
      context: this.context,
      eventType: 'http_request',
      ...data,
    });
  }

  /**
   * Log a structured HTTP response
   */
  logResponse(data: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    userId?: string;
    organizationId?: string;
    requestId?: string;
  }): void {
    this.logger.info({
      message: 'HTTP Request completed',
      context: this.context,
      eventType: 'http_response',
      ...data,
    });
  }

  /**
   * Log a structured HTTP error
   */
  logError(data: {
    method: string;
    path: string;
    durationMs: number;
    error: string;
    stack?: string;
    statusCode?: number;
    userId?: string;
    organizationId?: string;
    requestId?: string;
  }): void {
    this.logger.error({
      message: 'HTTP Request failed',
      context: this.context,
      eventType: 'http_error',
      ...data,
    });
  }

  /**
   * Internal method to handle logging with proper context extraction
   */
  private logWithLevel(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    optionalParams: unknown[],
  ): void {
    // Extract context from optional params (NestJS convention)
    let context = this.context;
    let meta: Record<string, unknown> = {};

    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];

      // If last param is a string, treat it as context (NestJS convention)
      if (typeof lastParam === 'string') {
        context = lastParam;
        optionalParams = optionalParams.slice(0, -1);
      }

      // If there's an object param, merge it as metadata
      if (optionalParams.length > 0) {
        const firstParam = optionalParams[0];
        if (typeof firstParam === 'object' && firstParam !== null) {
          meta = firstParam as Record<string, unknown>;
        } else if (firstParam !== undefined) {
          // Handle stack traces for error logging
          if (level === 'error' && typeof firstParam === 'string') {
            meta.stack = firstParam;
          } else {
            meta.details = firstParam;
          }
        }
      }
    }

    this.logger.log(level, message, {
      context,
      ...meta,
    });
  }
}

/**
 * Factory function to create a logger with a specific context
 */
export function createLogger(context: string): WinstonLoggerService {
  const logger = new WinstonLoggerService();
  logger.setContext(context);
  return logger;
}
