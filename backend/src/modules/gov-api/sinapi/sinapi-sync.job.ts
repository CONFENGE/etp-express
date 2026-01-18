/**
 * SINAPI Sync Job
 *
 * Scheduled job for SINAPI data synchronization via Orcamentador API.
 * Handles:
 * - Daily check for SINAPI updates (cron at 3:00 AM)
 * - Cache warmup with popular terms after invalidation
 * - Cache invalidation when new SINAPI version detected
 *
 * @module modules/gov-api/sinapi
 * @see Issue #1569 for implementation details
 * @see Issue #1539 for SINAPI API integration epic
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SinapiApiClientService } from './sinapi-api-client.service';
import { SinapiService } from './sinapi.service';
import { GovApiCache } from '../utils/gov-api-cache';
import { SinapiUF } from './sinapi.types';

/**
 * Popular search terms for cache warmup
 * These are commonly searched construction materials
 */
const POPULAR_SEARCH_TERMS = [
  'cimento',
  'areia',
  'tijolo',
  'concreto',
  'aço',
  'ferro',
  'madeira',
  'telha',
  'tinta',
  'argamassa',
];

/**
 * Top states for cache warmup (by construction market volume)
 */
const TOP_STATES: SinapiUF[] = ['SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'DF'];

/**
 * Scheduler status for monitoring
 */
export interface SinapiSyncSchedulerStatus {
  enabled: boolean;
  lastRun: Date | null;
  lastUpdate: string | null;
  nextRun: Date | null;
  cronExpression: string;
  status: 'idle' | 'running' | 'error';
  lastError?: string;
  warmupProgress?: {
    current: number;
    total: number;
    lastTerm?: string;
    lastState?: string;
  };
}

/**
 * Cron expression for daily update check (3:00 AM - low traffic period)
 */
const DAILY_CHECK_CRON = '0 3 * * *';

/**
 * SinapiSyncJob - Scheduled job for SINAPI synchronization
 *
 * @example
 * ```typescript
 * // Manually trigger update check
 * await syncJob.checkForUpdates();
 *
 * // Get scheduler status
 * const status = syncJob.getSchedulerStatus();
 * ```
 */
@Injectable()
export class SinapiSyncJob implements OnModuleInit {
  private readonly logger = new Logger(SinapiSyncJob.name);
  private schedulerStatus: SinapiSyncSchedulerStatus = {
    enabled: true,
    lastRun: null,
    lastUpdate: null,
    nextRun: null,
    cronExpression: DAILY_CHECK_CRON,
    status: 'idle',
  };
  private cachedLastUpdate: string | null = null;

  constructor(
    private readonly apiClient: SinapiApiClientService,
    private readonly sinapiService: SinapiService,
    private readonly cache: GovApiCache,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize on module startup
   */
  async onModuleInit(): Promise<void> {
    // Check if scheduler is enabled via config
    const enabled = this.configService.get<boolean>(
      'SINAPI_SYNC_ENABLED',
      true,
    );
    this.schedulerStatus.enabled = enabled;

    // Calculate next run time
    this.updateNextRunTime();

    // Check if warmup on startup is enabled
    const warmupEnabled = this.configService.get<boolean>(
      'SINAPI_CACHE_WARMUP_ENABLED',
      true,
    );

    if (this.apiClient.isConfigured()) {
      this.logger.log(
        `SinapiSyncJob initialized (enabled: ${enabled}, warmup: ${warmupEnabled})`,
      );

      // Fetch initial update info
      try {
        const updateInfo = await this.apiClient.getLastUpdate();
        this.cachedLastUpdate = updateInfo.referencia_disponivel;
        this.schedulerStatus.lastUpdate = updateInfo.referencia_disponivel;
        this.logger.log(
          `Current SINAPI version: ${updateInfo.referencia_disponivel}`,
        );

        // Warmup cache on startup if enabled
        if (warmupEnabled) {
          // Run warmup asynchronously to not block startup
          setImmediate(() => {
            this.warmupCache().catch((error) => {
              this.logger.warn(
                `Initial cache warmup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            });
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch initial SINAPI update info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } else {
      this.logger.warn('SINAPI API not configured - sync job will be inactive');
      this.schedulerStatus.enabled = false;
    }
  }

  /**
   * Daily check for SINAPI updates
   * Executes at 3:00 AM (configured via DAILY_CHECK_CRON)
   */
  @Cron(DAILY_CHECK_CRON)
  async checkForUpdates(): Promise<void> {
    if (!this.schedulerStatus.enabled || !this.apiClient.isConfigured()) {
      this.logger.debug(
        'SINAPI sync check skipped (disabled or not configured)',
      );
      return;
    }

    this.logger.log('Starting SINAPI update check...');
    this.schedulerStatus.status = 'running';
    this.schedulerStatus.lastRun = new Date();

    try {
      // Get latest update info from API
      const updateInfo = await this.apiClient.getLastUpdate();
      const newVersion = updateInfo.referencia_disponivel;

      // Compare with cached version
      if (newVersion !== this.cachedLastUpdate) {
        this.logger.log(
          `SINAPI updated: ${this.cachedLastUpdate} -> ${newVersion}. Invalidating cache...`,
        );

        // Invalidate cache
        await this.invalidateCache();

        // Update cached version
        this.cachedLastUpdate = newVersion;
        this.schedulerStatus.lastUpdate = newVersion;

        // Reset API failure state in service
        this.sinapiService.resetApiFailure();

        // Warmup cache with fresh data
        await this.warmupCache();

        this.logger.log('SINAPI cache invalidated and warmed up successfully');
      } else {
        this.logger.log(`SINAPI version unchanged (${newVersion})`);
      }

      this.schedulerStatus.status = 'idle';
      this.schedulerStatus.lastError = undefined;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SINAPI update check failed: ${errorMessage}`);
      this.schedulerStatus.status = 'error';
      this.schedulerStatus.lastError = errorMessage;
    }

    // Update next run time
    this.updateNextRunTime();
  }

  /**
   * Pre-populate cache with popular search terms
   * Called after cache invalidation or on startup
   */
  async warmupCache(): Promise<void> {
    if (!this.apiClient.isConfigured()) {
      return;
    }

    const totalOperations = POPULAR_SEARCH_TERMS.length * TOP_STATES.length;
    let completedOperations = 0;

    this.logger.log(
      `Starting cache warmup with ${POPULAR_SEARCH_TERMS.length} terms x ${TOP_STATES.length} states...`,
    );

    this.schedulerStatus.warmupProgress = {
      current: 0,
      total: totalOperations,
    };

    for (const termo of POPULAR_SEARCH_TERMS) {
      for (const estado of TOP_STATES) {
        try {
          // Use SinapiService.search to populate cache
          await this.sinapiService.search(termo, { uf: estado });
          completedOperations++;
          this.schedulerStatus.warmupProgress = {
            current: completedOperations,
            total: totalOperations,
            lastTerm: termo,
            lastState: estado,
          };
        } catch (error) {
          this.logger.debug(
            `Cache warmup failed for ${termo}/${estado}: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
        }

        // Small delay to avoid rate limiting
        await this.sleep(100);
      }
    }

    this.logger.log(
      `Cache warmup completed: ${completedOperations}/${totalOperations} successful`,
    );
    this.schedulerStatus.warmupProgress = undefined;
  }

  /**
   * Invalidate all SINAPI cache entries
   */
  async invalidateCache(): Promise<void> {
    await this.cache.invalidateSource('sinapi');
    this.logger.log('SINAPI cache invalidated');
  }

  /**
   * Get scheduler status for monitoring
   */
  getSchedulerStatus(): SinapiSyncSchedulerStatus {
    return { ...this.schedulerStatus };
  }

  /**
   * Enable or disable the scheduler
   */
  setEnabled(enabled: boolean): void {
    this.schedulerStatus.enabled = enabled;
    this.logger.log(
      `SINAPI sync scheduler ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Manually trigger update check (for testing/admin)
   */
  async triggerManualCheck(): Promise<void> {
    this.logger.log('Manual SINAPI update check triggered');
    await this.checkForUpdates();
  }

  /**
   * Get cached last update version
   */
  getLastUpdate(): string | null {
    return this.cachedLastUpdate;
  }

  /**
   * Update next run time based on cron expression
   */
  private updateNextRunTime(): void {
    // Calculate approximate next run (3 AM next day)
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(3, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    this.schedulerStatus.nextRun = nextRun;
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
