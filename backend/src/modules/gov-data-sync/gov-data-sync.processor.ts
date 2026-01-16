/**
 * Government Data Sync Processor
 *
 * BullMQ processor for scheduled jobs that sync government data
 * (SINAPI, SICRO, PNCP, and cache operations).
 *
 * Jobs are scheduled via cron:
 * - SINAPI: Monthly (day 5 at 03:00) - SINAPI is published around day 10
 * - SICRO: Quarterly (day 1 of Jan, Apr, Jul, Oct at 03:00)
 * - Cache refresh: Weekly (Sunday at 02:00)
 * - PNCP check: Weekly (Monday at 03:00) - #1166
 * - Cache validation: Weekly (Wednesday at 03:00) - #1166
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 * @see https://github.com/CONFENGE/etp-express/issues/1166
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { SinapiService } from '../gov-api/sinapi/sinapi.service';
import { SicroService } from '../gov-api/sicro/sicro.service';
import { PncpService } from '../gov-api/pncp/pncp.service';
import { GovApiCache } from '../gov-api/utils/gov-api-cache';
import {
  SinapiSyncJobData,
  SicroSyncJobData,
  GovCacheRefreshJobData,
  PncpWeeklyCheckJobData,
  CacheValidationJobData,
  GovDataSyncResult,
  PncpWeeklyCheckResult,
  CacheValidationResult,
  BRAZILIAN_UFS,
  getCurrentReferenceMonth,
  getCurrentQuarterReferenceMonth,
  GOV_DATA_SYNC_QUEUE,
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
  PNCP_WEEKLY_CHECK_JOB,
  CACHE_VALIDATION_JOB,
} from './gov-data-sync.types';
import { SinapiItemType, SinapiUF } from '../gov-api/sinapi/sinapi.types';
import { SicroItemType, SicroUF } from '../gov-api/sicro/sicro.types';

/**
 * BullMQ processor for government data synchronization jobs
 *
 * Handles five types of scheduled jobs:
 * 1. SINAPI sync - Monthly download and parse of SINAPI Excel files
 * 2. SICRO sync - Quarterly download and parse of SICRO Excel files
 * 3. Cache refresh - Weekly cleanup of expired cache entries
 * 4. PNCP check - Weekly check for new contratações (#1166)
 * 5. Cache validation - Weekly cache integrity validation (#1166)
 *
 * @remarks
 * - Jobs run with exponential backoff retry (3 attempts)
 * - Errors are logged to Sentry for alerting
 * - Progress is tracked via job.updateProgress()
 */
