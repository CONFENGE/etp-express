import { Test, TestingModule } from '@nestjs/testing';
import { RequestMetricsCollector } from './request-metrics.collector';

describe('RequestMetricsCollector', () => {
  let collector: RequestMetricsCollector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestMetricsCollector],
    }).compile();

    collector = module.get<RequestMetricsCollector>(RequestMetricsCollector);
    collector.clear();
  });

  describe('recordRequest', () => {
    it('should record a request metric', () => {
      collector.recordRequest({
        path: '/api/health',
        statusCode: 200,
        responseTimeMs: 50,
        timestamp: Date.now(),
      });

      expect(collector.getMetricsCount()).toBe(1);
    });

    it('should record multiple request metrics', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordRequest({
          path: '/api/etps',
          statusCode: 200,
          responseTimeMs: 50 + i * 10,
          timestamp: Date.now(),
        });
      }

      expect(collector.getMetricsCount()).toBe(10);
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return zero metrics when no requests recorded', () => {
      const metrics = collector.getAggregatedMetrics();

      expect(metrics.requestCount).toBe(0);
      expect(metrics.responseTimeP50Ms).toBe(0);
      expect(metrics.responseTimeP95Ms).toBe(0);
      expect(metrics.responseTimeP99Ms).toBe(0);
      expect(metrics.errorRatePercent).toBe(0);
      expect(metrics.requestsPerSecond).toBe(0);
    });

    it('should calculate correct percentiles', () => {
      // Record 100 requests with response times 1-100ms
      for (let i = 1; i <= 100; i++) {
        collector.recordRequest({
          path: '/api/test',
          statusCode: 200,
          responseTimeMs: i,
          timestamp: Date.now(),
        });
      }

      const metrics = collector.getAggregatedMetrics();

      expect(metrics.requestCount).toBe(100);
      expect(metrics.responseTimeP50Ms).toBe(50);
      expect(metrics.responseTimeP95Ms).toBe(95);
      expect(metrics.responseTimeP99Ms).toBe(99);
    });

    it('should calculate error rate correctly', () => {
      // Record 80 successful requests and 20 errors
      for (let i = 0; i < 80; i++) {
        collector.recordRequest({
          path: '/api/test',
          statusCode: 200,
          responseTimeMs: 50,
          timestamp: Date.now(),
        });
      }

      for (let i = 0; i < 20; i++) {
        collector.recordRequest({
          path: '/api/test',
          statusCode: 500,
          responseTimeMs: 100,
          timestamp: Date.now(),
        });
      }

      const metrics = collector.getAggregatedMetrics();

      expect(metrics.requestCount).toBe(100);
      expect(metrics.errorRatePercent).toBe(20);
    });

    it('should include 4xx errors as non-errors', () => {
      // 4xx are client errors, not server errors
      collector.recordRequest({
        path: '/api/test',
        statusCode: 404,
        responseTimeMs: 10,
        timestamp: Date.now(),
      });

      collector.recordRequest({
        path: '/api/test',
        statusCode: 400,
        responseTimeMs: 10,
        timestamp: Date.now(),
      });

      const metrics = collector.getAggregatedMetrics();

      expect(metrics.errorRatePercent).toBe(0);
    });

    it('should count 5xx as server errors', () => {
      collector.recordRequest({
        path: '/api/test',
        statusCode: 500,
        responseTimeMs: 100,
        timestamp: Date.now(),
      });

      collector.recordRequest({
        path: '/api/test',
        statusCode: 503,
        responseTimeMs: 200,
        timestamp: Date.now(),
      });

      const metrics = collector.getAggregatedMetrics();

      expect(metrics.errorRatePercent).toBe(100);
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus-formatted string', () => {
      collector.recordRequest({
        path: '/api/test',
        statusCode: 200,
        responseTimeMs: 50,
        timestamp: Date.now(),
      });

      const prometheusOutput = collector.getPrometheusMetrics();

      expect(prometheusOutput).toContain('# HELP request_count_total');
      expect(prometheusOutput).toContain('# TYPE request_count_total gauge');
      expect(prometheusOutput).toContain('request_count_total 1');

      expect(prometheusOutput).toContain('# HELP response_time_p50_ms');
      expect(prometheusOutput).toContain('response_time_p50_ms 50');

      expect(prometheusOutput).toContain('# HELP response_time_p95_ms');
      expect(prometheusOutput).toContain('# HELP response_time_p99_ms');
      expect(prometheusOutput).toContain('# HELP error_rate_percent');
      expect(prometheusOutput).toContain('# HELP requests_per_second');
    });
  });

  describe('sliding window cleanup', () => {
    it('should remove old metrics outside the window', async () => {
      // Record a request with old timestamp (6 minutes ago)
      const oldTimestamp = Date.now() - 6 * 60 * 1000;
      collector.recordRequest({
        path: '/api/old',
        statusCode: 200,
        responseTimeMs: 50,
        timestamp: oldTimestamp,
      });

      // Record a current request
      collector.recordRequest({
        path: '/api/current',
        statusCode: 200,
        responseTimeMs: 100,
        timestamp: Date.now(),
      });

      const metrics = collector.getAggregatedMetrics();

      // Only the current request should be counted
      expect(metrics.requestCount).toBe(1);
      expect(metrics.responseTimeP50Ms).toBe(100);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      collector.recordRequest({
        path: '/api/test',
        statusCode: 200,
        responseTimeMs: 50,
        timestamp: Date.now(),
      });

      expect(collector.getMetricsCount()).toBe(1);

      collector.clear();

      expect(collector.getMetricsCount()).toBe(0);
    });
  });
});
