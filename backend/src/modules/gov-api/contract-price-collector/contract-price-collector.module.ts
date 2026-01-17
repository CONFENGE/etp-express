/**
 * Contract Price Collector Module
 *
 * NestJS module for collecting and storing homologated prices from public procurements.
 * This is the foundation of M13: Market Intelligence module.
 *
 * @module modules/gov-api/contract-price-collector
 * @see Issue #1269 for M13: Market Intelligence implementation
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { GovApiModule } from '../gov-api.module';
import { PncpModule } from '../pncp/pncp.module';
import { ContractPrice } from '../../../entities/contract-price.entity';
import { ContractPriceCollectorService } from './contract-price-collector.service';

/**
 * ContractPriceCollectorModule - Module for contract price collection
 *
 * Provides:
 * - ContractPriceCollectorService: Service for collecting and storing prices
 *
 * Dependencies:
 * - GovApiModule: Provides GovApiCache and metrics
 * - PncpModule: Provides PncpService for PNCP API access
 * - TypeOrmModule: Provides ContractPrice repository
 * - ScheduleModule: Provides @Cron decorator for scheduled tasks
 * - ConfigModule: Provides environment configuration
 *
 * @example
 * ```typescript
 * // Import in your feature module
 * @Module({
 *   imports: [ContractPriceCollectorModule],
 *   providers: [MyMarketIntelligenceService],
 * })
 * export class MyModule {}
 *
 * // Use in your service
 * @Injectable()
 * export class MyMarketIntelligenceService {
 *   constructor(
 *     private collectorService: ContractPriceCollectorService,
 *   ) {}
 *
 *   async collectRecentPrices() {
 *     return this.collectorService.collectFromPncp({
 *       dataInicial: '20240101',
 *       dataFinal: '20240131',
 *       uf: 'DF',
 *     });
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    GovApiModule,
    PncpModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ContractPrice]),
  ],
  providers: [ContractPriceCollectorService],
  exports: [ContractPriceCollectorService],
})
export class ContractPriceCollectorModule {}
