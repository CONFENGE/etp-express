/**
 * PNCP Module
 *
 * NestJS module for PNCP (Portal Nacional de Contratações Públicas) integration.
 *
 * @module modules/gov-api/pncp
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovApiModule } from '../gov-api.module';
import { PncpService } from './pncp.service';

/**
 * PncpModule - Module for PNCP API integration
 *
 * Provides:
 * - PncpService: Service implementing IGovApiService for PNCP access
 *
 * Dependencies:
 * - GovApiModule: Provides GovApiCache for Redis caching
 * - ConfigModule: Provides environment configuration
 *
 * @example
 * ```typescript
 * // Import in your feature module
 * @Module({
 * imports: [PncpModule],
 * providers: [MyService],
 * })
 * export class MyModule {}
 *
 * // Use in your service
 * @Injectable()
 * export class MyService {
 * constructor(private pncpService: PncpService) {}
 *
 * async findContracts(query: string) {
 * return this.pncpService.search(query);
 * }
 * }
 * ```
 */
@Module({
 imports: [GovApiModule, ConfigModule],
 providers: [PncpService],
 exports: [PncpService],
})
export class PncpModule {}
