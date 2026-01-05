/**
 * Price Aggregation Module
 *
 * Provides price aggregation functionality for combining price references
 * from multiple government sources (PNCP, SINAPI, SICRO).
 *
 * @module modules/gov-api/price-aggregation
 * @see https://github.com/CONFENGE/etp-express/issues/1159
 */

import { Module } from '@nestjs/common';
import { PriceAggregationService } from './price-aggregation.service';

@Module({
  providers: [PriceAggregationService],
  exports: [PriceAggregationService],
})
export class PriceAggregationModule {}
