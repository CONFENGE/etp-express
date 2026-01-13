import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtpsService } from './etps.service';
import { EtpsController } from './etps.controller';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';
import { ResourceOwnershipModule } from '../../common/guards/resource-ownership.module';
import { DemoUserEtpLimitModule } from '../../common/guards/demo-user-etp-limit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etp, EtpSection, EtpVersion]),
    ResourceOwnershipModule,
    DemoUserEtpLimitModule,
  ],
  controllers: [EtpsController],
  providers: [EtpsService],
  exports: [EtpsService],
})
export class EtpsModule {}
