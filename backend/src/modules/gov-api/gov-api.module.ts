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
 * - Prometheus-compatible metrics
 *
 * @module modules/gov-api
 * @see https://github.com/CONFENGE/etp-express/issues/690
 * @see https://github.com/CONFENGE/etp-express/issues/699
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovApiCache } from './utils/gov-api-cache';
import { GovApiMetricsService } from './gov-api-metrics.service';

/**
 * GovApiModule - Base module for government API integrations
 *
 * This is a global module that provides:
 * - GovApiCache: Redis-based caching for API responses
 * - GovApiMetricsService: Prometheus-compatible metrics for monitoring
 *
 * Individual API services (PNCP, Compras.gov.br, SINAPI, SICRO) should:
 * 1. Import this module
 * 2. Create their own service implementing IGovApiService
 * 3. Use GovApiClient for HTTP requests
 * 4. Use GovApiCache for response caching
 * 5. Use GovApiMetricsService to record request metrics
 *
 * @example
 * ```typescript
 * // In your feature module
 * import { GovApiModule } from '../gov-api/gov-api.module';
 * import { GovApiCache } from '../gov-api/utils/gov-api-cache';
 * import { GovApiMetricsService } from '../gov-api/gov-api-metrics.service';
 *
 * @Module({
 * imports: [GovApiModule],
 * providers: [MyGovApiService],
 * })
 * export class MyGovApiModule {}
 *
 * // In your service
 * @Injectable()
 * export class MyGovApiService implements IGovApiService {
 * constructor(
 * private cache: GovApiCache,
 * private metrics: GovApiMetricsService,
 * ) {}
 *
 * async search(query: string): Promise<Result> {
 * const start = Date.now();
 * try {
 * const result = await this.doSearch(query);
 * this.metrics.recordRequest('pncp', Date.now() - start, true);
 * return result;
 * } catch (error) {
 * this.metrics.recordRequest('pncp', Date.now() - start, false);
 * throw error;
 * }
 * }
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [GovApiCache, GovApiMetricsService],
  exports: [GovApiCache, GovApiMetricsService],
})
export class GovApiModule {}
