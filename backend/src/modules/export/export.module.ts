import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { ExportMetadata } from './entities/export-metadata.entity';
import { ResourceOwnershipModule } from '../../common/guards/resource-ownership.module';
import { StorageModule } from '../storage/storage.module';
import { ExportCleanupProcessor } from './export-cleanup.processor';
import { EXPORT_CLEANUP_QUEUE } from './export-cleanup.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etp, EtpSection, ExportMetadata]),
    ResourceOwnershipModule,
    StorageModule,
    // Register BullMQ queue for export cleanup with retry
    BullModule.registerQueue({
      name: EXPORT_CLEANUP_QUEUE,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3600000, // 1 hour base delay
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days (keep for debugging)
        },
      },
    }),
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportCleanupProcessor],
  exports: [ExportService],
})
export class ExportModule implements OnModuleInit {
  constructor(private readonly exportService: ExportService) {}

  async onModuleInit() {
    // Schedule automatic cleanup on module initialization
    await this.exportService.scheduleAutomaticCleanup();
  }
}
