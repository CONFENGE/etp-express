import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsEvent } from '@/entities/analytics-event.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { SecretAccessLog } from '@/entities/secret-access-log.entity';

/**
 * Service for LGPD-compliant IP address anonymization.
 *
 * Issue #1721 - LGPD: IP address storage non-compliant with Art. 12
 *
 * LGPD Requirements:
 * - Art. 12: Data minimization and retention limitation
 * - Art. 50: Security best practices
 *
 * Strategy:
 * - Store original IP temporarily for security/fraud detection
 * - After retention period, anonymize IPs using SHA-256 hash via PostgreSQL function
 * - Preserve geographic analytics while protecting privacy
 * - Run daily cleanup job to anonymize expired IPs
 */
@Injectable()
export class IpAnonymizationService {
  private readonly logger = new Logger(IpAnonymizationService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsRepo: Repository<AnalyticsEvent>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(SecretAccessLog)
    private secretAccessLogRepo: Repository<SecretAccessLog>,
  ) {}

  /**
   * Daily cron job to anonymize expired IP addresses across all tables.
   * Runs at 2 AM server time to minimize impact on production traffic.
   *
   * LGPD Art. 12: Data retention and minimization
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async anonymizeExpiredIps(): Promise<void> {
    this.logger.log('Starting IP anonymization job (LGPD Art. 12 compliance)');

    const startTime = Date.now();
    let totalAnonymized = 0;

    try {
      // Anonymize analytics events (30-day retention)
      const analyticsCount = await this.anonymizeAnalyticsIps();
      totalAnonymized += analyticsCount;

      // Anonymize audit logs (90-day retention)
      const auditCount = await this.anonymizeAuditLogIps();
      totalAnonymized += auditCount;

      // Anonymize secret access logs (90-day retention)
      const secretCount = await this.anonymizeSecretAccessLogIps();
      totalAnonymized += secretCount;

      const duration = Date.now() - startTime;
      this.logger.log(
        `IP anonymization completed: ${totalAnonymized} IPs anonymized in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('IP anonymization job failed', error);
      throw error;
    }
  }

  /**
   * Anonymize IPs in analytics_events table.
   * Retention period: 30 days (configurable per record)
   */
  private async anonymizeAnalyticsIps(): Promise<number> {
    this.logger.debug('Anonymizing analytics_events IPs');

    // Use raw query with PostgreSQL function for better performance
    const result = await this.analyticsRepo.query(`
      UPDATE analytics_events
      SET
        ip_address = anonymize_ip_address(ip_address),
        ip_anonymized_at = NOW()
      WHERE
        ip_address IS NOT NULL
        AND ip_anonymized_at IS NULL
        AND created_at < NOW() - (ip_retention_days || ' days')::INTERVAL
      RETURNING id
    `);

    const count = result?.length || 0;
    this.logger.debug(`Anonymized ${count} analytics_events IPs`);
    return count;
  }

  /**
   * Anonymize IPs in audit_logs table.
   * Retention period: 90 days (configurable per record)
   */
  private async anonymizeAuditLogIps(): Promise<number> {
    this.logger.debug('Anonymizing audit_logs IPs');

    const result = await this.auditLogRepo.query(`
      UPDATE audit_logs
      SET
        ip_address = anonymize_ip_address(ip_address),
        ip_anonymized_at = NOW()
      WHERE
        ip_address IS NOT NULL
        AND ip_anonymized_at IS NULL
        AND created_at < NOW() - (ip_retention_days || ' days')::INTERVAL
      RETURNING id
    `);

    const count = result?.length || 0;
    this.logger.debug(`Anonymized ${count} audit_logs IPs`);
    return count;
  }

  /**
   * Anonymize IPs in secret_access_logs table.
   * Retention period: 90 days (configurable per record)
   */
  private async anonymizeSecretAccessLogIps(): Promise<number> {
    this.logger.debug('Anonymizing secret_access_logs IPs');

    const result = await this.secretAccessLogRepo.query(`
      UPDATE secret_access_logs
      SET
        ip_address = anonymize_ip_address(ip_address),
        ip_anonymized_at = NOW()
      WHERE
        ip_address IS NOT NULL
        AND ip_anonymized_at IS NULL
        AND accessed_at < NOW() - (ip_retention_days || ' days')::INTERVAL
      RETURNING id
    `);

    const count = result?.length || 0;
    this.logger.debug(`Anonymized ${count} secret_access_logs IPs`);
    return count;
  }

  /**
   * Get anonymization statistics for monitoring/reporting.
   * Useful for LGPD compliance reports.
   */
  async getAnonymizationStats(): Promise<{
    analytics: { total: number; anonymized: number; pending: number };
    auditLogs: { total: number; anonymized: number; pending: number };
    secretAccessLogs: { total: number; anonymized: number; pending: number };
  }> {
    const analyticsStats = await this.analyticsRepo
      .createQueryBuilder('ae')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(CASE WHEN ae.ipAnonymizedAt IS NOT NULL THEN 1 END)',
        'anonymized',
      )
      .addSelect(
        'COUNT(CASE WHEN ae.ipAnonymizedAt IS NULL AND ae.ipAddress IS NOT NULL THEN 1 END)',
        'pending',
      )
      .where('ae.ipAddress IS NOT NULL')
      .getRawOne();

    const auditLogStats = await this.auditLogRepo
      .createQueryBuilder('al')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(CASE WHEN al.ipAnonymizedAt IS NOT NULL THEN 1 END)',
        'anonymized',
      )
      .addSelect(
        'COUNT(CASE WHEN al.ipAnonymizedAt IS NULL AND al.ipAddress IS NOT NULL THEN 1 END)',
        'pending',
      )
      .where('al.ipAddress IS NOT NULL')
      .getRawOne();

    const secretAccessLogStats = await this.secretAccessLogRepo
      .createQueryBuilder('sal')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(CASE WHEN sal.ipAnonymizedAt IS NOT NULL THEN 1 END)',
        'anonymized',
      )
      .addSelect(
        'COUNT(CASE WHEN sal.ipAnonymizedAt IS NULL AND sal.ipAddress IS NOT NULL THEN 1 END)',
        'pending',
      )
      .where('sal.ipAddress IS NOT NULL')
      .getRawOne();

    return {
      analytics: {
        total: parseInt(analyticsStats.total),
        anonymized: parseInt(analyticsStats.anonymized),
        pending: parseInt(analyticsStats.pending),
      },
      auditLogs: {
        total: parseInt(auditLogStats.total),
        anonymized: parseInt(auditLogStats.anonymized),
        pending: parseInt(auditLogStats.pending),
      },
      secretAccessLogs: {
        total: parseInt(secretAccessLogStats.total),
        anonymized: parseInt(secretAccessLogStats.anonymized),
        pending: parseInt(secretAccessLogStats.pending),
      },
    };
  }
}
