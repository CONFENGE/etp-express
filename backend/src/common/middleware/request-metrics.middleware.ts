import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestMetricsCollector } from '../../health/request-metrics.collector';

/**
 * Request Metrics Middleware (#802)
 *
 * Collects performance metrics for every HTTP request:
 * - Response time (ms)
 * - Status code (for error rate calculation)
 * - Request path (for per-endpoint metrics)
 *
 * Works in conjunction with RequestMetricsCollector to maintain
 * a sliding window of metrics for percentile calculations.
 *
 * Collected metrics are exposed via /api/metrics endpoint:
 * - request_count_total: Total requests in the window
 * - response_time_p50_ms: 50th percentile response time
 * - response_time_p95_ms: 95th percentile response time
 * - response_time_p99_ms: 99th percentile response time
 * - error_rate_percent: Percentage of 5xx responses
 *
 * @see https://github.com/CONFENGE/etp-express/issues/802
 */
@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsCollector: RequestMetricsCollector) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Capture response finish event to record metrics
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const path = this.normalizePath(req.path);

      this.metricsCollector.recordRequest({
        path,
        statusCode,
        responseTimeMs: responseTime,
        timestamp: Date.now(),
      });
    });

    next();
  }

  /**
   * Normalize path to prevent high cardinality metrics
   *
   * Examples:
   * - /api/etps/123 -> /api/etps/:id
   * - /api/users/abc-def -> /api/users/:id
   * - /api/health -> /api/health (unchanged)
   */
  private normalizePath(path: string): string {
    // Skip normalization for non-API paths
    if (!path.startsWith('/api')) {
      return path;
    }

    // Replace UUIDs and numeric IDs with :id
    return path
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      )
      .replace(/\/\d+/g, '/:id');
  }
}
