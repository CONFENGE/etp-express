/**
 * Government API Metrics Service
 *
 * Centralizes metrics collection for all government API integrations:
 * - PNCP, Compras.gov.br, SINAPI, SICRO
 *
 * Metrics exported:
 * - Request counters (success/failure) per source
 * - Cache hit/miss counters per source
 * - Request latency histograms per source
 * - Circuit breaker state per source
 * - Fallback usage counter
 *
 * @module modules/gov-api
 * @see https://github.com/CONFENGE/etp-express/issues/699
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GovApiSource } from './interfaces/gov-api.interface';
import { GovApiCache } from './utils/gov-api-cache';

/**
 * Metrics data for a single gov-api source
 */
export interface GovApiSourceMetrics {
 /** Total requests made to this source */
 requestsTotal: number;
 /** Successful requests */
 requestsSuccess: number;
 /** Failed requests */
 requestsFailure: number;
 /** Cache hits */
 cacheHits: number;
 /** Cache misses */
 cacheMisses: number;
 /** Average latency in milliseconds */
 avgLatencyMs: number;
 /** Min latency recorded */
 minLatencyMs: number;
 /** Max latency recorded */
 maxLatencyMs: number;
 /** Circuit breaker state: 0=closed, 0.5=half-open, 1=open */
 circuitBreakerState: number;
 /** Total items in SINAPI/SICRO (for price tables) */
 itemsTotal?: number;
}

/**
 * Aggregated metrics for all gov-api sources
 */
export interface GovApiMetrics {
 /** Metrics per source */
 sources: Record<GovApiSource, GovApiSourceMetrics>;
 /** Total fallbacks to Exa */
 fallbacksToExa: number;
 /** Timestamp of metrics collection */
 timestamp: Date;
}

/**
 * Internal metric storage for request tracking
 */
interface RequestMetric {
 timestamp: number;
 latencyMs: number;
 success: boolean;
}

/**
 * Histogram bucket thresholds for latency (in ms)
 */
const LATENCY_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * GovApiMetricsService - Centralized metrics for government API integrations
 *
 * Provides:
 * - Request tracking with success/failure counters
 * - Latency histogram with percentiles
 * - Cache efficiency metrics
 * - Circuit breaker state monitoring
 * - Prometheus-compatible output format
 *
 * @example
 * ```typescript
 * // Record a successful request
 * metricsService.recordRequest('pncp', 150, true);
 *
 * // Get all metrics
 * const metrics = metricsService.getMetrics();
 *
 * // Get Prometheus format
 * const prometheusOutput = metricsService.getPrometheusMetrics();
 * ```
 */
@Injectable()
export class GovApiMetricsService implements OnModuleInit {
 private readonly logger = new Logger(GovApiMetricsService.name);

 /** Request metrics storage per source */
 private readonly requestMetrics: Map<GovApiSource, RequestMetric[]> =
 new Map();

 /** Fallback counter */
 private fallbacksToExa = 0;

 /** Circuit breaker states cache */
 private circuitBreakerStates: Map<GovApiSource, number> = new Map();

 /** Item counts for SINAPI/SICRO */
 private itemCounts: Map<GovApiSource, number> = new Map();

 /** Max metrics history to retain (sliding window) */
 private readonly MAX_METRICS_HISTORY = 1000;

 /** Metrics retention window in ms (1 hour) */
 private readonly METRICS_WINDOW_MS = 3600000;

