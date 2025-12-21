import { Controller, Get, Header, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';

/**
 * Controller para expor métricas da aplicação em formato Prometheus
 *
 * Endpoints:
 * - GET /api/metrics - Métricas em formato Prometheus via prom-client (#860)
 * - GET /api/metrics/json - Métricas em formato JSON (legacy)
 * - GET /api/metrics/legacy - Métricas em formato Prometheus (legacy)
 *
 * Uso:
 * ```bash
 * curl https://etp-express-backend-production.up.railway.app/api/metrics
 * ```
 *
 * Integração com Railway/Grafana:
 * - Railway pode scrape /api/metrics automaticamente
 * - Custom dashboards podem usar /api/metrics/json
 *
 * @see https://github.com/CONFENGE/etp-express/issues/860
 */
@ApiTags('health')
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly prometheusMetricsService: PrometheusMetricsService,
  ) {}

  /**
   * Retorna métricas em formato Prometheus via prom-client (#860)
   *
   * Inclui métricas padrão do Node.js (CPU, memory, event loop, GC)
   * e métricas customizadas da aplicação.
   *
   * Formato compatível com Prometheus scraping:
   * ```
   * # HELP metric_name Description
   * # TYPE metric_name gauge
   * metric_name 123
   * ```
   *
   * @returns Métricas em formato Prometheus
   */
  @Get()
  @ApiOperation({
    summary: 'Get application metrics (Prometheus format via prom-client)',
    description:
      'Retorna métricas via prom-client incluindo métricas padrão do Node.js',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus text format',
    schema: {
      type: 'string',
      example: `# HELP etp_express_database_connections_active Number of active database connections
# TYPE etp_express_database_connections_active gauge
etp_express_database_connections_active 5

# HELP etp_express_process_cpu_seconds_total Total user and system CPU time
# TYPE etp_express_process_cpu_seconds_total counter
etp_express_process_cpu_seconds_total 123.45`,
    },
  })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.prometheusMetricsService.getMetrics();
    res.set('Content-Type', this.prometheusMetricsService.getContentType());
    res.end(metrics);
  }

  /**
   * Retorna métricas em formato Prometheus legacy (sem prom-client)
   *
   * Mantido para compatibilidade. Prefer /api/metrics para scraping.
   *
   * @returns Métricas em formato Prometheus (legacy)
   */
  @Get('legacy')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({
    summary: 'Get application metrics (legacy Prometheus format)',
    description: 'Retorna métricas customizadas em formato Prometheus legado',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus text format (legacy)',
  })
  async getMetricsLegacy(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * Retorna métricas em formato JSON
   *
   * Formato simplificado para dashboards customizados:
   * ```json
   * {
   * "database_connections_active": 5,
   * "memory_usage_bytes": 45678901,
   * ...
   * }
   * ```
   *
   * @returns Métricas em formato JSON
   */
  @Get('json')
  @ApiOperation({
    summary: 'Get application metrics (JSON format)',
    description:
      'Retorna métricas customizadas em formato JSON para dashboards',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in JSON format',
    schema: {
      type: 'object',
      example: {
        database_connections_active: 5,
        database_connections_max: 100,
        memory_usage_bytes: 45678901,
        memory_limit_bytes: 134217728,
        uptime_seconds: 3600,
      },
    },
  })
  async getMetricsJson(): Promise<Record<string, number>> {
    return this.metricsService.getMetrics();
  }
}
