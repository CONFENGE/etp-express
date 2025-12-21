import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as client from 'prom-client';

/**
 * Prometheus Metrics Service (#860, #861)
 *
 * Uses prom-client library for standard Prometheus metrics format.
 * Provides:
 * - Default Node.js metrics (CPU, memory, event loop)
 * - Custom application metrics (database, requests)
 * - Business metrics (#861): ETP creation, LLM requests, generation duration, active users
 * - Registry for centralized metric collection
 *
 * Business metrics (#861):
 * - etp_express_etp_created_total: Counter for ETPs created (labels: status, organization_id)
 * - etp_express_llm_requests_total: Counter for LLM requests (labels: provider, model, status)
 * - etp_express_generation_duration_seconds: Histogram for generation duration (labels: type, provider)
 * - etp_express_active_users: Gauge for active users count
 *
 * Metrics exposed at /api/metrics endpoint.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/860
 * @see https://github.com/CONFENGE/etp-express/issues/861
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

  // Business metrics (#861)
  private readonly etpCreatedTotal: client.Counter<string>;
  private readonly llmRequestsTotal: client.Counter<string>;
  private readonly generationDurationSeconds: client.Histogram<string>;
  private readonly activeUsersGauge: client.Gauge<string>;

  // Business metrics (#862)
  private readonly sectionsGeneratedTotal: client.Counter<string>;
  private readonly sectionGenerationDuration: client.Histogram<string>;
  private readonly sectionEnrichmentSource: client.Counter<string>;
  private readonly bullmqJobsProcessedTotal: client.Counter<string>;
  private readonly bullmqJobsFailedTotal: client.Counter<string>;
  private readonly bullmqJobDuration: client.Histogram<string>;

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

    // Business metrics (#861)
    this.etpCreatedTotal = new client.Counter({
      name: 'etp_express_etp_created_total',
      help: 'Total number of ETPs created',
      labelNames: ['status', 'organization_id'],
      registers: [this.registry],
    });

    this.llmRequestsTotal = new client.Counter({
      name: 'etp_express_llm_requests_total',
      help: 'Total number of LLM requests',
      labelNames: ['provider', 'model', 'status'],
      registers: [this.registry],
    });

    this.generationDurationSeconds = new client.Histogram({
      name: 'etp_express_generation_duration_seconds',
      help: 'Duration of content generation in seconds',
      labelNames: ['type', 'provider'],
      buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.activeUsersGauge = new client.Gauge({
      name: 'etp_express_active_users',
      help: 'Number of active users (logged in within last 15 minutes)',
      registers: [this.registry],
    });

    // Business metrics (#862) - Section generation
    this.sectionsGeneratedTotal = new client.Counter({
      name: 'etp_express_sections_generated_total',
      help: 'Total number of ETP sections generated',
      labelNames: ['section_type', 'status'],
      registers: [this.registry],
    });

    this.sectionGenerationDuration = new client.Histogram({
      name: 'etp_express_section_generation_duration_seconds',
      help: 'ETP section generation duration in seconds',
      labelNames: ['section_type'],
      buckets: [1, 5, 10, 20, 30, 45, 60, 90, 120],
      registers: [this.registry],
    });

    this.sectionEnrichmentSource = new client.Counter({
      name: 'etp_express_section_enrichment_source_total',
      help: 'Count of enrichment sources used during section generation',
      labelNames: ['source'],
      registers: [this.registry],
    });

    // Business metrics (#862) - BullMQ job processing
    this.bullmqJobsProcessedTotal = new client.Counter({
      name: 'etp_express_bullmq_jobs_processed_total',
      help: 'Total number of BullMQ jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.bullmqJobsFailedTotal = new client.Counter({
      name: 'etp_express_bullmq_jobs_failed_total',
      help: 'Total number of BullMQ jobs that failed',
      labelNames: ['queue', 'error_type'],
      registers: [this.registry],
    });

    this.bullmqJobDuration = new client.Histogram({
      name: 'etp_express_bullmq_job_duration_seconds',
      help: 'BullMQ job processing duration in seconds',
      labelNames: ['queue'],
      buckets: [1, 5, 10, 20, 30, 45, 60, 90, 120, 180],
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

  // ==================== Business Metrics (#861) ====================

  /**
   * Record ETP creation
   * @param status - Initial ETP status (usually 'draft')
   * @param organizationId - Organization ID for multi-tenancy tracking
   */
  recordEtpCreated(status: string, organizationId: string): void {
    this.etpCreatedTotal.inc({ status, organization_id: organizationId });
  }

  /**
   * Record LLM request
   * @param provider - LLM provider (openai, exa, etc.)
   * @param model - Model used (gpt-4o, gpt-4o-mini, etc.)
   * @param status - Request status (success, error, timeout)
   */
  recordLlmRequest(provider: string, model: string, status: string): void {
    this.llmRequestsTotal.inc({ provider, model, status });
  }

  /**
   * Record content generation duration
   * @param type - Type of generation (section, summary, research)
   * @param provider - Provider used (openai, exa)
   * @param durationSeconds - Duration in seconds
   */
  recordGenerationDuration(
    type: string,
    provider: string,
    durationSeconds: number,
  ): void {
    this.generationDurationSeconds.observe({ type, provider }, durationSeconds);
  }

  /**
   * Set active users count
   * @param count - Number of active users
   */
  setActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  /**
   * Record a section generation (#862)
   *
   * @param sectionType - Type of section generated (e.g., 'justificativa', 'orcamento')
   * @param status - Generation status ('success' or 'error')
   * @param durationSeconds - Time taken to generate the section
   */
  recordSectionGeneration(
    sectionType: string,
    status: 'success' | 'error',
    durationSeconds: number,
  ): void {
    this.sectionsGeneratedTotal.inc({ section_type: sectionType, status });
    if (status === 'success') {
      this.sectionGenerationDuration.observe(
        { section_type: sectionType },
        durationSeconds,
      );
    }
  }

  /**
   * Record the enrichment source used during section generation (#862)
   *
   * @param source - Enrichment source ('gov-api', 'exa', 'mixed', or 'none')
   */
  recordEnrichmentSource(source: 'gov-api' | 'exa' | 'mixed' | 'none'): void {
    this.sectionEnrichmentSource.inc({ source });
  }

  /**
   * Record a BullMQ job processing result (#862)
   *
   * @param queue - Queue name (e.g., 'sections')
   * @param status - Job status ('completed' or 'failed')
   * @param durationSeconds - Job processing duration
   * @param errorType - Optional error type if job failed
   */
  recordBullMQJob(
    queue: string,
    status: 'completed' | 'failed',
    durationSeconds: number,
    errorType?: string,
  ): void {
    this.bullmqJobsProcessedTotal.inc({ queue, status });
    this.bullmqJobDuration.observe({ queue }, durationSeconds);

    if (status === 'failed' && errorType) {
      this.bullmqJobsFailedTotal.inc({ queue, error_type: errorType });
    }
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

    // Active users (#861) - users who logged in within last 15 minutes
    try {
      const activeUsersResult = await this.dataSource.query(
        `SELECT count(*) as count FROM "user" WHERE "lastLoginAt" > NOW() - INTERVAL '15 minutes'`,
      );
      this.activeUsersGauge.set(parseInt(activeUsersResult[0]?.count || '0'));
    } catch {
      // Table might not have lastLoginAt column, or query fails - set to 0
      this.activeUsersGauge.set(0);
    }
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
