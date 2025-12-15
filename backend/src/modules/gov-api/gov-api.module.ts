/**
 * Government API Module
 *
 * Base module providing shared infrastructure for Brazilian government API integrations:
 * - PNCP (Portal Nacional de Contratacoes Publicas)
 * - Compras.gov.br (SIASG)
 * - SINAPI (Sistema Nacional de Pesquisa de Custos)
 * - SICRO (Sistema de Custos Rodoviarios)
 *
 * Features:
 * - HTTP client with circuit breaker and retry
 * - Redis-based caching with configurable TTL
 * - Rate limiting per API source
 * - Health monitoring
 *
 * @module modules/gov-api
 * @see https://github.com/CONFENGE/etp-express/issues/690
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovApiCache } from './utils/gov-api-cache';

/**
 * GovApiModule - Base module for government API integrations
 *
 * This is a global module that provides:
 * - GovApiCache: Redis-based caching for API responses
 *
 * Individual API services (PNCP, Compras.gov.br, SINAPI, SICRO) should:
 * 1. Import this module
 * 2. Create their own service implementing IGovApiService
 * 3. Use GovApiClient for HTTP requests
 * 4. Use GovApiCache for response caching
 *
 * @example
 * ```typescript
 * // In your feature module
 * import { GovApiModule } from '../gov-api/gov-api.module';
 * import { GovApiCache } from '../gov-api/utils/gov-api-cache';
 *
 * @Module({
 *   imports: [GovApiModule],
 *   providers: [MyGovApiService],
 * })
 * export class MyGovApiModule {}
 *
 * // In your service
 * @Injectable()
 * export class MyGovApiService implements IGovApiService {
 *   constructor(private cache: GovApiCache) {}
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [GovApiCache],
  exports: [GovApiCache],
})
export class GovApiModule {}
