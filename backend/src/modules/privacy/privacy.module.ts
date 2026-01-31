import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PIIRedactionService } from './pii-redaction.service';
import { IpAnonymizationService } from './ip-anonymization.service';
import { AnalyticsEvent } from '@/entities/analytics-event.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { SecretAccessLog } from '@/entities/secret-access-log.entity';

/**
 * Privacy Module
 *
 * Módulo responsável por funcionalidades de privacidade e proteção de dados,
 * incluindo sanitização de PII conforme LGPD.
 *
 * Providers:
 * - PIIRedactionService: Sanitização de informações pessoais identificáveis
 * - IpAnonymizationService: Anonimização de endereços IP conforme LGPD Art. 12
 *
 * @module PrivacyModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, AuditLog, SecretAccessLog]),
    ScheduleModule.forRoot(),
  ],
  providers: [PIIRedactionService, IpAnonymizationService],
  exports: [PIIRedactionService, IpAnonymizationService],
})
export class PrivacyModule {}
