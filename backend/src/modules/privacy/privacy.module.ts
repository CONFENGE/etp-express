import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PIIRedactionService } from './pii-redaction.service';
import { IpAnonymizationService } from './ip-anonymization.service';
import { AnalyticsEvent } from '@/entities/analytics-event.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { SecretAccessLog } from '@/entities/secret-access-log.entity';
import { ApiUsage } from '@/modules/market-intelligence/entities/api-usage.entity';

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
 * Entities with IP anonymization (TD-008):
 * - AnalyticsEvent: 30-day retention
 * - AuditLog: 90-day retention
 * - SecretAccessLog: 90-day retention
 * - ApiUsage: 30-day retention
 *
 * @module PrivacyModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEvent,
      AuditLog,
      SecretAccessLog,
      ApiUsage,
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [PIIRedactionService, IpAnonymizationService],
  exports: [PIIRedactionService, IpAnonymizationService],
})
export class PrivacyModule {}
