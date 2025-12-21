import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as client from 'prom-client';

/**
 * Prometheus Metrics Service (#860)
 *
 * Uses prom-client library for standard Prometheus metrics format.
 * Provides:
 * - Default Node.js metrics (CPU, memory, event loop)
 * - Custom application metrics (database, requests, business)
 * - Registry for centralized metric collection
 *
 * Metrics exposed at /api/metrics endpoint.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/860
 * @see https://github.com/siimon/prom-client
 */
@Injectable()
export class PrometheusMetricsService implements OnModuleInit {
  private readonly logger = new Logger(PrometheusMetricsService.name);
  private readonly registry: client.Registry;

  // Database metrics
  private readonly dbConnectionsActive: client.Gauge<string>;
  private readonly dbConnectionsTotal: client.Gauge<string>;
  private readonly dbConnectionsMax: client.Gauge<string>;

  // Memory metrics
  private readonly memoryUsageBytes: client.Gauge<string>;
  private readonly memoryRssBytes: client.Gauge<string>;

  // Process metrics
  private readonly uptimeSeconds: client.Gauge<string>;

  // HTTP Request metrics
  private readonly httpRequestsTotal: client.Counter<string>;
  private readonly httpRequestDuration: client.Histogram<string>;
  private readonly httpRequestsInProgress: client.Gauge<string>;

  // Error metrics
  private readonly errorsTotal: client.Counter<string>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    // Create a custom registry
    this.registry = new client.Registry();

    // Add default metrics (CPU, memory, event loop, GC)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'etp_express_',
    });

    // Database metrics
    this.dbConnectionsActive = new client.Gauge({
      name: 'etp_express_database_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    this.dbConnectionsTotal = new client.Gauge({
      name: 'etp_express_database_connections_total',
      help: 'Total number of database connections',
      registers: [this.registry],
    });

    this.dbConnectionsMax = new client.Gauge({
      name: 'etp_express_database_connections_max',
      help: 'Maximum number of database connections allowed',
      registers: [this.registry],
    });

    // Memory metrics
    this.memoryUsageBytes = new client.Gauge({
      name: 'etp_express_memory_heap_used_bytes',
      help: 'Node.js heap used in bytes',
      registers: [this.registry],
    });

    this.memoryRssBytes = new client.Gauge({
      name: 'etp_express_memory_rss_bytes',
      help: 'Node.js RSS memory in bytes',
      registers: [this.registry],
    });

    // Process metrics
    this.uptimeSeconds = new client.Gauge({
      name: 'etp_express_uptime_seconds',
      help: 'Process uptime in seconds',
      registers: [this.registry],
    });

    // HTTP Request metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'etp_express_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'etp_express_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInProgress = new client.Gauge({
      name: 'etp_express_http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method'],
      registers: [this.registry],
    });

    // Error metrics
    this.errorsTotal = new client.Counter({
      name: 'etp_express_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'code'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize metrics collection on module start
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('PrometheusMetricsService initialized with prom-client');

    // Set initial max connections
    this.dbConnectionsMax.set(100);

    // Start periodic metrics collection
    this.startMetricsCollection();
  }

  /**
   * Get the Prometheus registry
   */
  getRegistry(): client.Registry {
    return this.registry;
  }

  /**
   * Get metrics in Prometheus text format
   */
  async getMetrics(): Promise<string> {
    // Update dynamic metrics before returning
    await this.collectDynamicMetrics();
    return this.registry.metrics();
  }

  /**
   * Get metrics content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record an HTTP request
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const status = statusCode.toString();
    const normalizedPath = this.normalizePath(path);

    this.httpRequestsTotal.inc({ method, path: normalizedPath, status });
    this.httpRequestDuration.observe(
      { method, path: normalizedPath, status },
      durationSeconds,
    );
  }

  /**
   * Increment in-progress request count
   */
  incInProgressRequests(method: string): void {
    this.httpRequestsInProgress.inc({ method });
  }

  /**
   * Decrement in-progress request count
   */
  decInProgressRequests(method: string): void {
    this.httpRequestsInProgress.dec({ method });
  }

  /**
   * Record an error
   */
  recordError(type: string, code: string): void {
    this.errorsTotal.inc({ type, code });
  }

  /**
   * Collect dynamic metrics (database, memory)
   */
  private async collectDynamicMetrics(): Promise<void> {
    try {
      // Database metrics
      const activeResult = await this.dataSource.query(
        `SELECT count(*) as active FROM pg_stat_activity WHERE state = $1`,
        ['active'],
      );
      const totalResult = await this.dataSource.query(
        `SELECT count(*) as total FROM pg_stat_activity`,
      );

      this.dbConnectionsActive.set(parseInt(activeResult[0]?.active || '0'));
      this.dbConnectionsTotal.set(parseInt(totalResult[0]?.total || '0'));
    } catch {
      // Set to 0 if queries fail
      this.dbConnectionsActive.set(0);
      this.dbConnectionsTotal.set(0);
    }

    // Memory metrics
    const memUsage = process.memoryUsage();
    this.memoryUsageBytes.set(memUsage.heapUsed);
    this.memoryRssBytes.set(memUsage.rss);

    // Uptime
    this.uptimeSeconds.set(Math.floor(process.uptime()));
  }

  /**
   * Start periodic metrics collection (every 15 seconds)
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectDynamicMetrics().catch((err) => {
        this.logger.error('Error collecting metrics', err);
      });
    }, 15 * 1000);
  }

  /**
   * Normalize path for metrics labels (remove dynamic segments)
   */
  private normalizePath(path: string): string {
    return path
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      )
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '');
  }
}
