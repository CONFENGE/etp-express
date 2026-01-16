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
  PncpWeeklyCheckJobData,
  CacheValidationJobData,
  GOV_DATA_SYNC_QUEUE,
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
  PNCP_WEEKLY_CHECK_JOB,
  CACHE_VALIDATION_JOB,
  getCurrentReferenceMonth,
  getCurrentQuarterReferenceMonth,
} from './gov-data-sync.types';
import {
  SinapiService,
  SinapiDataStatus,
} from '../gov-api/sinapi/sinapi.service';
import { SicroService, SicroDataStatus } from '../gov-api/sicro/sicro.service';

/**
 * Combined data status for all gov data sources
 */
export interface GovDataStatus {
  sinapi: SinapiDataStatus;
  sicro: SicroDataStatus;
  allDataLoaded: boolean;
  summary: string;
}

/**
 * Service for managing government data sync jobs
 *
 * Schedules and triggers BullMQ jobs for:
 * - SINAPI monthly sync (day 5 at 03:00)
 * - SICRO quarterly sync (day 1 of quarter months at 03:00)
 * - Cache refresh weekly (Sunday at 02:00)
 * - PNCP weekly check (Monday at 03:00) - #1166
 * - Cache validation (Wednesday at 03:00) - #1166
 */
@Injectable()
export class GovDataSyncService implements OnModuleInit {
  private readonly logger = new Logger(GovDataSyncService.name);

  constructor(
    @InjectQueue(GOV_DATA_SYNC_QUEUE)
    private readonly syncQueue: Queue,
    private readonly sinapiService: SinapiService,
    private readonly sicroService: SicroService,
  ) {}

