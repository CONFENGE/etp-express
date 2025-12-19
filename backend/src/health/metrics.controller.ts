import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Controller para expor métricas da aplicação em formato Prometheus
 *
 * Endpoints:
 * - GET /api/metrics - Métricas em formato Prometheus (text/plain)
 * - GET /api/metrics/json - Métricas em formato JSON
 *
 * Uso:
 * ```bash
 * curl https://etp-express.up.railway.app/api/metrics
 * ```
 *
 * Integração com Railway:
 * - Railway pode scrape /api/metrics automaticamente
 * - Custom dashboards podem usar /api/metrics/json
 */
@ApiTags('health')
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retorna métricas em formato Prometheus (text/plain)
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
  @Header('Content-Type', 'text/plain; version=0.0.4')
  @ApiOperation({
    summary: 'Get application metrics (Prometheus format)',
    description:
      'Retorna métricas customizadas em formato Prometheus para scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus text format',
    schema: {
      type: 'string',
      example: `# HELP database_connections_active Active database connections
# TYPE database_connections_active gauge
database_connections_active 5

# HELP memory_usage_bytes Memory heap used in bytes
# TYPE memory_usage_bytes gauge
memory_usage_bytes 45678901`,
    },
  })
  async getMetrics(): Promise<string> {
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
