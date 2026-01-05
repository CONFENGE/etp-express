/**
 * Government Data Sync Module
 *
 * NestJS module for scheduled government data synchronization jobs.
 * Provides BullMQ-based background jobs for syncing SINAPI, SICRO,
 * and refreshing gov API cache.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { GovDataSyncService } from './gov-data-sync.service';
import { GovDataSyncProcessor } from './gov-data-sync.processor';
import { GovDataSyncController } from './gov-data-sync.controller';
import { SinapiModule } from '../gov-api/sinapi/sinapi.module';
import { SicroModule } from '../gov-api/sicro/sicro.module';
import { GovApiModule } from '../gov-api/gov-api.module';
import { GOV_DATA_SYNC_QUEUE } from './gov-data-sync.types';

/**
 * GovDataSyncModule - Government data synchronization module
 *
 * Provides scheduled jobs for:
 * - SINAPI monthly sync (day 5 at 03:00 BRT)
 * - SICRO quarterly sync (day 1 of Jan, Apr, Jul, Oct at 03:00 BRT)
 * - Cache refresh weekly (Sunday at 02:00 BRT)
 *
 * @example
 * ```typescript
 * // Import in AppModule
 * import { GovDataSyncModule } from './modules/gov-data-sync/gov-data-sync.module';
 *
 * @Module({
 * imports: [GovDataSyncModule],
 * })
 * export class AppModule {}
 *
 * // Manually trigger sync
 * @Injectable()
 * export class MyService {
 * constructor(private readonly syncService: GovDataSyncService) {}
 *
 * async triggerSync() {
 * await this.syncService.triggerSinapiSync('DF', '2024-12', true);
 * }
 * }
 * ```
 */
@Module({
  imports: [
    ConfigModule,
    // Register BullMQ queue for gov data sync
    BullModule.registerQueue({
      name: GOV_DATA_SYNC_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      },
    }),
    // Import gov API modules for data sync
    GovApiModule,
    SinapiModule,
    SicroModule,
  ],
  controllers: [GovDataSyncController],
  providers: [GovDataSyncService, GovDataSyncProcessor],
  exports: [GovDataSyncService],
})
export class GovDataSyncModule {}
