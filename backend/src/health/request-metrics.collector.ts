import { Injectable } from '@nestjs/common';

/**
 * Request metric data point
 */
export interface RequestMetric {
  path: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: number;
}

/**
 * Request Metrics Collector (#802)
 *
 * Singleton service that collects and aggregates HTTP request metrics
 * using a sliding window approach (default: 5 minutes).
 *
 * Features:
 * - Sliding window to prevent unbounded memory growth
 * - Percentile calculations (P50, P95, P99)
 * - Error rate calculation (5xx responses / total)
 * - Thread-safe operations
 *
 * Memory usage: ~100 bytes per request, max ~30KB for 300 requests
 * (typical for 5-minute window at 1 req/s)
 *
 * @example
 * ```typescript
 * const metrics = collector.getAggregatedMetrics();
 * // => { requestCount: 150, p50: 45, p95: 120, p99: 250, errorRate: 0.02 }
 * ```
 *
 * @see https://github.com/CONFENGE/etp-express/issues/802
 */
@Injectable()
export class RequestMetricsCollector {
  private readonly metrics: RequestMetric[] = [];
  private readonly windowMs: number;
  private readonly maxMetrics: number;

  constructor() {
    // 5-minute sliding window
    this.windowMs = 5 * 60 * 1000;
    // Maximum metrics to store (prevents memory issues under high load)
    this.maxMetrics = 10000;
  }

  /**
   * Record a new request metric
   */
  recordRequest(metric: RequestMetric): void {
    this.metrics.push(metric);

    // Cleanup old metrics periodically (every 100 requests)
    if (this.metrics.length % 100 === 0) {
      this.cleanup();
    }

    // Hard limit to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }
  }

  /**
   * Get aggregated metrics for the current window
   */
  getAggregatedMetrics(): {
    requestCount: number;
    responseTimeP50Ms: number;
    responseTimeP95Ms: number;
    responseTimeP99Ms: number;
    errorRatePercent: number;
    requestsPerSecond: number;
  } {
    this.cleanup();

    if (this.metrics.length === 0) {
      return {
        requestCount: 0,
        responseTimeP50Ms: 0,
        responseTimeP95Ms: 0,
        responseTimeP99Ms: 0,
        errorRatePercent: 0,
        requestsPerSecond: 0,
      };
    }

    const responseTimes = this.metrics.map((m) => m.responseTimeMs).sort((a, b) => a - b);
    const errorCount = this.metrics.filter((m) => m.statusCode >= 500).length;
    const windowSeconds = this.windowMs / 1000;

    return {
      requestCount: this.metrics.length,
      responseTimeP50Ms: this.percentile(responseTimes, 50),
      responseTimeP95Ms: this.percentile(responseTimes, 95),
      responseTimeP99Ms: this.percentile(responseTimes, 99),
      errorRatePercent: (errorCount / this.metrics.length) * 100,
      requestsPerSecond: this.metrics.length / windowSeconds,
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getAggregatedMetrics();
    const lines: string[] = [];

    lines.push('# HELP request_count_total Total requests in sliding window');
    lines.push('# TYPE request_count_total gauge');
    lines.push(`request_count_total ${metrics.requestCount}`);
    lines.push('');

    lines.push('# HELP response_time_p50_ms 50th percentile response time');
    lines.push('# TYPE response_time_p50_ms gauge');
    lines.push(`response_time_p50_ms ${metrics.responseTimeP50Ms}`);
    lines.push('');

    lines.push('# HELP response_time_p95_ms 95th percentile response time');
    lines.push('# TYPE response_time_p95_ms gauge');
    lines.push(`response_time_p95_ms ${metrics.responseTimeP95Ms}`);
    lines.push('');

    lines.push('# HELP response_time_p99_ms 99th percentile response time');
    lines.push('# TYPE response_time_p99_ms gauge');
    lines.push(`response_time_p99_ms ${metrics.responseTimeP99Ms}`);
    lines.push('');

    lines.push('# HELP error_rate_percent Percentage of 5xx responses');
    lines.push('# TYPE error_rate_percent gauge');
    lines.push(`error_rate_percent ${metrics.errorRatePercent.toFixed(2)}`);
    lines.push('');

    lines.push('# HELP requests_per_second Request rate (requests/second)');
    lines.push('# TYPE requests_per_second gauge');
    lines.push(`requests_per_second ${metrics.requestsPerSecond.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Calculate percentile value from sorted array
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Remove metrics older than the window
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    let i = 0;

    // Find first metric within window
    while (i < this.metrics.length && this.metrics[i].timestamp < cutoff) {
      i++;
    }

    // Remove old metrics
    if (i > 0) {
      this.metrics.splice(0, i);
    }
  }

  /**
   * Get raw metrics count (for testing)
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metrics.length = 0;
  }
}
