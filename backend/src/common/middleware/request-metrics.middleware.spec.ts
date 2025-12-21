import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { RequestMetricsMiddleware } from './request-metrics.middleware';
import { RequestMetricsCollector } from '../../health/request-metrics.collector';

describe('RequestMetricsMiddleware', () => {
  let middleware: RequestMetricsMiddleware;
  let collector: RequestMetricsCollector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestMetricsMiddleware, RequestMetricsCollector],
    }).compile();

    middleware = module.get<RequestMetricsMiddleware>(RequestMetricsMiddleware);
    collector = module.get<RequestMetricsCollector>(RequestMetricsCollector);
    collector.clear();
  });

  const createMockRequest = (path: string): Partial<Request> => ({
    path,
    method: 'GET',
  });

  const createMockResponse = (statusCode = 200) => {
    const listeners: { [key: string]: Function } = {};
    return {
      statusCode,
      on: jest.fn((event: string, callback: Function) => {
        listeners[event] = callback;
        return {} as Response;
      }),
      triggerFinish: () => {
        if (listeners['finish']) {
          listeners['finish']();
        }
      },
    };
  };

  describe('use', () => {
    it('should record request on response finish', () => {
      const req = createMockRequest('/api/health');
      const res = createMockResponse(200);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);

      expect(next).toHaveBeenCalled();
      expect(collector.getMetricsCount()).toBe(0);

      // Simulate response finish
      res.triggerFinish();

      expect(collector.getMetricsCount()).toBe(1);
    });

    it('should record correct status code', () => {
      const req = createMockRequest('/api/test');
      const res = createMockResponse(404);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);
      res.triggerFinish();

      const metrics = collector.getAggregatedMetrics();
      expect(metrics.errorRatePercent).toBe(0); // 404 is not a 5xx error
    });

    it('should record 5xx as error', () => {
      const req = createMockRequest('/api/test');
      const res = createMockResponse(500);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);
      res.triggerFinish();

      const metrics = collector.getAggregatedMetrics();
      expect(metrics.errorRatePercent).toBe(100);
    });

    it('should normalize UUID paths', () => {
      const req = createMockRequest(
        '/api/etps/550e8400-e29b-41d4-a716-446655440000',
      );
      const res = createMockResponse(200);
      const next = jest.fn();

      // We can't directly check the normalized path, but we can verify
      // that high cardinality paths are handled correctly
      middleware.use(req as Request, res as unknown as Response, next);
      res.triggerFinish();

      expect(collector.getMetricsCount()).toBe(1);
    });

    it('should normalize numeric ID paths', () => {
      const req = createMockRequest('/api/users/12345');
      const res = createMockResponse(200);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);
      res.triggerFinish();

      expect(collector.getMetricsCount()).toBe(1);
    });

    it('should not normalize non-API paths', () => {
      const req = createMockRequest('/health');
      const res = createMockResponse(200);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);
      res.triggerFinish();

      expect(collector.getMetricsCount()).toBe(1);
    });
  });

  describe('response time tracking', () => {
    it('should record response time', async () => {
      const req = createMockRequest('/api/test');
      const res = createMockResponse(200);
      const next = jest.fn();

      middleware.use(req as Request, res as unknown as Response, next);

      // Simulate some processing time (50ms for reliable CI timing)
      await new Promise((resolve) => setTimeout(resolve, 50));

      res.triggerFinish();

      const metrics = collector.getAggregatedMetrics();
      // Use 30ms threshold (60% of delay) to account for timer imprecision on CI runners
      expect(metrics.responseTimeP50Ms).toBeGreaterThanOrEqual(30);
    });
  });
});
