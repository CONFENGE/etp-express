import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { SectionsProcessor } from './sections.processor';
import { EtpSection } from '../../entities/etp-section.entity';
import { Etp } from '../../entities/etp.entity';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { EtpsModule } from '../etps/etps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtpSection, Etp]),
    BullModule.registerQueue({
      name: 'sections',
    }),
    OrchestratorModule,
    EtpsModule,
  ],
  controllers: [SectionsController],
  providers: [SectionsService, SectionsProcessor],
  exports: [SectionsService],
})
export class SectionsModule {}