  /**
   * Initialize service and trigger startup sync (#1062)
   *
   * Automatically triggers SINAPI/SICRO sync on startup to ensure
   * data is available when users make searches. This prevents the
   * scenario where searches return empty arrays because no one
   * manually loaded the data.
   *
   * Note: Startup sync runs async to prevent blocking app initialization (#1517)
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('GovDataSyncService initialized');
    this.logger.log('Scheduled jobs:');
    this.logger.log(' - SINAPI: Monthly on day 5 at 03:00 BRT');
    this.logger.log(
      ' - SICRO: Quarterly on day 1 at 03:00 BRT (Jan, Apr, Jul, Oct)',
    );
    this.logger.log(' - Cache refresh: Weekly on Sunday at 02:00 BRT');
    this.logger.log(' - PNCP check: Weekly on Monday at 03:00 BRT (#1166)');
    this.logger.log(
      ' - Cache validation: Weekly on Wednesday at 03:00 BRT (#1166)',
    );

    // Trigger startup sync asynchronously to prevent blocking app initialization (#1517)
    // Don't await - let the sync run in background while app continues starting
    this.triggerStartupSyncAsync();
  }

  /**
   * Async wrapper for startup sync to prevent blocking initialization (#1517)
   *
   * Delays the startup sync slightly and runs it in background to ensure
   * the application can start serving requests even if Redis is slow or unavailable.
   */
  private triggerStartupSyncAsync(): void {
    // Delay startup sync by 5 seconds to let the app fully initialize
    setTimeout(() => {
      this.triggerStartupSync().catch((error) => {
        this.logger.warn(
          `Startup sync failed (non-blocking): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      });
    }, 5000);
  }

  /**
   * Trigger startup sync for SINAPI and SICRO (#1062)
   *
   * Adds sync jobs to the queue on application startup.
   * Jobs are queued with a small delay to avoid overloading the system
   * during startup.
   *
   * Note: Uses timeout to prevent blocking if Redis is unavailable (#1517)
   */
  private async triggerStartupSync(): Promise<void> {
    this.logger.log('Triggering startup sync for SINAPI and SICRO...');

    // Timeout for queue operations to prevent infinite blocking (#1517)
    const QUEUE_TIMEOUT_MS = 10000; // 10 seconds

    const withTimeout = <T>(
      promise: Promise<T>,
      timeoutMs: number,
      operation: string,
    ): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
    };

    try {
      // Queue SINAPI sync with timeout
      const sinapiJobId = await withTimeout(
        this.addSinapiSyncJob({
          mesReferencia: getCurrentReferenceMonth(),
          tipo: 'ALL',
          force: false, // Don't re-sync if already loaded
        }),
        QUEUE_TIMEOUT_MS,
        'SINAPI sync job queue',
      );
      this.logger.log(`Startup SINAPI sync job queued: ${sinapiJobId}`);

      // Queue SICRO sync with timeout
      const sicroJobId = await withTimeout(
        this.addSicroSyncJob({
          mesReferencia: getCurrentQuarterReferenceMonth(),
          tipo: 'ALL',
          force: false,
        }),
        QUEUE_TIMEOUT_MS,
        'SICRO sync job queue',
      );
      this.logger.log(`Startup SICRO sync job queued: ${sicroJobId}`);

      this.logger.log('Startup sync jobs queued successfully');
    } catch (error) {
      // Don't fail startup if sync queueing fails
      // The scheduled cron jobs will eventually sync the data
      this.logger.warn(
        `Startup sync queueing failed (will retry on scheduled cron): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
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
   * Weekly PNCP check - runs on Monday at 03:00 (#1166)
   *
   * Checks for new contratações, atas, and contratos published
   * in the previous week. Alerts if new data is available.
   */
  @Cron('0 3 * * 1', {
    name: 'pncp-weekly-check',
    timeZone: 'America/Sao_Paulo',
  })
  async schedulePncpWeeklyCheck(): Promise<void> {
    this.logger.log('Scheduled PNCP weekly check triggered');
    await this.addPncpWeeklyCheckJob({
      lookbackDays: 7,
      forceRefresh: false,
    });
  }

  /**
   * Weekly cache validation - runs on Wednesday at 03:00 (#1166)
   *
   * Validates cache integrity, reports statistics, and repairs
   * any inconsistencies found.
   */
  @Cron('0 3 * * 3', {
    name: 'cache-validation-weekly',
    timeZone: 'America/Sao_Paulo',
  })
  async scheduleCacheValidation(): Promise<void> {
    this.logger.log('Scheduled cache validation triggered');
    await this.addCacheValidationJob({
      cacheType: 'all',
      autoRepair: true,
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
   * Add a PNCP weekly check job to the queue (#1166)
   *
   * @param data Job data
   * @returns Job ID
   */
  async addPncpWeeklyCheckJob(
    data: PncpWeeklyCheckJobData = {},
  ): Promise<string> {
    const job = await this.syncQueue.add(PNCP_WEEKLY_CHECK_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute initial delay
      },
      removeOnComplete: {
        age: 86400 * 7, // Keep for 7 days for analysis
        count: 50,
      },
      removeOnFail: {
        age: 604800,
      },
    });

    this.logger.log(
      `Added PNCP weekly check job ${job.id} with data: ${JSON.stringify(data)}`,
    );
    return job.id ?? 'unknown';
  }

  /**
   * Add a cache validation job to the queue (#1166)
   *
   * @param data Job data
   * @returns Job ID
   */
  async addCacheValidationJob(
    data: CacheValidationJobData = {},
  ): Promise<string> {
    const job = await this.syncQueue.add(CACHE_VALIDATION_JOB, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
      removeOnComplete: {
        age: 86400 * 7, // Keep for 7 days for analysis
        count: 30,
      },
      removeOnFail: {
        age: 604800,
      },
    });

    this.logger.log(
      `Added cache validation job ${job.id} with data: ${JSON.stringify(data)}`,
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

  /**
   * Trigger manual PNCP weekly check (#1166)
   *
   * @param uf Target UF (optional, checks all if not specified)
   * @param lookbackDays Number of days to look back (default: 7)
   * @param forceRefresh Force refresh even if recent data exists
   * @returns Job ID
   */
  async triggerPncpWeeklyCheck(
    uf?: string,
    lookbackDays = 7,
    forceRefresh = false,
  ): Promise<string> {
    return this.addPncpWeeklyCheckJob({
      uf,
      lookbackDays,
      forceRefresh,
    });
  }

  /**
   * Trigger manual cache validation (#1166)
   *
   * @param cacheType Target cache type (optional, validates all if not specified)
   * @param autoRepair Whether to automatically repair inconsistencies
   * @returns Job ID
   */
  async triggerCacheValidation(
    cacheType?: 'sinapi' | 'sicro' | 'pncp' | 'comprasgov' | 'all',
    autoRepair = true,
  ): Promise<string> {
    return this.addCacheValidationJob({
      cacheType: cacheType || 'all',
      autoRepair,
    });
  }

  /**
   * Get combined data status for SINAPI and SICRO (#1062)
   *
   * Returns comprehensive status of all gov data sources,
   * useful for monitoring and debugging.
   *
   * @returns Combined data status
   */
  getDataStatus(): GovDataStatus {
    const sinapiStatus = this.sinapiService.getDataStatus();
    const sicroStatus = this.sicroService.getDataStatus();

    const allDataLoaded = sinapiStatus.dataLoaded && sicroStatus.dataLoaded;

    let summary: string;
    if (allDataLoaded) {
      summary = `All data loaded: SINAPI (${sinapiStatus.itemCount} items), SICRO (${sicroStatus.itemCount} items)`;
    } else if (!sinapiStatus.dataLoaded && !sicroStatus.dataLoaded) {
      summary =
        'No data loaded. Sync jobs may be pending or failed. Check queue status.';
    } else {
      const loaded: string[] = [];
      const notLoaded: string[] = [];

      if (sinapiStatus.dataLoaded) {
        loaded.push(`SINAPI (${sinapiStatus.itemCount} items)`);
      } else {
        notLoaded.push('SINAPI');
      }

      if (sicroStatus.dataLoaded) {
        loaded.push(`SICRO (${sicroStatus.itemCount} items)`);
      } else {
        notLoaded.push('SICRO');
      }

      summary = `Partial data: ${loaded.join(', ')} loaded. Missing: ${notLoaded.join(', ')}`;
    }

    return {
      sinapi: sinapiStatus,
      sicro: sicroStatus,
      allDataLoaded,
      summary,
    };
  }

  /**
   * Get SINAPI data status (#1062)
   *
   * @returns SINAPI data status
   */
  getSinapiStatus(): SinapiDataStatus {
    return this.sinapiService.getDataStatus();
  }

  /**
   * Get SICRO data status (#1062)
   *
   * @returns SICRO data status
   */
  getSicroStatus(): SicroDataStatus {
    return this.sicroService.getDataStatus();
  }
}
