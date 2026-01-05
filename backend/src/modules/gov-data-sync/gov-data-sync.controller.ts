/**
 * Government Data Sync Controller
 *
 * REST API endpoints for monitoring and managing government data synchronization.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/1062
 */

import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { GovDataSyncService, GovDataStatus } from './gov-data-sync.service';
import { SinapiDataStatus } from '../gov-api/sinapi/sinapi.service';
import { SicroDataStatus } from '../gov-api/sicro/sicro.service';

/**
 * Controller for government data sync status endpoints
 *
 * Provides endpoints to check the status of SINAPI/SICRO data loading,
 * helping users understand if price searches will return data.
 *
 * @example
 * ```bash
 * # Get combined status
 * curl http://localhost:3001/gov-api/status
 *
 * # Get SINAPI-specific status
 * curl http://localhost:3001/gov-api/sinapi/status
 *
 * # Get SICRO-specific status
 * curl http://localhost:3001/gov-api/sicro/status
 * ```
 */
@Controller('gov-api')
export class GovDataSyncController {
  private readonly logger = new Logger(GovDataSyncController.name);

  constructor(private readonly syncService: GovDataSyncService) {}

  /**
   * Get combined status of all government data sources
   *
   * Returns detailed status of SINAPI and SICRO data loading,
   * including item counts, loaded months, and last update times.
   *
   * @returns Combined data status for all sources
   */
  @Get('status')
  @Public()
  @HttpCode(HttpStatus.OK)
  getStatus(): GovDataStatus {
    this.logger.debug('Fetching combined gov data status');
    return this.syncService.getDataStatus();
  }

  /**
   * Get SINAPI data status
   *
   * Returns detailed status of SINAPI data loading.
   *
   * @returns SINAPI data status
   */
  @Get('sinapi/status')
  @Public()
  @HttpCode(HttpStatus.OK)
  getSinapiStatus(): SinapiDataStatus {
    this.logger.debug('Fetching SINAPI data status');
    return this.syncService.getSinapiStatus();
  }

  /**
   * Get SICRO data status
   *
   * Returns detailed status of SICRO data loading.
   *
   * @returns SICRO data status
   */
  @Get('sicro/status')
  @Public()
  @HttpCode(HttpStatus.OK)
  getSicroStatus(): SicroDataStatus {
    this.logger.debug('Fetching SICRO data status');
    return this.syncService.getSicroStatus();
  }

  /**
   * Get sync queue statistics
   *
   * Returns statistics about pending, active, completed, and failed sync jobs.
   *
   * @returns Queue statistics
   */
  @Get('sync/queue')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    this.logger.debug('Fetching sync queue statistics');
    return this.syncService.getQueueStats();
  }
}
