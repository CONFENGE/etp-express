import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferenciaController } from './termo-referencia.controller';
import { TermoReferenciaService } from './termo-referencia.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

/**
 * Module para Termos de Referencia.
 *
 * Funcionalidades:
 * - CRUD completo de Termos de Referencia
 * - Relacionamento com ETPs (origem)
 * - Isolamento multi-tenant via organizationId
 * - Geracao automatica de TR a partir de ETP com IA
 *
 * Issues relacionadas:
 * - #1248: Entity TermoReferencia e relacionamentos (DONE)
 * - #1249: Geracao automatica de TR a partir de ETP (DONE)
 * - #1250: Templates de TR por categoria
 * - #1251: Editor de TR no frontend
 * - #1252: Export TR em PDF/DOCX
 *
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TermoReferencia, Etp]),
    OrchestratorModule, // Provides OpenAIService for AI-powered TR generation
  ],
  controllers: [TermoReferenciaController],
  providers: [TermoReferenciaService],
  exports: [TermoReferenciaService],
})
export class TermoReferenciaModule {}
