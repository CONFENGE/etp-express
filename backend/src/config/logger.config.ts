/**
 * Environment-aware log levels configuration (#608)
 *
 * This module provides log level configuration based on the runtime environment
 * to prevent data leakage in production while enabling full debugging in development.
 *
 * Security rationale:
 * - Production: Only error and warn to prevent sensitive data from being logged
 * - Staging: Add log level for operational visibility without debug noise
 * - Development: All levels for full debugging capability
 * - Test: Minimal logging to keep test output clean
 *
 * @see https://docs.nestjs.com/techniques/logger
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */

export type LogLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

/**
 * Log levels for each environment
 *
 * IMPORTANT: Do not add 'debug' or 'verbose' to production/staging
 * as these may log sensitive data (request bodies, tokens, etc.)
 */
export const LOG_LEVELS: Record<string, LogLevel[]> = {
  production: ['error', 'warn'],
  staging: ['error', 'warn', 'log'],
  development: ['error', 'warn', 'log', 'debug', 'verbose'],
  test: ['error', 'warn'],
};

/**
 * Gets the appropriate log levels for the current environment
 *
 * @param nodeEnv - Optional environment override (defaults to process.env.NODE_ENV)
 * @returns Array of log levels for the environment
 *
 * @example
 * // In production
 * getLogLevels('production') // ['error', 'warn']
 *
 * @example
 * // In development
 * getLogLevels('development') // ['error', 'warn', 'log', 'debug', 'verbose']
 */
export function getLogLevels(nodeEnv?: string): LogLevel[] {
  const env = nodeEnv ?? process.env.NODE_ENV ?? 'development';
  return LOG_LEVELS[env] ?? LOG_LEVELS.development;
}
