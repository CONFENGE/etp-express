import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { User } from '../entities/user.entity';
import { OrchestratorModule } from '../modules/orchestrator/orchestrator.module';
import { SearchModule } from '../modules/search/search.module';
import { GovApiModule } from '../modules/gov-api/gov-api.module';

/**
 * Health Check & Metrics Module
 *
 * Fornece:
 * - Health check endpoint (/api/health) para validação de prontidão
 * - Metrics endpoint (/api/metrics) para Prometheus scraping
 * - Provider health checks (OpenAI, Exa circuit breaker status)
 * - Government API metrics (PNCP, Compras.gov.br, SINAPI, SICRO)
 *
 * Essencial para:
 * - Zero-downtime deployment no Railway
 * - Monitoring e alerting em produção
 * - Observability com Sentry + Railway Metrics
 * - Circuit breaker visibility
 * - Government API monitoring
 *
 * @module HealthModule
 * @see https://github.com/CONFENGE/etp-express/issues/699
 */
@Module({
 imports: [
 TypeOrmModule.forFeature([User]),
 OrchestratorModule,
 SearchModule,
 GovApiModule,
 ],
 controllers: [HealthController, MetricsController],
 providers: [HealthService, MetricsService],
})
export class HealthModule {}
