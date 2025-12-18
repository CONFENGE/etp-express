/**
 * Government Data Sync Service
 *
 * Service for managing scheduled government data synchronization jobs.
 * Provides methods to add jobs to queue, check status, and manually trigger syncs.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SinapiSyncJobData,
  SicroSyncJobData,
  GovCacheRefreshJobData,
  GOV_DATA_SYNC_QUEUE,
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
  getCurrentReferenceMonth,
  getCurrentQuarterReferenceMonth,
} from './gov-data-sync.types';

/**
 * Service for managing government data sync jobs
 *
 * Schedules and triggers BullMQ jobs for:
 * - SINAPI monthly sync (day 5 at 03:00)
 * - SICRO quarterly sync (day 1 of quarter months at 03:00)
 * - Cache refresh weekly (Sunday at 02:00)
 */
@Injectable()
export class GovDataSyncService implements OnModuleInit {
  private readonly logger = new Logger(GovDataSyncService.name);

  constructor(
    @InjectQueue(GOV_DATA_SYNC_QUEUE)
    private readonly syncQueue: Queue,
  ) {}

  /**
   * Log service initialization
   */
  onModuleInit(): void {
    this.logger.log('GovDataSyncService initialized');
    this.logger.log('Scheduled jobs:');
    this.logger.log('  - SINAPI: Monthly on day 5 at 03:00');
    this.logger.log(
      '  - SICRO: Quarterly on day 1 at 03:00 (Jan, Apr, Jul, Oct)',
    );
    this.logger.log('  - Cache refresh: Weekly on Sunday at 02:00');
  }

  /**
   * Monthly SINAPI sync - runs on day 5 at 03:00
   *
   * SINAPI data is published by CAIXA around day 10 of each month.
   * We schedule for day 5 to check, retry if not available.
   */
  @Cron('0 3 5 * *', {
    name: 'sinapi-monthly-sync',
    timeZone: 'America/Sao_Paulo',
  })
  async scheduleSinapiSync(): Promise<void> {
    this.logger.log('Scheduled SINAPI monthly sync triggered');
    await this.addSinapiSyncJob({
      mesReferencia: getCurrentReferenceMonth(),
      tipo: 'ALL',
      force: false,
    });
  }

  /**
   * Quarterly SICRO sync - runs on day 1 of Jan, Apr, Jul, Oct at 03:00
   *
   * SICRO is published quarterly by DNIT.
   */
  @Cron('0 3 1 1,4,7,10 *', {
    name: 'sicro-quarterly-sync',
    timeZone: 'America/Sao_Paulo',
  })
  async scheduleSicroSync(): Promise<void> {
    this.logger.log('Scheduled SICRO quarterly sync triggered');
    await this.addSicroSyncJob({
      mesReferencia: getCurrentQuarterReferenceMonth(),
      tipo: 'ALL',
      force: false,
    });
  }

  /**
   * Weekly cache refresh - runs on Sunday at 02:00
   *
   * Cleans up expired cache entries to prevent memory bloat.
   */
  @Cron(CronExpression.EVERY_WEEK, {
    name: 'gov-cache-weekly-refresh',
    timeZone: 'America/Sao_Paulo',
  })
  async scheduleCacheRefresh(): Promise<void> {
    this.logger.log('Scheduled cache refresh triggered');
    await this.addCacheRefreshJob({
      cacheType: 'all',
      maxAgeHours: 168, // 1 week
    });
  }

