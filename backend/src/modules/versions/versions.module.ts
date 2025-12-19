import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { EtpVersion } from '../../entities/etp-version.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';

@Module({
 imports: [TypeOrmModule.forFeature([EtpVersion, Etp, EtpSection])],
 controllers: [VersionsController],
 providers: [VersionsService],
 exports: [VersionsService],
})
export class VersionsModule {}
