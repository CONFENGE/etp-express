import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GovApiMetricsService } from '../modules/gov-api/gov-api-metrics.service';
import { RequestMetricsCollector } from './request-metrics.collector';

/**
 * Service para coletar métricas customizadas da aplicação
 *
 * Métricas expostas:
 * - Database connections (active/total)
 * - Memory usage (heap/total)
 * - Process uptime
 * - Query statistics (via pg_stat_statements se disponível)
 * - Government API metrics (PNCP, Compras.gov.br, SINAPI, SICRO)
 * - Request metrics: response time P50/P95/P99, error rate, request count (#802)
 *
 * Formato: Prometheus-compatible (key value pairs)
 *
 * Uso:
 * ```typescript
 * const metrics = await metricsService.getMetrics();
 * // => { database_connections_active: 5, response_time_p95_ms: 120, ... }
 * ```
 *
 * @see https://github.com/CONFENGE/etp-express/issues/699
 * @see https://github.com/CONFENGE/etp-express/issues/802
 */
@Injectable()
export class MetricsService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Optional() private govApiMetrics?: GovApiMetricsService,
    @Optional() private requestMetrics?: RequestMetricsCollector,
  ) {}

  /**
   * Coleta todas as métricas da aplicação
   *
   * @returns Object com métricas em formato key-value
   */
  async getMetrics(): Promise<Record<string, number>> {
    const [dbMetrics, memoryMetrics, processMetrics, requestMetricsData] =
      await Promise.all([
        this.getDatabaseMetrics(),
        this.getMemoryMetrics(),
        this.getProcessMetrics(),
        this.getRequestMetrics(),
      ]);

    return {
      ...dbMetrics,
      ...memoryMetrics,
      ...processMetrics,
      ...requestMetricsData,
    };
  }

  /**
   * Formata métricas para formato Prometheus
   *
   * Formato:
   * ```
   * # HELP metric_name Description
   * # TYPE metric_name gauge
   * metric_name{label="value"} 123
   * ```
   *
   * @returns String em formato Prometheus
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.getMetrics();
    const lines: string[] = [];

    // Header
    lines.push('# ETP Express Application Metrics');
    lines.push('# Generated: ' + new Date().toISOString());
    lines.push('');

    // Database metrics
    lines.push(
      '# HELP database_connections_active Active database connections',
    );
    lines.push('# TYPE database_connections_active gauge');
    lines.push(
      `database_connections_active ${metrics.database_connections_active}`,
    );
    lines.push('');

    lines.push('# HELP database_connections_max Maximum database connections');
    lines.push('# TYPE database_connections_max gauge');
    lines.push(`database_connections_max ${metrics.database_connections_max}`);
    lines.push('');

    // Memory metrics
    lines.push('# HELP memory_usage_bytes Memory heap used in bytes');
    lines.push('# TYPE memory_usage_bytes gauge');
    lines.push(`memory_usage_bytes ${metrics.memory_usage_bytes}`);
    lines.push('');

    lines.push('# HELP memory_limit_bytes Memory heap total in bytes');
    lines.push('# TYPE memory_limit_bytes gauge');
    lines.push(`memory_limit_bytes ${metrics.memory_limit_bytes}`);
    lines.push('');

    // Process metrics
    lines.push('# HELP uptime_seconds Process uptime in seconds');
    lines.push('# TYPE uptime_seconds counter');
    lines.push(`uptime_seconds ${metrics.uptime_seconds}`);
    lines.push('');

    // Government API metrics (if available)
    if (this.govApiMetrics) {
      const govApiOutput = this.govApiMetrics.getPrometheusMetrics();
      lines.push(govApiOutput);
    }

    // Request metrics (#802)
    if (this.requestMetrics) {
      lines.push('');
      lines.push(this.requestMetrics.getPrometheusMetrics());
    }

    return lines.join('\n');
  }

  /**
   * Métricas do banco de dados PostgreSQL
   */
  private async getDatabaseMetrics(): Promise<Record<string, number>> {
    try {
      // Conexões ativas
      const activeConnectionsResult = await this.dataSource.query(
        `SELECT count(*) as active FROM pg_stat_activity WHERE state = $1`,
        ['active'],
      );

      // Total de conexões
      const totalConnectionsResult = await this.dataSource.query(
        `SELECT count(*) as total FROM pg_stat_activity`,
      );

      return {
        database_connections_active: parseInt(
          activeConnectionsResult[0]?.active || '0',
        ),
        database_connections_total: parseInt(
          totalConnectionsResult[0]?.total || '0',
        ),
        database_connections_max: 100, // Railway default max_connections
      };
    } catch {
      // Se queries falharem, retornar zeros
      return {
        database_connections_active: 0,
        database_connections_total: 0,
        database_connections_max: 100,
      };
    }
  }

  /**
   * Métricas de memória do processo Node.js
   */
  private getMemoryMetrics(): Record<string, number> {
    const memUsage = process.memoryUsage();

    return {
      memory_usage_bytes: memUsage.heapUsed,
      memory_limit_bytes: memUsage.heapTotal,
      memory_rss_bytes: memUsage.rss,
      memory_external_bytes: memUsage.external,
    };
  }

  /**
   * Métricas do processo Node.js
   */
  private getProcessMetrics(): Record<string, number> {
    return {
      uptime_seconds: Math.floor(process.uptime()),
      process_id: process.pid,
    };
  }

  /**
   * Métricas de request HTTP (#802)
   * Response time P50/P95/P99, error rate, request count
   */
  private getRequestMetrics(): Record<string, number> {
    if (!this.requestMetrics) {
      return {
        request_count_total: 0,
        response_time_p50_ms: 0,
        response_time_p95_ms: 0,
        response_time_p99_ms: 0,
        error_rate_percent: 0,
        requests_per_second: 0,
      };
    }

    const metrics = this.requestMetrics.getAggregatedMetrics();

    return {
      request_count_total: metrics.requestCount,
      response_time_p50_ms: metrics.responseTimeP50Ms,
      response_time_p95_ms: metrics.responseTimeP95Ms,
      response_time_p99_ms: metrics.responseTimeP99Ms,
      error_rate_percent: Math.round(metrics.errorRatePercent * 100) / 100,
      requests_per_second: Math.round(metrics.requestsPerSecond * 100) / 100,
    };
  }
}
