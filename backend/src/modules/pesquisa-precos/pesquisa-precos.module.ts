import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PesquisaPrecos } from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { PesquisaPrecosController } from './pesquisa-precos.controller';
import { PesquisaPrecosService } from './pesquisa-precos.service';

/**
 * Module para Pesquisas de Precos.
 *
 * Funcionalidades:
 * - CRUD completo de Pesquisas de Precos
 * - Relacionamento opcional com ETP (pesquisa durante elaboracao)
 * - Relacionamento opcional com TR (pesquisa para termo de referencia)
 * - Isolamento multi-tenant via organizationId
 * - Calculos estatisticos automaticos (media, mediana, menor preco)
 * - Metodologias conforme IN SEGES/ME n 65/2021
 *
 * Proximas sub-issues (nao implementadas nesta issue):
 * - #1256: Implementar coleta automatica multi-fonte
 * - #1257: Gerar mapa comparativo de precos
 * - #1258: Justificativa automatica de metodologia
 * - #1259: Interface de pesquisa no frontend
 * - #1260: Export relatorio de pesquisa PDF
 *
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos com metodologia
 * Parent: #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 */
@Module({
  imports: [TypeOrmModule.forFeature([PesquisaPrecos, Etp, TermoReferencia])],
  controllers: [PesquisaPrecosController],
  providers: [PesquisaPrecosService],
  exports: [PesquisaPrecosService],
})
export class PesquisaPrecosModule {}
