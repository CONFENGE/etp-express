import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferenciaController } from './termo-referencia.controller';
import { TermoReferenciaService } from './termo-referencia.service';

/**
 * Module para Termos de Referencia.
 *
 * Funcionalidades:
 * - CRUD completo de Termos de Referencia
 * - Relacionamento com ETPs (origem)
 * - Isolamento multi-tenant via organizationId
 *
 * Proximo passos (issues relacionadas):
 * - #1249: Geracao automatica de TR a partir de ETP
 * - #1250: Templates de TR por categoria
 * - #1251: Editor de TR no frontend
 * - #1252: Export TR em PDF/DOCX
 *
 * Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Module({
  imports: [TypeOrmModule.forFeature([TermoReferencia, Etp])],
  controllers: [TermoReferenciaController],
  providers: [TermoReferenciaService],
  exports: [TermoReferenciaService],
})
export class TermoReferenciaModule {}
