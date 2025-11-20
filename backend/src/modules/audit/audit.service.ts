import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  SecretAccessLog,
  SecretAccessStatus,
} from '../../entities/secret-access-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(SecretAccessLog)
    private logsRepository: Repository<SecretAccessLog>,
  ) {}

  /**
   * Log access to a secret
   * @param secretName Name of the secret being accessed
   * @param accessedBy Service/context that accessed the secret
   * @param status Result of the access attempt
   * @param ipAddress Optional IP address of the requester
   * @param errorMessage Optional error message if access failed
   */
  async logSecretAccess(
    secretName: string,
    accessedBy: string,
    status: SecretAccessStatus,
    ipAddress?: string,
    errorMessage?: string,
  ): Promise<SecretAccessLog> {
    const log = this.logsRepository.create({
      secretName,
      accessedBy,
      status,
      ipAddress,
      errorMessage,
    });

    const savedLog = await this.logsRepository.save(log);

    // Log critical events for failed or unauthorized access
    if (status === SecretAccessStatus.FAILED) {
      this.logger.error(
        `Secret access failed: ${secretName} by ${accessedBy} - ${errorMessage || 'Unknown error'}`,
      );
    } else if (status === SecretAccessStatus.UNAUTHORIZED) {
      this.logger.warn(
        `Unauthorized secret access attempt: ${secretName} by ${accessedBy}`,
      );
    }

    return savedLog;
  }

  /**
   * Get recent access logs for a specific secret
   * @param secretName Name of the secret
   * @param limit Maximum number of logs to return
   */
  async getRecentAccess(
    secretName: string,
    limit = 100,
  ): Promise<SecretAccessLog[]> {
    return this.logsRepository.find({
      where: { secretName },
      order: { accessedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get all access logs with optional filtering
   * @param options Filter options
   */
  async getAccessLogs(options?: {
    secretName?: string;
    status?: SecretAccessStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SecretAccessLog[]; total: number }> {
    const { secretName, status, limit = 100, offset = 0 } = options || {};

    const queryBuilder = this.logsRepository.createQueryBuilder('log');

    if (secretName) {
      queryBuilder.andWhere('log.secretName = :secretName', { secretName });
    }

    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }

    queryBuilder.orderBy('log.accessedAt', 'DESC').skip(offset).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  /**
   * Detect anomalous access patterns
   * Returns true if more than threshold accesses occurred in the time window
   * @param secretName Name of the secret to check
   * @param thresholdCount Number of accesses that triggers anomaly (default: 100)
   * @param windowMs Time window in milliseconds (default: 60000 = 1 minute)
   */
  async detectAnomalies(
    secretName: string,
    thresholdCount = 100,
    windowMs = 60000,
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMs);

    const count = await this.logsRepository.count({
      where: {
        secretName,
        accessedAt: MoreThan(windowStart),
      },
    });

    if (count > thresholdCount) {
      this.logger.warn(
        `Anomaly detected: ${count} accesses to ${secretName} in last ${windowMs / 1000} seconds (threshold: ${thresholdCount})`,
      );
      return true;
    }

    return false;
  }

  /**
   * Get anomaly status for a secret
   */
  async getAnomalyStatus(
    secretName: string,
    thresholdCount = 100,
    windowMs = 60000,
  ): Promise<{
    secretName: string;
    anomalous: boolean;
    accessCount: number;
    threshold: number;
    windowSeconds: number;
  }> {
    const windowStart = new Date(Date.now() - windowMs);

    const accessCount = await this.logsRepository.count({
      where: {
        secretName,
        accessedAt: MoreThan(windowStart),
      },
    });

    return {
      secretName,
      anomalous: accessCount > thresholdCount,
      accessCount,
      threshold: thresholdCount,
      windowSeconds: windowMs / 1000,
    };
  }

  /**
   * Get statistics for secret access
   */
  async getAccessStats(secretName?: string): Promise<{
    totalAccesses: number;
    successCount: number;
    failedCount: number;
    unauthorizedCount: number;
    uniqueSecrets?: number;
  }> {
    const queryBuilder = this.logsRepository.createQueryBuilder('log');

    if (secretName) {
      queryBuilder.where('log.secretName = :secretName', { secretName });
    }

    const totalAccesses = await queryBuilder.getCount();

    const successCount = await queryBuilder
      .clone()
      .andWhere('log.status = :status', { status: SecretAccessStatus.SUCCESS })
      .getCount();

    const failedCount = await queryBuilder
      .clone()
      .andWhere('log.status = :status', { status: SecretAccessStatus.FAILED })
      .getCount();

    const unauthorizedCount = await queryBuilder
      .clone()
      .andWhere('log.status = :status', {
        status: SecretAccessStatus.UNAUTHORIZED,
      })
      .getCount();

    const stats: {
      totalAccesses: number;
      successCount: number;
      failedCount: number;
      unauthorizedCount: number;
      uniqueSecrets?: number;
    } = {
      totalAccesses,
      successCount,
      failedCount,
      unauthorizedCount,
    };

    if (!secretName) {
      const uniqueSecrets = await this.logsRepository
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.secretName)', 'count')
        .getRawOne();
      stats.uniqueSecrets = parseInt(uniqueSecrets.count, 10);
    }

    return stats;
  }

  /**
   * Cleanup old logs (retention policy)
   * @param retentionDays Number of days to keep logs (default: 90)
   */
  async cleanupOldLogs(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.logsRepository
      .createQueryBuilder()
      .delete()
      .where('accessedAt < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;

    if (deletedCount > 0) {
      this.logger.log(
        `Cleaned up ${deletedCount} old secret access logs (older than ${retentionDays} days)`,
      );
    }

    return deletedCount;
  }
}