  /**
   * Add a SINAPI sync job to the queue
   *
   * @param data Job data
   * @returns Job ID
   */
  async addSinapiSyncJob(data: SinapiSyncJobData = {}): Promise<string> {
    const job = await this.syncQueue.add(SINAPI_SYNC_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute initial delay
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 100, // Keep last 100 jobs
      },
      removeOnFail: {
        age: 604800, // Keep failed jobs for 7 days
      },
    });

    this.logger.log(
      `Added SINAPI sync job ${job.id} with data: ${JSON.stringify(data)}`,
    );
    return job.id ?? 'unknown';
  }

  /**
   * Add a SICRO sync job to the queue
   *
   * @param data Job data
   * @returns Job ID
   */
  async addSicroSyncJob(data: SicroSyncJobData = {}): Promise<string> {
    const job = await this.syncQueue.add(SICRO_SYNC_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute initial delay
      },
      removeOnComplete: {
        age: 86400,
        count: 100,
      },
      removeOnFail: {
        age: 604800,
      },
    });

    this.logger.log(
      `Added SICRO sync job ${job.id} with data: ${JSON.stringify(data)}`,
    );
    return job.id ?? 'unknown';
  }

  /**
   * Add a cache refresh job to the queue
   *
   * @param data Job data
   * @returns Job ID
   */
  async addCacheRefreshJob(data: GovCacheRefreshJobData = {}): Promise<string> {
    const job = await this.syncQueue.add(GOV_CACHE_REFRESH_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds initial delay
      },
      removeOnComplete: {
        age: 86400,
        count: 50,
      },
      removeOnFail: {
        age: 604800,
      },
    });

    this.logger.log(
      `Added cache refresh job ${job.id} with data: ${JSON.stringify(data)}`,
    );
    return job.id ?? 'unknown';
  }

  /**
   * Get queue statistics
   *
   * @returns Queue stats
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.syncQueue.getWaitingCount(),
      this.syncQueue.getActiveCount(),
      this.syncQueue.getCompletedCount(),
      this.syncQueue.getFailedCount(),
      this.syncQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get recent jobs
   *
   * @param limit Maximum number of jobs to return
   * @returns Recent jobs with status
   */
  async getRecentJobs(limit = 10): Promise<
    Array<{
      id: string;
      name: string;
      state: string;
      progress: number;
      data: unknown;
      createdAt: Date;
      processedAt?: Date;
      finishedAt?: Date;
      failedReason?: string;
    }>
  > {
    const jobs = await this.syncQueue.getJobs(
      ['completed', 'failed', 'active', 'waiting', 'delayed'],
      0,
      limit,
    );

    return jobs.map((job) => ({
      id: job.id ?? 'unknown',
      name: job.name,
      state: job.finishedOn
        ? job.failedReason
          ? 'failed'
          : 'completed'
        : job.processedOn
          ? 'active'
          : 'waiting',
      progress: job.progress as number,
      data: job.data,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
    }));
  }

  /**
   * Trigger manual SINAPI sync for specific UF/month
   *
   * @param uf Target UF (optional, all if not specified)
   * @param mesReferencia Target month (optional, current if not specified)
   * @param force Force re-sync even if already loaded
   * @returns Job ID
   */
  async triggerSinapiSync(
    uf?: string,
    mesReferencia?: string,
    force = false,
  ): Promise<string> {
    return this.addSinapiSyncJob({
      uf,
      mesReferencia: mesReferencia || getCurrentReferenceMonth(),
      tipo: 'ALL',
      force,
    });
  }

  /**
   * Trigger manual SICRO sync for specific UF/month
   *
   * @param uf Target UF (optional, all if not specified)
   * @param mesReferencia Target month (optional, current quarter if not specified)
   * @param force Force re-sync even if already loaded
   * @returns Job ID
   */
  async triggerSicroSync(
    uf?: string,
    mesReferencia?: string,
    force = false,
  ): Promise<string> {
    return this.addSicroSyncJob({
      uf,
      mesReferencia: mesReferencia || getCurrentQuarterReferenceMonth(),
      tipo: 'ALL',
      force,
    });
  }

  /**
   * Trigger manual cache refresh
   *
   * @param cacheType Target cache type (optional, all if not specified)
   * @returns Job ID
   */
  async triggerCacheRefresh(
    cacheType?: 'sinapi' | 'sicro' | 'contracts' | 'all',
  ): Promise<string> {
    return this.addCacheRefreshJob({
      cacheType: cacheType || 'all',
    });
  }
}
