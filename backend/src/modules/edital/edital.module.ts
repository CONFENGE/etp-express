import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Edital } from '../../entities/edital.entity';
import { EditalTemplate } from '../../entities/edital-template.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { PesquisaPrecos } from '../../entities/pesquisa-precos.entity';
import { EditalController } from './edital.controller';
import { EditalGenerationService } from './edital-generation.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

/**
 * Module para Editais de Licitação.
 *
 * Funcionalidades:
 * - Geração automática de Edital a partir de ETP+TR+PesquisaPrecos
 * - Compilação de dados de documentos fonte
 * - Enriquecimento de cláusulas com IA
 * - Isolamento multi-tenant via organizationId
 *
 * Issues relacionadas:
 * - #1277: Entity Edital com estrutura completa (DONE)
 * - #1278: Templates de edital por modalidade (DONE)
 * - #1279: Geração automática a partir de ETP+TR+Pesquisa (IN PROGRESS)
 * - #1280: Editor de edital no frontend (TODO)
 * - #1281: Validação de cláusulas obrigatórias (TODO)
 * - #1282: Export edital formatado PDF/DOCX (TODO)
 *
 * Parent: #1276 - [Edital] Módulo de Geração de Edital - EPIC
 * Milestone: M14 - Geração de Edital
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Edital,
      EditalTemplate,
      Etp,
      TermoReferencia,
      PesquisaPrecos,
    ]),
    OrchestratorModule, // Provides OpenAIService for AI-powered clause generation
  ],
  controllers: [EditalController],
  providers: [EditalGenerationService],
  exports: [EditalGenerationService],
})
export class EditalModule {}
