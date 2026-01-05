/**
 * Redis Failure Resilience Chaos Test
 *
 * Tests system behavior when Redis becomes unavailable:
 * - Graceful fallback when Redis is down
 * - Proper error logging and metrics tracking
 * - Automatic recovery when Redis comes back
 * - No crash on connection timeout
 *
 * @see Issue #1207 - [CHAOS-1074a] Test: Redis failure resilience
 * @see Issue #1074 - [QA] Implementar chaos engineering
 */

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SemanticCacheService } from '../semantic-cache.service';
import { GovApiCache } from '../../gov-api/utils/gov-api-cache';

// Create separate mock instances for each service
const createMockRedis = () => {
  const eventHandlers: Record<string, Function> = {};

  return {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    quit: jest.fn().mockResolvedValue('OK'),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    exists: jest.fn().mockResolvedValue(0),
    on: jest.fn().mockImplementation(function (
      this: unknown,
      event: string,
      handler: Function,
    ) {
      eventHandlers[event] = handler;
      return this;
    }),
    _eventHandlers: eventHandlers,
    // Helper to simulate events
    simulateEvent: (event: string, ...args: unknown[]) => {
      if (eventHandlers[event]) {
        eventHandlers[event](...args);
      }
    },
  };
};

let mockRedisInstances: ReturnType<typeof createMockRedis>[] = [];
let mockInstanceIndex = 0;

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const instance = mockRedisInstances[mockInstanceIndex] || createMockRedis();
    mockRedisInstances[mockInstanceIndex] = instance;
    mockInstanceIndex++;
    return instance;
  });
});

