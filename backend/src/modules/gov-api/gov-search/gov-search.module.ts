/**
 * Government Search Module
 *
 * Provides unified search across all Brazilian government APIs:
 * - PNCP (Portal Nacional de Contratações Públicas)
 * - Compras.gov.br (SIASG)
 * - SINAPI (Sistema Nacional de Pesquisa de Custos)
 * - SICRO (Sistema de Custos Rodoviários)
 *
 * @module modules/gov-api/gov-search
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovSearchService } from './gov-search.service';
import { ComprasGovModule } from '../compras-gov/compras-gov.module';
import { PncpModule } from '../pncp/pncp.module';
import { SinapiModule } from '../sinapi/sinapi.module';
import { SicroModule } from '../sicro/sicro.module';
import { SearchModule } from '../../search/search.module';
import { PriceAggregationModule } from '../price-aggregation/price-aggregation.module';

@Module({
  imports: [
    ConfigModule,
    ComprasGovModule,
    PncpModule,
    SinapiModule,
    SicroModule,
    SearchModule, // Import SearchModule for ExaService
    PriceAggregationModule,
  ],
  providers: [GovSearchService],
  exports: [GovSearchService],
})
export class GovSearchModule {}
