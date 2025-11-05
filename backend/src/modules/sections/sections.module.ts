import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionsService } from './sections.service';
import { SectionsController } from './sections.controller';
import { EtpSection } from '../../entities/etp-section.entity';
import { Etp } from '../../entities/etp.entity';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { EtpsModule } from '../etps/etps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtpSection, Etp]),
    OrchestratorModule,
    EtpsModule,
  ],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