describe('Redis Failure Resilience - Chaos Engineering Tests', () => {
  let semanticCache: SemanticCacheService;
  let govApiCache: GovApiCache;
  let configService: ConfigService;
  let loggerErrorSpy: jest.SpyInstance;
  let semanticCacheRedis: ReturnType<typeof createMockRedis>;
  let govApiCacheRedis: ReturnType<typeof createMockRedis>;

  const mockRedisConfig = {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
  };

  beforeEach(async () => {
    // Reset mock instances
    mockRedisInstances = [];
    mockInstanceIndex = 0;

    // Pre-create mock instances
    semanticCacheRedis = createMockRedis();
    govApiCacheRedis = createMockRedis();
    mockRedisInstances = [semanticCacheRedis, govApiCacheRedis];

    // Setup config service
    configService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          if (key === 'redis') {
            return mockRedisConfig;
          }
          return defaultValue;
        }),
    } as unknown as ConfigService;

    // Spy on Logger before creating services
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Create services
    semanticCache = new SemanticCacheService(configService);
    govApiCache = new GovApiCache(configService);

    // Simulate successful initial connection for both
    semanticCacheRedis.simulateEvent('connect');
    govApiCacheRedis.simulateEvent('connect');
  });

  afterEach(async () => {
    await semanticCache.onModuleDestroy();
    await govApiCache.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('SemanticCacheService - Redis Failure Scenarios', () => {
    describe('when Redis is down', () => {
      it('should return null on get when Redis is disconnected', async () => {
        // Simulate Redis going down
        semanticCacheRedis.simulateEvent('close');

        // Attempt to get cached value
        const result = await semanticCache.get<string>('openai', 'test-key');

        // Should return null (graceful fallback)
        expect(result).toBeNull();

        // Stats should track the miss
        const stats = semanticCache.getStats('openai');
        expect(stats.misses).toBeGreaterThan(0);
      });

      it('should silently fail on set when Redis is disconnected', async () => {
        // Simulate Redis going down
        semanticCacheRedis.simulateEvent('close');

        // Reset mock to verify it's not called
        semanticCacheRedis.setex.mockClear();

        // Attempt to set value - should not throw
        await expect(
          semanticCache.set('openai', 'test-key', { data: 'test' }),
        ).resolves.not.toThrow();

        // Redis setex should not have been called
        expect(semanticCacheRedis.setex).not.toHaveBeenCalled();
      });

      it('should report unhealthy status when Redis is down', async () => {
        // Simulate Redis going down
        semanticCacheRedis.simulateEvent('close');

        const health = await semanticCache.healthCheck();

        expect(health.status).toBe('unhealthy');
        expect(health.connected).toBe(false);
      });

      it('should indicate unavailable when Redis is down', () => {
        // Simulate Redis going down
        semanticCacheRedis.simulateEvent('close');

        expect(semanticCache.isAvailable()).toBe(false);
      });
    });

    describe('when Redis connection has errors', () => {
      it('should log error and continue operation on Redis error event', async () => {
        const testError = new Error('Connection refused');

        // Simulate Redis error
        semanticCacheRedis.simulateEvent('error', testError);

        // Should log the error
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Connection refused'),
        );

        // Service should still be responsive (not crashed)
        expect(semanticCache.isAvailable()).toBe(false);
      });

      it('should track errors in statistics on get failure', async () => {
        // Service is connected, but get throws an error
        semanticCacheRedis.get.mockRejectedValueOnce(new Error('ECONNRESET'));

        const result = await semanticCache.get<string>('openai', 'test-key');

        // Should return null
        expect(result).toBeNull();

        // Stats should track the error
        const stats = semanticCache.getStats('openai');
        expect(stats.errors).toBeGreaterThan(0);
      });

      it('should track errors in statistics on set failure', async () => {
        // Service is connected, but setex throws an error
        semanticCacheRedis.setex.mockRejectedValueOnce(new Error('ECONNRESET'));

        // Should not throw
        await expect(
          semanticCache.set('openai', 'test-key', { data: 'test' }),
        ).resolves.not.toThrow();

        // Stats should track the error
        const stats = semanticCache.getStats('openai');
        expect(stats.errors).toBeGreaterThan(0);
      });
    });

    describe('when Redis recovers', () => {
      it('should automatically recover when Redis reconnects', async () => {
        // Start disconnected
        semanticCacheRedis.simulateEvent('close');
        expect(semanticCache.isAvailable()).toBe(false);

        // Simulate reconnection
        semanticCacheRedis.simulateEvent('connect');
        expect(semanticCache.isAvailable()).toBe(true);

        // Should be able to get/set again
        semanticCacheRedis.get.mockResolvedValueOnce(
          JSON.stringify({ cached: true }),
        );

        const result = await semanticCache.get<{ cached: boolean }>(
          'openai',
          'test-key',
        );
        expect(result).toEqual({ cached: true });
      });

      it('should report healthy status after recovery', async () => {
        // Start disconnected
        semanticCacheRedis.simulateEvent('close');

        // Simulate reconnection
        semanticCacheRedis.simulateEvent('connect');

        const health = await semanticCache.healthCheck();

        expect(health.status).toBe('healthy');
        expect(health.connected).toBe(true);
        expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('when Redis connection times out', () => {
      it('should not hang process on connection timeout', async () => {
        // This test verifies that the service constructor doesn't block
        // even if Redis connection never completes (lazyConnect)
        const startTime = Date.now();

        // Create a new service with connection that never resolves
        const slowRedis = createMockRedis();
        slowRedis.connect.mockImplementation(
          () => new Promise(() => {}), // Never resolves
        );
        mockRedisInstances.push(slowRedis);

        const newService = new SemanticCacheService(configService);

        const elapsed = Date.now() - startTime;

        // Should not block - constructor should complete quickly
        expect(elapsed).toBeLessThan(1000);

        await newService.onModuleDestroy();
      });

      it('should not hang on get operation when Redis is slow', async () => {
        // Simulate slow Redis response
        semanticCacheRedis.get.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(null), 50);
            }),
        );

        const startTime = Date.now();
        const result = await semanticCache.get<string>('openai', 'test-key');
        const elapsed = Date.now() - startTime;

        expect(result).toBeNull();
        expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });
  });

  describe('GovApiCache - Redis Failure Scenarios', () => {
    describe('when Redis is down', () => {
      it('should return null on get when Redis is disconnected', async () => {
        // Simulate Redis going down
        govApiCacheRedis.simulateEvent('close');

        const result = await govApiCache.get<string>('pncp', 'test-key');

        expect(result).toBeNull();

        const stats = govApiCache.getStats('pncp');
        expect(stats.misses).toBeGreaterThan(0);
      });

      it('should silently fail on set when Redis is disconnected', async () => {
        // Simulate Redis going down
        govApiCacheRedis.simulateEvent('close');

        // Reset mock to verify it's not called
        govApiCacheRedis.setex.mockClear();

        await expect(
          govApiCache.set('pncp', 'test-key', { data: 'test' }),
        ).resolves.not.toThrow();

        // Should not have called Redis
        expect(govApiCacheRedis.setex).not.toHaveBeenCalled();
      });

      it('should report unavailable when Redis is down', () => {
        govApiCacheRedis.simulateEvent('close');

        expect(govApiCache.isAvailable()).toBe(false);
      });
    });

    describe('when Redis connection has errors', () => {
      it('should log degradation metrics on Redis error', async () => {
        const testError = new Error('ENOTFOUND redis.example.com');

        govApiCacheRedis.simulateEvent('error', testError);

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('ENOTFOUND'),
        );
      });

      it('should track errors in statistics', async () => {
        govApiCacheRedis.get.mockRejectedValueOnce(new Error('ETIMEDOUT'));

        await govApiCache.get<string>('sinapi', 'test-key');

        const stats = govApiCache.getStats('sinapi');
        expect(stats.errors).toBeGreaterThan(0);
      });
    });

    describe('when Redis recovers', () => {
      it('should automatically recover when Redis reconnects', async () => {
        // Start disconnected
        govApiCacheRedis.simulateEvent('close');
        expect(govApiCache.isAvailable()).toBe(false);

        // Reconnect
        govApiCacheRedis.simulateEvent('connect');
        expect(govApiCache.isAvailable()).toBe(true);
      });

      it('should resume normal operations after recovery', async () => {
        // Disconnect and reconnect
        govApiCacheRedis.simulateEvent('close');
        govApiCacheRedis.simulateEvent('connect');

        govApiCacheRedis.get.mockResolvedValueOnce(
          JSON.stringify({ price: 100.5 }),
        );

        const result = await govApiCache.get<{ price: number }>(
          'sicro',
          'test-key',
        );
        expect(result).toEqual({ price: 100.5 });
      });
    });

    describe('when Redis connection times out', () => {
      it('should not crash on connection timeout', async () => {
        // Create a new service where connection rejects
        const timeoutRedis = createMockRedis();
        timeoutRedis.connect.mockRejectedValueOnce(new Error('ETIMEDOUT'));
        mockRedisInstances.push(timeoutRedis);

        // Service should still be created without crashing
        const newCache = new GovApiCache(configService);

        // Wait for connection attempt
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Should not crash - can still check stats
        const stats = newCache.getStats('pncp');
        expect(stats).toBeDefined();

        await newCache.onModuleDestroy();
      });
    });
  });

  describe('Cross-Service Redis Failure Impact', () => {
    it('should not affect other cache types when one operation errors', async () => {
      // Simulate error on first call only
      semanticCacheRedis.get.mockRejectedValueOnce(new Error('ECONNRESET'));
      semanticCacheRedis.get.mockResolvedValueOnce(
        JSON.stringify({ test: true }),
      );

      // First call errors
      const result1 = await semanticCache.get<string>('openai', 'key1');
      expect(result1).toBeNull();

      // Second call succeeds
      const result2 = await semanticCache.get<{ test: boolean }>('exa', 'key2');
      expect(result2).toEqual({ test: true });
    });

    it('should maintain independent stats per cache type', async () => {
      // Error on openai
      semanticCacheRedis.get.mockRejectedValueOnce(new Error('Test error'));
      await semanticCache.get<string>('openai', 'key1');

      // Success on exa (cache miss)
      semanticCacheRedis.get.mockResolvedValueOnce(null);
      await semanticCache.get<string>('exa', 'key2');

      const openaiStats = semanticCache.getStats('openai');
      const exaStats = semanticCache.getStats('exa');

      expect(openaiStats.errors).toBeGreaterThan(0);
      expect(exaStats.errors).toBe(0);
      expect(exaStats.misses).toBeGreaterThan(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not accumulate event handlers on repeated connect/disconnect cycles', () => {
      const onCallsBefore = semanticCacheRedis.on.mock.calls.length;

      // Simulate multiple reconnections - handlers are already registered,
      // so no new handlers should be added
      for (let i = 0; i < 10; i++) {
        semanticCacheRedis.simulateEvent('close');
        semanticCacheRedis.simulateEvent('connect');
      }

      // Event handlers should not increase (they're set once in constructor)
      const onCallsAfter = semanticCacheRedis.on.mock.calls.length;
      expect(onCallsAfter).toBe(onCallsBefore);
    });

    it('should properly cleanup on module destroy', async () => {
      await semanticCache.onModuleDestroy();

      expect(semanticCacheRedis.quit).toHaveBeenCalled();
    });
  });
});
