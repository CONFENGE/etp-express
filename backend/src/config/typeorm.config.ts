import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { join } from 'path';

// Entity imports (explicit, modular entity discovery - TD-010.1 SYS-02)
// This approach makes entity registration explicit for CLI migrations while
// runtime uses autoLoadEntities with TypeOrmModule.forFeature() in each module
import { AiValidationResult } from '../entities/ai-validation-result.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { Ateste } from '../entities/ateste.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AuthorizedDomain } from '../entities/authorized-domain.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ComplianceChecklist } from '../entities/compliance-checklist.entity';
import { ComplianceChecklistItem } from '../entities/compliance-checklist-item.entity';
import { ComplianceValidationHistory } from '../entities/compliance-validation-history.entity';
import { ContractPrice } from '../entities/contract-price.entity';
import { Contrato } from '../entities/contrato.entity';
import { ContratoSyncLog } from '../entities/contrato-sync-log.entity';
import { DocumentoFiscalizacao } from '../entities/documento-fiscalizacao.entity';
import { DocumentTree } from '../entities/document-tree.entity';
import { Edital } from '../entities/edital.entity';
import { EditalTemplate } from '../entities/edital-template.entity';
import { Etp } from '../entities/etp.entity';
import { EtpSection } from '../entities/etp-section.entity';
import { EtpTemplate } from '../entities/etp-template.entity';
import { EtpVersion } from '../entities/etp-version.entity';
import { GovContract } from '../entities/gov-contract.entity';
import { ItemCategory } from '../entities/item-category.entity';
import { Legislation } from '../entities/legislation.entity';
import { Medicao } from '../entities/medicao.entity';
import { NormalizedContractItem } from '../entities/normalized-contract-item.entity';
import { Ocorrencia } from '../entities/ocorrencia.entity';
import { Organization } from '../entities/organization.entity';
import { OverpriceAlert } from '../entities/overprice-alert.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { PesquisaPrecos } from '../entities/pesquisa-precos.entity';
import { PriceBenchmark } from '../entities/price-benchmark.entity';
import { SecretAccessLog } from '../entities/secret-access-log.entity';
import { SectionTemplate } from '../entities/section-template.entity';
import { SicroItem } from '../entities/sicro-item.entity';
import { SimilarContract } from '../entities/similar-contract.entity';
import { SinapiItem } from '../entities/sinapi-item.entity';
import { TenantBranding } from '../entities/tenant-branding.entity';
import { TermoReferencia } from '../entities/termo-referencia.entity';
import { TermoReferenciaTemplate } from '../entities/termo-referencia-template.entity';
import { TermoReferenciaVersion } from '../entities/termo-referencia-version.entity';
import { User } from '../entities/user.entity';
import { ExportMetadata } from '../modules/export/entities/export-metadata.entity';
import { ApiUsage } from '../modules/market-intelligence/entities/api-usage.entity';

config();

const configService = new ConfigService();

// In production, __dirname points to dist/config, so we use relative paths from there
// In development with ts-node, __dirname points to src/config
const isCompiled = __dirname.includes('dist');
const migrationsPath = isCompiled
  ? join(__dirname, '..', 'migrations', '*.js')
  : join(__dirname, '..', 'migrations', '*.ts');

// Explicit entity array (TD-010.1 SYS-02 - Modular Entity Scan)
// Runtime uses autoLoadEntities in app.module.ts
// CLI migrations use this explicit list
const entities = [
  AiValidationResult,
  AnalyticsEvent,
  Ateste,
  AuditLog,
  AuthorizedDomain,
  ChatMessage,
  ComplianceChecklist,
  ComplianceChecklistItem,
  ComplianceValidationHistory,
  ContractPrice,
  Contrato,
  ContratoSyncLog,
  DocumentoFiscalizacao,
  DocumentTree,
  Edital,
  EditalTemplate,
  Etp,
  EtpSection,
  EtpTemplate,
  EtpVersion,
  GovContract,
  ItemCategory,
  Legislation,
  Medicao,
  NormalizedContractItem,
  Ocorrencia,
  Organization,
  OverpriceAlert,
  PasswordReset,
  PesquisaPrecos,
  PriceBenchmark,
  SecretAccessLog,
  SectionTemplate,
  SicroItem,
  SimilarContract,
  SinapiItem,
  TenantBranding,
  TermoReferencia,
  TermoReferenciaTemplate,
  TermoReferenciaVersion,
  User,
  ExportMetadata,
  ApiUsage,
];

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  entities,
  migrations: [migrationsPath],
  synchronize: false,
  logging: configService.get('DB_LOGGING', false),
  // SSL Configuration (#598)
  // Railway internal PostgreSQL doesn't require SSL (pgvector.railway.internal)
  // PGSSLMODE=disable is set in Railway environment variables
  ssl:
    configService.get('PGSSLMODE') === 'disable'
      ? false
      : configService.get('NODE_ENV') === 'production',
});
