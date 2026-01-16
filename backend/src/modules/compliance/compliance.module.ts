import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceChecklist } from '../../entities/compliance-checklist.entity';
import { ComplianceChecklistItem } from '../../entities/compliance-checklist-item.entity';
import { ComplianceValidationHistory } from '../../entities/compliance-validation-history.entity';
import { Etp } from '../../entities/etp.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceReportService } from './compliance-report.service';
import { ComplianceChecklistSeeder } from './compliance-checklist.seeder';
import { ComplianceController } from './compliance.controller';

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
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * Componentes:
 * - ComplianceChecklist: Entity para armazenar checklists
 * - ComplianceChecklistItem: Entity para itens individuais
 * - ComplianceValidationHistory: Entity para historico de validacoes
 * - ComplianceValidationService: Service para validacao de ETPs
 * - ComplianceReportService: Service para geracao de relatorios de conformidade
 * - ComplianceChecklistSeeder: Auto-seed de checklists TCU no bootstrap
 * - ComplianceController: Endpoints REST para validacao e relatorios
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceChecklist,
      ComplianceChecklistItem,
      ComplianceValidationHistory,
      Etp,
    ]),
  ],
  controllers: [ComplianceController],
  providers: [
    ComplianceValidationService,
    ComplianceReportService,
    ComplianceChecklistSeeder,
  ],
  exports: [ComplianceValidationService, ComplianceReportService],
})
export class ComplianceModule {}
