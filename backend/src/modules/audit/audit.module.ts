import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretAccessLog } from '../../entities/secret-access-log.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SecretAccessLog, AuditLog])],
  controllers: [AuditController],
  providers: [AuditService, SecretsService],
  exports: [AuditService, SecretsService],
})
export class AuditModule {}