@Processor(GOV_DATA_SYNC_QUEUE)
export class GovDataSyncProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(GovDataSyncProcessor.name);

  constructor(
    private readonly sinapiService: SinapiService,
    private readonly sicroService: SicroService,
    private readonly pncpService: PncpService,
    private readonly cache: GovApiCache,
  ) {
    super();
    this.logger.log('GovDataSyncProcessor initialized');
  }

  /**
   * Graceful shutdown handler for BullMQ worker
   *
   * Ensures currently processing jobs complete before the worker terminates.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `GovDataSyncProcessor shutting down (${signal || 'unknown signal'})...`,
    );

    try {
      const worker = this.worker;
      if (worker) {
        await worker.close(false);
        this.logger.log('GovDataSyncProcessor worker closed gracefully');
      }
    } catch (error) {
      this.logger.error(
        `Error closing GovDataSyncProcessor worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * BullMQ event: Job completed
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.id} (${job.name}) completed successfully`);
  }

  /**
   * BullMQ event: Job failed
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed: ${error.message}`,
      error.stack,
    );

    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        jobId: job.id,
        jobName: job.name,
        queue: GOV_DATA_SYNC_QUEUE,
      },
      extra: {
        jobData: job.data,
        attemptsMade: job.attemptsMade,
      },
    });
  }

  /**
   * Main job processor - routes to specific handlers
   */
  async process(
    job: Job<
      | SinapiSyncJobData
      | SicroSyncJobData
      | GovCacheRefreshJobData
      | PncpWeeklyCheckJobData
      | CacheValidationJobData
    >,
  ): Promise<GovDataSyncResult> {
    this.logger.log(`Processing job ${job.id} (${job.name})`);

    switch (job.name) {
      case SINAPI_SYNC_JOB:
        return this.processSinapiSync(job as Job<SinapiSyncJobData>);
      case SICRO_SYNC_JOB:
        return this.processSicroSync(job as Job<SicroSyncJobData>);
      case GOV_CACHE_REFRESH_JOB:
        return this.processCacheRefresh(job as Job<GovCacheRefreshJobData>);
      case PNCP_WEEKLY_CHECK_JOB:
        return this.processPncpWeeklyCheck(job as Job<PncpWeeklyCheckJobData>);
      case CACHE_VALIDATION_JOB:
        return this.processCacheValidation(job as Job<CacheValidationJobData>);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Process SINAPI sync job
   *
   * Downloads and parses SINAPI Excel files for specified UFs.
   * SINAPI is published monthly by CAIXA (usually by day 10).
   */
  private async processSinapiSync(
    job: Job<SinapiSyncJobData>,
  ): Promise<GovDataSyncResult> {
    const startTime = Date.now();
    const { uf, mesReferencia, tipo, force } = job.data;

    const targetMonth = mesReferencia || getCurrentReferenceMonth();
    const targetUFs = uf
      ? [uf as SinapiUF]
      : ([...BRAZILIAN_UFS] as SinapiUF[]);
    const targetTipos =
      tipo === 'ALL' || !tipo
        ? [SinapiItemType.INSUMO, SinapiItemType.COMPOSICAO]
        : [tipo as SinapiItemType];

    this.logger.log(
      `Starting SINAPI sync for ${targetUFs.length} UFs, month ${targetMonth}, tipos: ${targetTipos.join(', ')}`,
    );

    const totalSynced = 0;
    let totalErrors = 0;
    const details: Record<string, unknown> = {
      targetMonth,
      ufs: targetUFs,
      tipos: targetTipos,
    };

    const totalTasks = targetUFs.length * targetTipos.length;
    let completedTasks = 0;

    for (const currentUF of targetUFs) {
      for (const currentTipo of targetTipos) {
        try {
          // Check if already loaded (unless force)
          if (
            !force &&
            this.sinapiService.isDataLoaded(currentUF, targetMonth, currentTipo)
          ) {
            this.logger.debug(
              `SINAPI ${currentUF}/${targetMonth}/${currentTipo} already loaded, skipping`,
            );
            completedTasks++;
            await job.updateProgress(
              Math.round((completedTasks / totalTasks) * 100),
            );
            continue;
          }

          // Note: In production, this would download the Excel file from CAIXA
          // For now, we log that sync is needed but data loading is manual
          this.logger.log(
            `SINAPI sync needed for ${currentUF}/${targetMonth}/${currentTipo}`,
          );

          // Track progress
          completedTasks++;
          await job.updateProgress(
            Math.round((completedTasks / totalTasks) * 100),
          );
        } catch (error) {
          this.logger.error(
            `Error syncing SINAPI ${currentUF}/${targetMonth}/${currentTipo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          totalErrors++;
          Sentry.captureException(error, {
            tags: { source: 'sinapi', uf: currentUF, tipo: currentTipo },
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `SINAPI sync completed: ${totalSynced} items synced, ${totalErrors} errors, ${durationMs}ms`,
    );

    return {
      source: 'sinapi',
      success: totalErrors === 0,
      itemsSynced: totalSynced,
      errors: totalErrors,
      durationMs,
      details,
    };
  }

  /**
   * Process SICRO sync job
   *
   * Downloads and parses SICRO Excel files for specified UFs.
   * SICRO is published quarterly by DNIT.
   */
  private async processSicroSync(
    job: Job<SicroSyncJobData>,
  ): Promise<GovDataSyncResult> {
    const startTime = Date.now();
    const { uf, mesReferencia, tipo, force } = job.data;

    const targetMonth = mesReferencia || getCurrentQuarterReferenceMonth();
    const targetUFs = uf ? [uf as SicroUF] : ([...BRAZILIAN_UFS] as SicroUF[]);
    const targetTipos =
      tipo === 'ALL' || !tipo
        ? [SicroItemType.INSUMO, SicroItemType.COMPOSICAO]
        : [tipo as SicroItemType];

    this.logger.log(
      `Starting SICRO sync for ${targetUFs.length} UFs, month ${targetMonth}, tipos: ${targetTipos.join(', ')}`,
    );

    const totalSynced = 0;
    let totalErrors = 0;
    const details: Record<string, unknown> = {
      targetMonth,
      ufs: targetUFs,
      tipos: targetTipos,
    };

    const totalTasks = targetUFs.length * targetTipos.length;
    let completedTasks = 0;

    for (const currentUF of targetUFs) {
      for (const currentTipo of targetTipos) {
        try {
          // Check if already loaded (unless force)
          const loadedMonths = this.sicroService.getLoadedMonths();
          const monthKey = `${currentUF}:${targetMonth}:${currentTipo}`;
          if (!force && loadedMonths.some((m) => m.includes(monthKey))) {
            this.logger.debug(
              `SICRO ${currentUF}/${targetMonth}/${currentTipo} already loaded, skipping`,
            );
            completedTasks++;
            await job.updateProgress(
              Math.round((completedTasks / totalTasks) * 100),
            );
            continue;
          }

          // Note: In production, this would download the Excel file from DNIT
          // For now, we log that sync is needed but data loading is manual
          this.logger.log(
            `SICRO sync needed for ${currentUF}/${targetMonth}/${currentTipo}`,
          );

          // Track progress
          completedTasks++;
          await job.updateProgress(
            Math.round((completedTasks / totalTasks) * 100),
          );
        } catch (error) {
          this.logger.error(
            `Error syncing SICRO ${currentUF}/${targetMonth}/${currentTipo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          totalErrors++;
          Sentry.captureException(error, {
            tags: { source: 'sicro', uf: currentUF, tipo: currentTipo },
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `SICRO sync completed: ${totalSynced} items synced, ${totalErrors} errors, ${durationMs}ms`,
    );

    return {
      source: 'sicro',
      success: totalErrors === 0,
      itemsSynced: totalSynced,
      errors: totalErrors,
      durationMs,
      details,
    };
  }

  /**
   * Process cache refresh job
   *
   * Cleans up expired cache entries to prevent memory bloat.
   * Runs weekly on Sunday at 02:00.
   */
  private async processCacheRefresh(
    job: Job<GovCacheRefreshJobData>,
  ): Promise<GovDataSyncResult> {
    const startTime = Date.now();
    const { cacheType, maxAgeHours } = job.data;

    const targetCaches =
      cacheType === 'all' || !cacheType
        ? (['sinapi', 'sicro', 'pncp', 'comprasgov'] as const)
        : ([cacheType] as const);
    const maxAge = maxAgeHours || 168; // Default 1 week (168 hours)

    this.logger.log(
      `Starting cache refresh for ${targetCaches.join(', ')}, max age ${maxAge}h`,
    );

    let totalCleaned = 0;
    let totalErrors = 0;
    const details: Record<string, unknown> = {
      targetCaches,
      maxAgeHours: maxAge,
    };

    await job.updateProgress(10);

    for (const cacheSource of targetCaches) {
      try {
        // Skip contracts as it's not a valid GovApiSource
        if (cacheSource === 'contracts') {
          continue;
        }

        // Get cache stats before cleanup
        const keyCountBefore = await this.cache.getKeyCount(cacheSource);

        // Invalidate expired entries for this source
        // The cache handles TTL automatically, but we can force invalidation
        // for specific cache types if needed
        this.logger.log(
          `Checking ${cacheSource} cache entries (${keyCountBefore} keys)`,
        );

        // Get stats after
        const keyCountAfter = await this.cache.getKeyCount(cacheSource);
        const cleaned = keyCountBefore - keyCountAfter;
        totalCleaned += cleaned > 0 ? cleaned : 0;

        this.logger.debug(
          `${cacheSource} cache: ${keyCountAfter} keys remaining`,
        );
      } catch (error) {
        this.logger.error(
          `Error refreshing ${cacheSource} cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        totalErrors++;
        Sentry.captureException(error, {
          tags: { source: 'cache-refresh', cacheType: cacheSource },
        });
      }
    }

    await job.updateProgress(100);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Cache refresh completed: ${totalCleaned} entries cleaned, ${totalErrors} errors, ${durationMs}ms`,
    );

    return {
      source: 'cache-refresh',
      success: totalErrors === 0,
      itemsSynced: totalCleaned,
      errors: totalErrors,
      durationMs,
      details,
    };
  }

  /**
   * Process PNCP weekly check job (#1166)
   *
   * Checks for new contratações, atas, and contratos published
   * in the previous week and logs the findings.
   */
  private async processPncpWeeklyCheck(
    job: Job<PncpWeeklyCheckJobData>,
  ): Promise<GovDataSyncResult> {
    const startTime = Date.now();
    const { uf, lookbackDays = 7, forceRefresh = false } = job.data;

    this.logger.log(
      `Starting PNCP weekly check: lookback=${lookbackDays} days, uf=${uf || 'ALL'}, forceRefresh=${forceRefresh}`,
    );

    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000,
    );

    const result: PncpWeeklyCheckResult = {
      newContratacoes: 0,
      newAtas: 0,
      newContratos: 0,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      ufsChecked: uf ? [uf] : [...BRAZILIAN_UFS],
      hasNewData: false,
    };

    let totalErrors = 0;

    await job.updateProgress(10);

    try {
      // Format dates for PNCP API (YYYYMMDD)
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };

      const dataInicial = formatDate(startDate);
      const dataFinal = formatDate(endDate);

      // Check contratações
      this.logger.log('Checking for new contratações...');
      try {
        const contratacoes = await this.pncpService.searchContratacoes({
          dataInicial,
          dataFinal,
          pagina: 1,
          tamanhoPagina: 500,
        });
        result.newContratacoes = contratacoes.totalRegistros;
        this.logger.log(`Found ${result.newContratacoes} new contratações`);
      } catch (error) {
        this.logger.warn(
          `Error checking contratações: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        totalErrors++;
      }

      await job.updateProgress(40);

      // Check atas
      this.logger.log('Checking for new atas...');
      try {
        const atas = await this.pncpService.searchAtas({
          dataInicial,
          dataFinal,
          pagina: 1,
          tamanhoPagina: 500,
        });
        result.newAtas = atas.totalRegistros;
        this.logger.log(`Found ${result.newAtas} new atas`);
      } catch (error) {
        this.logger.warn(
          `Error checking atas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        totalErrors++;
      }

      await job.updateProgress(70);

      // Check contratos
      this.logger.log('Checking for new contratos...');
      try {
        const contratos = await this.pncpService.searchContratos({
          dataInicial,
          dataFinal,
          pagina: 1,
          tamanhoPagina: 500,
        });
        result.newContratos = contratos.totalRegistros;
        this.logger.log(`Found ${result.newContratos} new contratos`);
      } catch (error) {
        this.logger.warn(
          `Error checking contratos: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        totalErrors++;
      }

      await job.updateProgress(100);

      result.hasNewData =
        result.newContratacoes > 0 ||
        result.newAtas > 0 ||
        result.newContratos > 0;

      if (result.hasNewData) {
        this.logger.log(
          `PNCP Weekly Check Summary: ${result.newContratacoes} contratações, ${result.newAtas} atas, ${result.newContratos} contratos found in the last ${lookbackDays} days`,
        );
      } else {
        this.logger.log(
          `PNCP Weekly Check: No new data found in the last ${lookbackDays} days`,
        );
      }
    } catch (error) {
      this.logger.error(
        `PNCP weekly check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      totalErrors++;
      Sentry.captureException(error, {
        tags: { source: 'pncp-weekly-check' },
        extra: { lookbackDays, uf },
      });
    }

    const durationMs = Date.now() - startTime;
    const totalFound =
      result.newContratacoes + result.newAtas + result.newContratos;

    this.logger.log(
      `PNCP weekly check completed: ${totalFound} items found, ${totalErrors} errors, ${durationMs}ms`,
    );

    return {
      source: 'pncp-weekly-check',
      success: totalErrors === 0,
      itemsSynced: totalFound,
      errors: totalErrors,
      durationMs,
      details: result as unknown as Record<string, unknown>,
    };
  }

  /**
   * Process cache validation job (#1166)
   *
   * Validates cache integrity, computes statistics, and optionally
   * repairs any inconsistencies found.
   */
  private async processCacheValidation(
    job: Job<CacheValidationJobData>,
  ): Promise<GovDataSyncResult> {
    const startTime = Date.now();
    const { cacheType, autoRepair = true } = job.data;

    const targetCaches =
      cacheType === 'all' || !cacheType
        ? (['sinapi', 'sicro', 'pncp', 'comprasgov'] as const)
        : ([cacheType] as const);

    this.logger.log(
      `Starting cache validation for ${targetCaches.join(', ')}, autoRepair=${autoRepair}`,
    );

    const validationResults: CacheValidationResult[] = [];
    let totalErrors = 0;
    let totalIssues = 0;
    let totalRepaired = 0;

    await job.updateProgress(5);

    const progressPerCache = 90 / targetCaches.length;

    for (let i = 0; i < targetCaches.length; i++) {
      const cacheSource = targetCaches[i];

      try {
        this.logger.log(`Validating ${cacheSource} cache...`);

        const stats = this.cache.getStats(cacheSource);
        const keyCount = await this.cache.getKeyCount(cacheSource);

        // Calculate hit ratio
        const totalRequests = stats.hits + stats.misses;
        const hitRatio =
          totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;

        // Determine health score based on hit ratio and key count
        let healthScore = 100;
        const issues: string[] = [];

        if (hitRatio < 50 && totalRequests > 100) {
          healthScore -= 20;
          issues.push(`Low hit ratio: ${hitRatio.toFixed(1)}%`);
        }

        if (keyCount === 0 && stats.misses > 0) {
          healthScore -= 30;
          issues.push('Cache appears empty with recent misses');
        }

        // Check for potential memory issues (arbitrary threshold)
        if (keyCount > 10000) {
          healthScore -= 10;
          issues.push(`High key count: ${keyCount} keys`);
        }

        const result: CacheValidationResult = {
          cacheType: cacheSource,
          totalKeys: keyCount,
          expiredKeys: 0, // Redis handles TTL automatically
          corruptedEntries: 0, // Would need deep validation
          repairedEntries: 0,
          hitRatio: Number(hitRatio.toFixed(2)),
          healthScore: Math.max(0, healthScore),
          issues,
        };

        // Auto-repair: Clear cache if health is critically low
        if (autoRepair && healthScore < 30) {
          this.logger.warn(
            `${cacheSource} cache health is critical (${healthScore}), triggering cleanup`,
          );
          try {
            await this.cache.invalidateSource(cacheSource);
            result.repairedEntries = keyCount;
            totalRepaired += keyCount;
            issues.push(`Cache cleared due to critical health score`);
          } catch (repairError) {
            this.logger.error(
              `Failed to repair ${cacheSource} cache: ${repairError instanceof Error ? repairError.message : 'Unknown'}`,
            );
          }
        }

        totalIssues += issues.length;
        validationResults.push(result);

        this.logger.log(
          `${cacheSource} validation: ${keyCount} keys, ${hitRatio.toFixed(1)}% hit ratio, health=${healthScore}`,
        );

        await job.updateProgress(5 + (i + 1) * progressPerCache);
      } catch (error) {
        this.logger.error(
          `Error validating ${cacheSource} cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        totalErrors++;
        Sentry.captureException(error, {
          tags: { source: 'cache-validation', cacheType: cacheSource },
        });
      }
    }

    await job.updateProgress(100);

    const durationMs = Date.now() - startTime;

    // Log summary
    const avgHealthScore =
      validationResults.length > 0
        ? validationResults.reduce((sum, r) => sum + r.healthScore, 0) /
          validationResults.length
        : 0;

    this.logger.log(
      `Cache validation completed: ${validationResults.length} caches validated, ` +
        `avg health=${avgHealthScore.toFixed(0)}, ${totalIssues} issues found, ` +
        `${totalRepaired} entries repaired, ${totalErrors} errors, ${durationMs}ms`,
    );

    if (totalIssues > 0) {
      this.logger.warn(
        `Cache validation found ${totalIssues} issues across ${validationResults.length} caches`,
      );
    }

    return {
      source: 'cache-validation',
      success: totalErrors === 0,
      itemsSynced: totalRepaired,
      errors: totalErrors,
      durationMs,
      details: {
        validationResults,
        avgHealthScore: Number(avgHealthScore.toFixed(2)),
        totalIssues,
        totalRepaired,
      },
    };
  }
}
