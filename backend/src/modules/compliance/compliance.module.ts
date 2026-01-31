import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceChecklist } from '../../entities/compliance-checklist.entity';
import { ComplianceChecklistItem } from '../../entities/compliance-checklist-item.entity';
import { ComplianceValidationHistory } from '../../entities/compliance-validation-history.entity';
import { AiValidationResult } from '../../entities/ai-validation-result.entity';
import { Etp } from '../../entities/etp.entity';
import { Edital } from '../../entities/edital.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceReportService } from './compliance-report.service';
import { AiValidationService } from './ai-validation.service';
import { ComplianceChecklistSeeder } from './compliance-checklist.seeder';
import { ComplianceController } from './compliance.controller';
import { AiValidationController } from './ai-validation.controller';
import { PageIndexModule } from '../pageindex/pageindex.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';

/**
 * Modulo de Conformidade TCU/TCE.
 *
 * Fornece funcionalidades para validacao de ETPs contra checklists
 * de conformidade baseados em requisitos do TCU e TCEs estaduais.
 *
 * Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 * Issue #1384 - [TCU-1163c] Seed checklist de conformidade TCU por tipo de ETP
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 * Issue #1264 - [Compliance-c] Criar relatorio de conformidade
 * Issue #1291 - [IA] Validação automática similar ao ALICE/TCU
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * Componentes:
 * - ComplianceChecklist: Entity para armazenar checklists
 * - ComplianceChecklistItem: Entity para itens individuais
 * - ComplianceValidationHistory: Entity para historico de validacoes
 * - AiValidationResult: Entity para resultados de validação AI (ALICE-like)
 * - ComplianceValidationService: Service para validacao de ETPs
 * - ComplianceReportService: Service para geracao de relatorios de conformidade
 * - AiValidationService: Service para detecção inteligente de irregularidades
 * - ComplianceChecklistSeeder: Auto-seed de checklists TCU no bootstrap
 * - ComplianceController: Endpoints REST para validacao e relatorios
 * - AiValidationController: Endpoints REST para validação AI
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceChecklist,
      ComplianceChecklistItem,
      ComplianceValidationHistory,
      AiValidationResult,
      Etp,
      Edital,
    ]),
    forwardRef(() => PageIndexModule),
    forwardRef(() => MarketIntelligenceModule),
  ],
  controllers: [ComplianceController, AiValidationController],
  providers: [
    ComplianceValidationService,
    ComplianceReportService,
    AiValidationService,
    ComplianceChecklistSeeder,
  ],
  exports: [
    ComplianceValidationService,
    ComplianceReportService,
    AiValidationService,
  ],
})
export class ComplianceModule {}
