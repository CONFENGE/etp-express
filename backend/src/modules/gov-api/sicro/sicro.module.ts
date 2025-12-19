/**
 * SICRO Module
 *
 * NestJS module for SICRO (Sistema de Custos Referenciais de Obras) integration.
 *
 * Provides SicroService for data ingestion and search of DNIT's transportation
 * infrastructure cost reference system.
 *
 * @module modules/gov-api/sicro
 * @see https://github.com/CONFENGE/etp-express/issues/694
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovApiModule } from '../gov-api.module';
import { SicroService } from './sicro.service';

/**
 * SicroModule - SICRO integration module
 *
 * @example
 * ```typescript
 * // In your feature module
 * import { SicroModule } from '../gov-api/sicro';
 *
 * @Module({
 * imports: [SicroModule],
 * })
 * export class MyFeatureModule {}
 *
 * // In your service
 * @Injectable()
 * export class MyService {
 * constructor(private readonly sicroService: SicroService) {}
 *
 * async findRoadConstructionCosts(query: string) {
 * return this.sicroService.search(query, { uf: 'DF' });
 * }
 * }
 * ```
 */
@Module({
 imports: [ConfigModule, GovApiModule],
 providers: [SicroService],
 exports: [SicroService],
})
export class SicroModule {}
