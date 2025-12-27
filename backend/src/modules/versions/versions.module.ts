import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { EtpVersion } from '../../entities/etp-version.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { ResourceOwnershipModule } from '../../common/guards/resource-ownership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtpVersion, Etp, EtpSection]),
    ResourceOwnershipModule,
  ],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
