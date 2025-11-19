import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';
import { SecretAccessStatus } from '../../entities/secret-access-log.entity';

/**
 * Wrapper service for accessing secrets with audit logging
 *
 * @remarks
 * This service wraps ConfigService to provide centralized access to secrets
 * with automatic audit trail logging. All secret access goes through this
 * service to ensure compliance and security monitoring.
 *
 * Usage:
 * ```typescript
 * // Instead of:
 * const apiKey = this.configService.get('OPENAI_API_KEY');
 *
 * // Use:
 * const apiKey = await this.secretsService.get('OPENAI_API_KEY', 'OpenAIService');
 * ```
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  // List of environment variables that are considered secrets
  private readonly sensitiveKeys = new Set([
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY',
    'DATABASE_URL',
    'DATABASE_PASSWORD',
    'SENTRY_DSN',
    'SMTP_PASSWORD',
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get a secret value with audit logging
   *
   * @param name Name of the secret/environment variable
   * @param accessedBy Service or context accessing the secret
   * @param ipAddress Optional IP address of the request
   * @returns The secret value
   * @throws Error if secret is not found and no default provided
   */
  async get<T = string>(
    name: string,
    accessedBy: string,
    ipAddress?: string,
  ): Promise<T> {
    try {
      const value = this.configService.get<T>(name);

      if (value === undefined) {
        // Log failed access
        await this.logAccess(
          name,
          accessedBy,
          SecretAccessStatus.FAILED,
          ipAddress,
          `Secret '${name}' not found`,
        );
        throw new Error(`Secret '${name}' not found in configuration`);
      }

      // Only log access to sensitive keys to avoid noise
      if (this.sensitiveKeys.has(name)) {
        await this.logAccess(
          name,
          accessedBy,
          SecretAccessStatus.SUCCESS,
          ipAddress,
        );
      }

      return value;
    } catch (error) {
      if (error.message.includes('not found')) {
        throw error;
      }

      // Log unexpected errors
      await this.logAccess(
        name,
        accessedBy,
        SecretAccessStatus.FAILED,
        ipAddress,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get a secret value with a default fallback (no error on missing)
   */
  async getOrDefault<T = string>(
    name: string,
    accessedBy: string,
    defaultValue: T,
    ipAddress?: string,
  ): Promise<T> {
    const value = this.configService.get<T>(name);

    if (value === undefined) {
      this.logger.debug(
        `Secret '${name}' not found, using default value`,
      );
      return defaultValue;
    }

    // Only log access to sensitive keys
    if (this.sensitiveKeys.has(name)) {
      await this.logAccess(
        name,
        accessedBy,
        SecretAccessStatus.SUCCESS,
        ipAddress,
      );
    }

    return value;
  }

  /**
   * Check if a secret exists
   */
  has(name: string): boolean {
    return this.configService.get(name) !== undefined;
  }

  /**
   * Log secret access (async, non-blocking)
   */
  private async logAccess(
    secretName: string,
    accessedBy: string,
    status: SecretAccessStatus,
    ipAddress?: string,
    errorMessage?: string,
  ): Promise<void> {
    // Run async to not block the caller
    setImmediate(async () => {
      try {
        await this.auditService.logSecretAccess(
          secretName,
          accessedBy,
          status,
          ipAddress,
          errorMessage,
        );

        // Check for anomalies on successful access
        if (status === SecretAccessStatus.SUCCESS) {
          const isAnomalous =
            await this.auditService.detectAnomalies(secretName);
          if (isAnomalous) {
            this.logger.warn(
              `ANOMALY DETECTED: High frequency access to ${secretName}. Consider investigating.`,
            );
            // Future: Send alert via email/Slack/PagerDuty
          }
        }
      } catch (error) {
        // Don't fail the main operation if logging fails
        this.logger.error(
          `Failed to log secret access: ${error.message}`,
        );
      }
    });
  }

  /**
   * Mark a key as sensitive (for runtime additions)
   */
  addSensitiveKey(key: string): void {
    this.sensitiveKeys.add(key);
  }

  /**
   * Check if a key is considered sensitive
   */
  isSensitive(key: string): boolean {
    return this.sensitiveKeys.has(key);
  }
}
