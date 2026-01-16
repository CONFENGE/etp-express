import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { TermoReferenciaTemplate } from '../../entities/termo-referencia-template.entity';
import { TermoReferenciaVersion } from '../../entities/termo-referencia-version.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferenciaController } from './termo-referencia.controller';
import { TermoReferenciaService } from './termo-referencia.service';
import { TrVersionsService } from './tr-versions.service';
import { TermoReferenciaExportService } from '../export/termo-referencia-export.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

/**
 * Module para Termos de Referencia.
 *
 * Funcionalidades:
 * - CRUD completo de Termos de Referencia
 * - Relacionamento com ETPs (origem)
 * - Isolamento multi-tenant via organizationId
 * - Geracao automatica de TR a partir de ETP com IA
 * - Templates pre-configurados por categoria (Obras, TI, Servicos, Materiais)
 * - Export para PDF/DOCX com formatacao oficial
 *
 * Issues relacionadas:
 * - #1248: Entity TermoReferencia e relacionamentos (DONE)
 * - #1249: Geracao automatica de TR a partir de ETP (DONE)
 * - #1250: Templates de TR por categoria (DONE)
 * - #1251: Editor de TR no frontend (DONE)
 * - #1252: Export TR em PDF/DOCX (DONE)
 * - #1253: Versionamento e historico de TR (DONE)
 *
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TermoReferencia,
      TermoReferenciaTemplate,
      TermoReferenciaVersion,
      Etp,
    ]),
    OrchestratorModule, // Provides OpenAIService for AI-powered TR generation
  ],
  controllers: [TermoReferenciaController],
  providers: [
    TermoReferenciaService,
    TrVersionsService,
    TermoReferenciaExportService,
  ],
  exports: [
    TermoReferenciaService,
    TrVersionsService,
    TermoReferenciaExportService,
  ],
})
export class TermoReferenciaModule {}
