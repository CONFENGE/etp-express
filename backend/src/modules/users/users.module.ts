import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Etp, AnalyticsEvent, AuditLog]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
