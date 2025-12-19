import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GovApiMetricsService } from './gov-api-metrics.service';
import { GovApiCache } from './utils/gov-api-cache';
import { GovApiSource } from './interfaces/gov-api.interface';

// Mock ioredis
jest.mock('ioredis', () => {
 return jest.fn().mockImplementation(() => ({
 get: jest.fn(),
 setex: jest.fn(),
 del: jest.fn(),
 keys: jest.fn().mockResolvedValue([]),
 quit: jest.fn().mockResolvedValue('OK'),
 connect: jest.fn().mockResolvedValue(undefined),
 on: jest.fn(),
 }));
});

describe('GovApiMetricsService', () => {
 let service: GovApiMetricsService;
 let cache: GovApiCache;

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [
 GovApiMetricsService,
 {
 provide: GovApiCache,
 useValue: {
 getStats: jest.fn().mockReturnValue({
 hits: 10,
 misses: 5,
 sets: 3,
 deletes: 1,
 errors: 0,
 hitRate: 0.67,
 }),
 },
 },
 {
 provide: ConfigService,
 useValue: {
 get: jest.fn().mockReturnValue(undefined),
 },
 },
 ],
 }).compile();

 service = module.get<GovApiMetricsService>(GovApiMetricsService);
 cache = module.get<GovApiCache>(GovApiCache);
 });

 afterEach(() => {
 service.reset();
 });

 describe('constructor', () => {
 it('should initialize metrics storage for all sources', () => {
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];

 sources.forEach((source) => {
 const metrics = service.getSourceMetrics(source);
 expect(metrics).toBeDefined();
 expect(metrics.requestsTotal).toBe(0);
 expect(metrics.circuitBreakerState).toBe(0);
 });
 });
 });

 describe('recordRequest()', () => {
 it('should record successful request', () => {
 service.recordRequest('pncp', 150, true);

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.requestsTotal).toBe(1);
 expect(metrics.requestsSuccess).toBe(1);
 expect(metrics.requestsFailure).toBe(0);
 });

 it('should record failed request', () => {
 service.recordRequest('pncp', 1000, false);

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.requestsTotal).toBe(1);
 expect(metrics.requestsSuccess).toBe(0);
 expect(metrics.requestsFailure).toBe(1);
 });

 it('should calculate average latency', () => {
 service.recordRequest('pncp', 100, true);
 service.recordRequest('pncp', 200, true);
 service.recordRequest('pncp', 300, true);

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.avgLatencyMs).toBe(200);
 });

 it('should track min and max latency', () => {
 service.recordRequest('pncp', 50, true);
 service.recordRequest('pncp', 150, true);
 service.recordRequest('pncp', 500, true);

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.minLatencyMs).toBe(50);
 expect(metrics.maxLatencyMs).toBe(500);
 });

 it('should handle multiple sources independently', () => {
 service.recordRequest('pncp', 100, true);
 service.recordRequest('comprasgov', 200, false);
 service.recordRequest('sinapi', 300, true);

 const pncpMetrics = service.getSourceMetrics('pncp');
 const comprasMetrics = service.getSourceMetrics('comprasgov');
 const sinapiMetrics = service.getSourceMetrics('sinapi');

 expect(pncpMetrics.requestsSuccess).toBe(1);
 expect(comprasMetrics.requestsFailure).toBe(1);
 expect(sinapiMetrics.requestsTotal).toBe(1);
 });
 });

 describe('recordFallbackToExa()', () => {
 it('should increment fallback counter', () => {
 service.recordFallbackToExa();
 service.recordFallbackToExa();
 service.recordFallbackToExa();

 const metrics = service.getMetrics();
 expect(metrics.fallbacksToExa).toBe(3);
 });
 });

 describe('updateCircuitBreakerState()', () => {
 it('should update circuit breaker state to closed (0)', () => {
 service.updateCircuitBreakerState('pncp', 'closed');

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.circuitBreakerState).toBe(0);
 });

 it('should update circuit breaker state to half-open (0.5)', () => {
 service.updateCircuitBreakerState('pncp', 'half-open');

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.circuitBreakerState).toBe(0.5);
 });

 it('should update circuit breaker state to open (1)', () => {
 service.updateCircuitBreakerState('pncp', 'open');

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.circuitBreakerState).toBe(1);
 });
 });

 describe('updateItemCount()', () => {
 it('should update item count for SINAPI', () => {
 service.updateItemCount('sinapi', 50000);

 const metrics = service.getSourceMetrics('sinapi');
 expect(metrics.itemsTotal).toBe(50000);
 });

 it('should update item count for SICRO', () => {
 service.updateItemCount('sicro', 30000);

 const metrics = service.getSourceMetrics('sicro');
 expect(metrics.itemsTotal).toBe(30000);
 });
 });

 describe('getMetrics()', () => {
 it('should return aggregated metrics for all sources', () => {
 service.recordRequest('pncp', 100, true);
 service.recordRequest('comprasgov', 200, true);
 service.recordFallbackToExa();

 const metrics = service.getMetrics();

 expect(metrics.sources).toHaveProperty('pncp');
 expect(metrics.sources).toHaveProperty('comprasgov');
 expect(metrics.sources).toHaveProperty('sinapi');
 expect(metrics.sources).toHaveProperty('sicro');
 expect(metrics.fallbacksToExa).toBe(1);
 expect(metrics.timestamp).toBeInstanceOf(Date);
 });

 it('should include cache stats from GovApiCache', () => {
 const metrics = service.getMetrics();

 expect(metrics.sources.pncp.cacheHits).toBe(10);
 expect(metrics.sources.pncp.cacheMisses).toBe(5);
 });
 });

 describe('getSourceMetrics()', () => {
 it('should return default values when no requests recorded', () => {
 const metrics = service.getSourceMetrics('pncp');

 expect(metrics.requestsTotal).toBe(0);
 expect(metrics.requestsSuccess).toBe(0);
 expect(metrics.requestsFailure).toBe(0);
 expect(metrics.avgLatencyMs).toBe(0);
 expect(metrics.minLatencyMs).toBe(0);
 expect(metrics.maxLatencyMs).toBe(0);
 expect(metrics.circuitBreakerState).toBe(0);
 });
 });

 describe('getPrometheusMetrics()', () => {
 beforeEach(() => {
 // Record some sample data
 service.recordRequest('pncp', 100, true);
 service.recordRequest('pncp', 200, false);
 service.recordRequest('comprasgov', 150, true);
 service.updateCircuitBreakerState('pncp', 'open');
 service.updateItemCount('sinapi', 50000);
 service.recordFallbackToExa();
 });

 it('should output Prometheus-compatible format', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain('# Government API Metrics');
 expect(output).toContain('# TYPE gov_api_requests_total counter');
 });

 it('should include request counters', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain(
 'gov_api_requests_total{source="pncp",status="success"} 1',
 );
 expect(output).toContain(
 'gov_api_requests_total{source="pncp",status="failure"} 1',
 );
 expect(output).toContain(
 'gov_api_requests_total{source="comprasgov",status="success"} 1',
 );
 });

 it('should include cache metrics', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain('gov_api_cache_hits_total{source="pncp"} 10');
 expect(output).toContain('gov_api_cache_misses_total{source="pncp"} 5');
 });

 it('should include latency metrics', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain(
 'gov_api_request_duration_ms{source="pncp",stat="avg"}',
 );
 expect(output).toContain(
 'gov_api_request_duration_ms{source="pncp",stat="min"}',
 );
 expect(output).toContain(
 'gov_api_request_duration_ms{source="pncp",stat="max"}',
 );
 });

 it('should include circuit breaker state', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain(
 'gov_api_circuit_breaker_state{source="pncp"} 1',
 );
 expect(output).toContain(
 'gov_api_circuit_breaker_state{source="comprasgov"} 0',
 );
 });

 it('should include item counts for SINAPI/SICRO', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain('gov_api_items_total{source="sinapi"} 50000');
 });

 it('should include fallback counter', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain('gov_api_fallback_to_exa_total 1');
 });

 it('should include cache hit rate', () => {
 const output = service.getPrometheusMetrics();

 expect(output).toContain('gov_api_cache_hit_rate{source="pncp"}');
 });
 });

 describe('getLatencyHistogram()', () => {
 it('should return histogram bucket counts', () => {
 service.recordRequest('pncp', 30, true);
 service.recordRequest('pncp', 80, true);
 service.recordRequest('pncp', 200, true);
 service.recordRequest('pncp', 600, true);
 service.recordRequest('pncp', 3000, true);

 const histogram = service.getLatencyHistogram('pncp');

 expect(histogram['le_50']).toBe(1); // 30ms <= 50ms
 expect(histogram['le_100']).toBe(2); // 30ms, 80ms <= 100ms
 expect(histogram['le_250']).toBe(3); // 30ms, 80ms, 200ms <= 250ms
 expect(histogram['le_1000']).toBe(4); // All except 3000ms
 expect(histogram['le_inf']).toBe(5); // All
 });

 it('should return empty buckets when no requests', () => {
 const histogram = service.getLatencyHistogram('pncp');

 expect(histogram['le_50']).toBe(0);
 expect(histogram['le_inf']).toBe(0);
 });
 });

 describe('reset()', () => {
 it('should reset all metrics to initial state', () => {
 service.recordRequest('pncp', 100, true);
 service.recordRequest('comprasgov', 200, true);
 service.recordFallbackToExa();
 service.updateCircuitBreakerState('pncp', 'open');
 service.updateItemCount('sinapi', 50000);

 service.reset();

 const metrics = service.getMetrics();
 expect(metrics.sources.pncp.requestsTotal).toBe(0);
 expect(metrics.sources.comprasgov.requestsTotal).toBe(0);
 expect(metrics.fallbacksToExa).toBe(0);
 expect(metrics.sources.pncp.circuitBreakerState).toBe(0);
 expect(metrics.sources.sinapi.itemsTotal).toBe(0);
 });
 });

 describe('metrics window cleanup', () => {
 it('should keep metrics within the window', () => {
 // Record some requests
 for (let i = 0; i < 10; i++) {
 service.recordRequest('pncp', 100 + i, true);
 }

 const metrics = service.getSourceMetrics('pncp');
 expect(metrics.requestsTotal).toBe(10);
 });
 });
});
