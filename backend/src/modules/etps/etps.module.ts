import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtpsService } from './etps.service';
import { EtpsController } from './etps.controller';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Etp, EtpSection, EtpVersion])],
  controllers: [EtpsController],
  providers: [EtpsService],
  exports: [EtpsService],
})
export class EtpsModule {}
