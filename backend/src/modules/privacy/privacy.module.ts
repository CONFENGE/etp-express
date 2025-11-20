import { Module } from '@nestjs/common';
import { PIIRedactionService } from './pii-redaction.service';

/**
 * Privacy Module
 *
 * Módulo responsável por funcionalidades de privacidade e proteção de dados,
 * incluindo sanitização de PII conforme LGPD.
 *
 * Providers:
 * - PIIRedactionService: Sanitização de informações pessoais identificáveis
 *
 * @module PrivacyModule
 */
@Module({
  providers: [PIIRedactionService],
  exports: [PIIRedactionService],
})
export class PrivacyModule {}