 constructor(private readonly cache: GovApiCache) {
 // Initialize metrics storage for each source
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];
 sources.forEach((source) => {
 this.requestMetrics.set(source, []);
 this.circuitBreakerStates.set(source, 0); // closed by default
 });
 }

 /**
 * Initialize service and log startup
 */
 onModuleInit(): void {
 this.logger.log('GovApiMetricsService initialized');
 }

 /**
 * Record a request metric for a source
 *
 * @param source - API source
 * @param latencyMs - Request latency in milliseconds
 * @param success - Whether request was successful
 */
 recordRequest(
 source: GovApiSource,
 latencyMs: number,
 success: boolean,
 ): void {
 const metrics = this.requestMetrics.get(source);
 if (!metrics) return;

 const now = Date.now();

 // Add new metric
 metrics.push({
 timestamp: now,
 latencyMs,
 success,
 });

 // Cleanup old metrics (sliding window)
 this.cleanupOldMetrics(source);
 }

 /**
 * Record a fallback to Exa
 */
 recordFallbackToExa(): void {
 this.fallbacksToExa++;
 this.logger.debug(
 `Fallback to Exa recorded. Total: ${this.fallbacksToExa}`,
 );
 }

 /**
 * Update circuit breaker state for a source
 *
 * @param source - API source
 * @param state - Circuit state: 'closed' | 'half-open' | 'open'
 */
 updateCircuitBreakerState(
 source: GovApiSource,
 state: 'closed' | 'half-open' | 'open',
 ): void {
 const stateValue = state === 'closed' ? 0 : state === 'half-open' ? 0.5 : 1;
 this.circuitBreakerStates.set(source, stateValue);
 }

 /**
 * Update item count for SINAPI/SICRO
 *
 * @param source - API source (sinapi or sicro)
 * @param count - Number of items
 */
 updateItemCount(source: 'sinapi' | 'sicro', count: number): void {
 this.itemCounts.set(source, count);
 }

 /**
 * Get aggregated metrics for all sources
 *
 * @returns Complete metrics object
 */
 getMetrics(): GovApiMetrics {
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];
 const metricsResult: Record<string, GovApiSourceMetrics> = {};

 for (const source of sources) {
 metricsResult[source] = this.getSourceMetrics(source);
 }

 return {
 sources: metricsResult as Record<GovApiSource, GovApiSourceMetrics>,
 fallbacksToExa: this.fallbacksToExa,
 timestamp: new Date(),
 };
 }

 /**
 * Get metrics for a specific source
 *
 * @param source - API source
 * @returns Source-specific metrics
 */
 getSourceMetrics(source: GovApiSource): GovApiSourceMetrics {
 const metrics = this.requestMetrics.get(source) || [];

 // Calculate request counts
 const requestsTotal = metrics.length;
 const requestsSuccess = metrics.filter((m) => m.success).length;
 const requestsFailure = metrics.filter((m) => !m.success).length;

 // Calculate latency stats
 const latencies = metrics.map((m) => m.latencyMs);
 const avgLatencyMs =
 latencies.length > 0
 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
 : 0;
 const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0;
 const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0;

 // Get cache stats
 const cacheStats = this.cache.getStats(source);

 // Get circuit breaker state
 const circuitBreakerState = this.circuitBreakerStates.get(source) || 0;

 // Build result
 const result: GovApiSourceMetrics = {
 requestsTotal,
 requestsSuccess,
 requestsFailure,
 cacheHits: cacheStats.hits,
 cacheMisses: cacheStats.misses,
 avgLatencyMs,
 minLatencyMs,
 maxLatencyMs,
 circuitBreakerState,
 };

 // Add item count for SINAPI/SICRO
 if (source === 'sinapi' || source === 'sicro') {
 result.itemsTotal = this.itemCounts.get(source) || 0;
 }

 return result;
 }

 /**
 * Get metrics in Prometheus text format
 *
 * @returns Prometheus-compatible metrics string
 */
 getPrometheusMetrics(): string {
 const lines: string[] = [];
 const metrics = this.getMetrics();

 lines.push('# Government API Metrics');
 lines.push('# Generated: ' + new Date().toISOString());
 lines.push('');

 // Request totals per source
 lines.push(
 '# HELP gov_api_requests_total Total requests by source and status',
 );
 lines.push('# TYPE gov_api_requests_total counter');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 lines.push(
 `gov_api_requests_total{source="${source}",status="success"} ${sourceMetrics.requestsSuccess}`,
 );
 lines.push(
 `gov_api_requests_total{source="${source}",status="failure"} ${sourceMetrics.requestsFailure}`,
 );
 }
 lines.push('');

 // Cache metrics per source
 lines.push('# HELP gov_api_cache_hits_total Cache hits by source');
 lines.push('# TYPE gov_api_cache_hits_total counter');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 lines.push(
 `gov_api_cache_hits_total{source="${source}"} ${sourceMetrics.cacheHits}`,
 );
 }
 lines.push('');

 lines.push('# HELP gov_api_cache_misses_total Cache misses by source');
 lines.push('# TYPE gov_api_cache_misses_total counter');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 lines.push(
 `gov_api_cache_misses_total{source="${source}"} ${sourceMetrics.cacheMisses}`,
 );
 }
 lines.push('');

 // Latency metrics per source
 lines.push(
 '# HELP gov_api_request_duration_ms Average request duration in milliseconds',
 );
 lines.push('# TYPE gov_api_request_duration_ms gauge');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 lines.push(
 `gov_api_request_duration_ms{source="${source}",stat="avg"} ${sourceMetrics.avgLatencyMs}`,
 );
 lines.push(
 `gov_api_request_duration_ms{source="${source}",stat="min"} ${sourceMetrics.minLatencyMs}`,
 );
 lines.push(
 `gov_api_request_duration_ms{source="${source}",stat="max"} ${sourceMetrics.maxLatencyMs}`,
 );
 }
 lines.push('');

 // Circuit breaker state per source
 lines.push(
 '# HELP gov_api_circuit_breaker_state Circuit breaker state (0=closed, 0.5=half-open, 1=open)',
 );
 lines.push('# TYPE gov_api_circuit_breaker_state gauge');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 lines.push(
 `gov_api_circuit_breaker_state{source="${source}"} ${sourceMetrics.circuitBreakerState}`,
 );
 }
 lines.push('');

 // Item counts for SINAPI/SICRO
 lines.push(
 '# HELP gov_api_items_total Total items loaded for price tables',
 );
 lines.push('# TYPE gov_api_items_total gauge');
 if (metrics.sources.sinapi.itemsTotal !== undefined) {
 lines.push(
 `gov_api_items_total{source="sinapi"} ${metrics.sources.sinapi.itemsTotal}`,
 );
 }
 if (metrics.sources.sicro.itemsTotal !== undefined) {
 lines.push(
 `gov_api_items_total{source="sicro"} ${metrics.sources.sicro.itemsTotal}`,
 );
 }
 lines.push('');

 // Fallback counter
 lines.push(
 '# HELP gov_api_fallback_to_exa_total Fallbacks to Exa when gov sources insufficient',
 );
 lines.push('# TYPE gov_api_fallback_to_exa_total counter');
 lines.push(`gov_api_fallback_to_exa_total ${metrics.fallbacksToExa}`);
 lines.push('');

 // Cache hit rate per source (calculated)
 lines.push('# HELP gov_api_cache_hit_rate Cache hit rate by source (0-1)');
 lines.push('# TYPE gov_api_cache_hit_rate gauge');
 for (const [source, sourceMetrics] of Object.entries(metrics.sources)) {
 const total = sourceMetrics.cacheHits + sourceMetrics.cacheMisses;
 const hitRate = total > 0 ? sourceMetrics.cacheHits / total : 0;
 lines.push(
 `gov_api_cache_hit_rate{source="${source}"} ${hitRate.toFixed(4)}`,
 );
 }
 lines.push('');

 return lines.join('\n');
 }

 /**
 * Get latency histogram buckets for a source
 *
 * @param source - API source
 * @returns Histogram bucket counts
 */
 getLatencyHistogram(source: GovApiSource): Record<string, number> {
 const metrics = this.requestMetrics.get(source) || [];
 const latencies = metrics.map((m) => m.latencyMs);

 const histogram: Record<string, number> = {};

 // Count values in each bucket
 for (const bucket of LATENCY_BUCKETS) {
 histogram[`le_${bucket}`] = latencies.filter((l) => l <= bucket).length;
 }
 histogram['le_inf'] = latencies.length;

 return histogram;
 }

 /**
 * Reset all metrics (for testing)
 */
 reset(): void {
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];
 sources.forEach((source) => {
 this.requestMetrics.set(source, []);
 this.circuitBreakerStates.set(source, 0);
 });
 this.fallbacksToExa = 0;
 this.itemCounts.clear();
 this.logger.debug('Metrics reset');
 }

 /**
 * Cleanup old metrics outside the retention window
 */
 private cleanupOldMetrics(source: GovApiSource): void {
 const metrics = this.requestMetrics.get(source);
 if (!metrics) return;

 const now = Date.now();
 const cutoff = now - this.METRICS_WINDOW_MS;

 // Remove metrics older than the window
 const filtered = metrics.filter((m) => m.timestamp > cutoff);

 // Also enforce max history limit
 if (filtered.length > this.MAX_METRICS_HISTORY) {
 filtered.splice(0, filtered.length - this.MAX_METRICS_HISTORY);
 }

 this.requestMetrics.set(source, filtered);
 }
}
