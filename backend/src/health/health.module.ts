import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { User } from '../entities/user.entity';
import { OrchestratorModule } from '../modules/orchestrator/orchestrator.module';
import { SearchModule } from '../modules/search/search.module';

/**
 * Health Check & Metrics Module
 *
 * Fornece:
 * - Health check endpoint (/api/health) para validação de prontidão
 * - Metrics endpoint (/api/metrics) para Prometheus scraping
 * - Provider health checks (OpenAI, Perplexity circuit breaker status)
 *
 * Essencial para:
 * - Zero-downtime deployment no Railway
 * - Monitoring e alerting em produção
 * - Observability com Sentry + Railway Metrics
 * - Circuit breaker visibility
 *
 * @module HealthModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), OrchestratorModule, SearchModule],
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService],
})
export class HealthModule {}
