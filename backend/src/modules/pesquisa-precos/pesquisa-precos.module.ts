import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PesquisaPrecos } from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { PesquisaPrecosController } from './pesquisa-precos.controller';
import { PesquisaPrecosService } from './pesquisa-precos.service';
import { PesquisaPrecosExportService } from '../export/pesquisa-precos-export.service';
import { SinapiModule } from '../gov-api/sinapi/sinapi.module';
import { SicroModule } from '../gov-api/sicro/sicro.module';
import { PncpModule } from '../gov-api/pncp/pncp.module';
import { PriceAggregationModule } from '../gov-api/price-aggregation/price-aggregation.module';

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
 * - Coleta automatica de precos multi-fonte (#1412)
 *
 * Sub-issues implementadas:
 * - #1412: Integrar PriceAggregation no PesquisaPrecosService
 *
 * Proximas sub-issues:
 * - #1413: Implementar busca em Atas de Registro de Precos via PNCP
 * - #1414: Expandir busca de precos de contratos PNCP/Compras.gov
 * - #1415: Endpoint e testes de integracao para coleta multi-fonte
 * - #1257: Gerar mapa comparativo de precos
 * - #1258: Justificativa automatica de metodologia
 * - #1259: Interface de pesquisa no frontend
 * - #1260: Export relatorio de pesquisa PDF
 *
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos com metodologia
 * @see Issue #1412 - [Pesquisa-b1] Integrar PriceAggregation no PesquisaPrecosService
 * Parent: #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PesquisaPrecos, Etp, TermoReferencia]),
    SinapiModule,
    SicroModule,
    PncpModule,
    PriceAggregationModule,
  ],
  controllers: [PesquisaPrecosController],
  providers: [PesquisaPrecosService, PesquisaPrecosExportService],
  exports: [PesquisaPrecosService, PesquisaPrecosExportService],
})
export class PesquisaPrecosModule {}
