import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { ResourceOwnershipModule } from '../../common/guards/resource-ownership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etp, EtpSection]),
    ResourceOwnershipModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
