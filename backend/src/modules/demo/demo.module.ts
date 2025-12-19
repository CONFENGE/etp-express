import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoService } from './demo.service';
import { DemoController } from './demo.controller';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';
import { AuditLog } from '../../entities/audit-log.entity';

/**
 * Demo Module - Gestão de dados demo isolados (M8: Gestão de Domínios #474)
 *
 * Responsável por:
 * - Isolar dados da organização demo de outras organizações
 * - Resetar dados demo diariamente às 00:00 UTC
 * - Recriar ETPs de exemplo após cada reset
 *
 * @see Issue #474 - Implementar isolamento e reset periódico de dados demo
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      User,
      Etp,
      EtpSection,
      EtpVersion,
      AuditLog,
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
