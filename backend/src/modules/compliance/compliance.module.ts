import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceChecklist } from '../../entities/compliance-checklist.entity';
import { ComplianceChecklistItem } from '../../entities/compliance-checklist-item.entity';
import { Etp } from '../../entities/etp.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceChecklistSeeder } from './compliance-checklist.seeder';

/**
 * Modulo de Conformidade TCU/TCE.
 *
 * Fornece funcionalidades para validacao de ETPs contra checklists
 * de conformidade baseados em requisitos do TCU e TCEs estaduais.
 *
 * Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 * Issue #1384 - [TCU-1163c] Seed checklist de conformidade TCU por tipo de ETP
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * Componentes:
 * - ComplianceChecklist: Entity para armazenar checklists
 * - ComplianceChecklistItem: Entity para itens individuais
 * - ComplianceValidationService: Service para validacao de ETPs
 * - ComplianceChecklistSeeder: Auto-seed de checklists TCU no bootstrap
 *
 * Proximas issues que dependem deste modulo:
 * - #1385: Criar endpoints REST para validacao de conformidade
 * - #1386: Componente indicador de conformidade no ETP Editor
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceChecklist,
      ComplianceChecklistItem,
      Etp,
    ]),
  ],
  providers: [ComplianceValidationService, ComplianceChecklistSeeder],
  exports: [ComplianceValidationService],
})
export class ComplianceModule {}
