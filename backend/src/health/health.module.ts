import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { User } from '../entities/user.entity';

/**
 * Health Check & Metrics Module
 *
 * Fornece:
 * - Health check endpoint (/api/health) para validação de prontidão
 * - Metrics endpoint (/api/metrics) para Prometheus scraping
 *
 * Essencial para:
 * - Zero-downtime deployment no Railway
 * - Monitoring e alerting em produção
 * - Observability com Sentry + Railway Metrics
 *
 * @module HealthModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService],
})
export class HealthModule {}
