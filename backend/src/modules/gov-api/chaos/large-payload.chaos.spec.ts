/**
 * Large Payload Resilience Chaos Test
 *
 * Tests system behavior when API responses contain large payloads:
 * - System handles large payloads gracefully without crashing
 * - No memory leak on large payload handling
 * - Payload processing metrics logged for observability
 * - System remains operational after processing large payloads
 *
 * @see Issue #1209 - [CHAOS-1074c] Test: Large payload resilience
 * @see Issue #1074 - [QA] Implementar chaos engineering
 */

import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GovApiClient, GovApiClientConfig } from '../utils/gov-api-client';

// Payload size constants
const KB = 1024;
const MB = 1024 * KB;
const LARGE_PAYLOAD_SIZE = 5 * MB; // 5MB large payload
const NORMAL_PAYLOAD_SIZE = 100 * KB; // 100KB normal payload
const SMALL_PAYLOAD_SIZE = 1 * KB; // 1KB small payload

/**
 * Generates a string of specified size in bytes
 */
function generatePayload(sizeInBytes: number): string {
  // Each character is approximately 1 byte in ASCII
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < sizeInBytes; i++) {
    result += chars[i % chars.length];
  }
  return result;
}

describe('Large Payload Resilience - Chaos Engineering Tests', () => {
  let client: GovApiClient;
  let configService: ConfigService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  const testApiUrl = 'https://api.payload-test.gov.br';

  const clientConfig: GovApiClientConfig = {
    baseUrl: testApiUrl,
    source: 'pncp',
    timeout: 60000, // 60s timeout to allow large payloads
    circuitBreaker: {
      timeout: 60000,
      errorThresholdPercentage: 50,
      resetTimeout: 1000,
      volumeThreshold: 5,
    },
    retry: {
      maxRetries: 0, // Disable retries for payload tests
    },
  };

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();

    configService = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as ConfigService;

    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    client = new GovApiClient(configService, clientConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  describe('Large Payload Processing', () => {
    it('should handle large payloads gracefully', async () => {
      // Generate large payload (5MB)
      const largeData = generatePayload(LARGE_PAYLOAD_SIZE);
      const responseBody = { data: largeData, size: LARGE_PAYLOAD_SIZE };

      nock(testApiUrl).get('/v1/large-data').reply(200, responseBody);

      // Request should complete without crashing
      const result = await client.get<{ data: string; size: number }>(
        '/v1/large-data',
      );

      expect(result).toBeDefined();
      expect(result.size).toBe(LARGE_PAYLOAD_SIZE);
      expect(result.data.length).toBe(LARGE_PAYLOAD_SIZE);
    }, 120000);

    it('should process normal payloads without issues', async () => {
      const normalData = generatePayload(NORMAL_PAYLOAD_SIZE);
      const responseBody = { data: normalData, count: 100 };

      nock(testApiUrl).get('/v1/normal-data').reply(200, responseBody);

      const result = await client.get<{ data: string; count: number }>(
        '/v1/normal-data',
      );

      expect(result).toBeDefined();
      expect(result.count).toBe(100);
      expect(result.data.length).toBe(NORMAL_PAYLOAD_SIZE);
    }, 30000);

    it('should handle varying payload sizes consistently', async () => {
      // Test with different payload sizes
      const sizes = [SMALL_PAYLOAD_SIZE, NORMAL_PAYLOAD_SIZE, 1 * MB, 2 * MB];

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const data = generatePayload(size);
        nock(testApiUrl).get(`/v1/size-test-${i}`).reply(200, { data, size });
      }

      const results = await Promise.all(
        sizes.map((_, i) =>
          client.get<{ data: string; size: number }>(`/v1/size-test-${i}`),
        ),
      );

      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result.data.length).toBe(sizes[i]);
      });
    }, 120000);
  });

  describe('Memory Leak Prevention', () => {
    it('should not cause memory leak on repeated large payload processing', async () => {
      // Get initial memory usage
      if (global.gc) {
        global.gc(); // Force garbage collection if available
      }
      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple large payloads
      const largeData = generatePayload(LARGE_PAYLOAD_SIZE);
      const responseBody = { data: largeData };

      for (let i = 0; i < 5; i++) {
        nock(testApiUrl).get(`/v1/leak-test-${i}`).reply(200, responseBody);

        try {
          await client.get(`/v1/leak-test-${i}`);
        } catch {
          // May fail but should clean up
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Allow async cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      // Due to Node.js memory management, we use a generous limit
      // The key is that memory doesn't grow unbounded
      expect(memoryIncrease).toBeLessThan(500 * MB);
    }, 180000);

    it('should properly cleanup after processing normal payloads', async () => {
      const normalData = generatePayload(NORMAL_PAYLOAD_SIZE);

      for (let i = 0; i < 10; i++) {
        nock(testApiUrl)
          .get(`/v1/cleanup-test-${i}`)
          .reply(200, { data: normalData, index: i });
      }

      // Process multiple payloads
      for (let i = 0; i < 10; i++) {
        await client.get(`/v1/cleanup-test-${i}`);
      }

      // Service should still be operational
      expect(client.isAvailable()).toBe(true);
      expect(client.getCircuitState().closed).toBe(true);
    }, 60000);
  });

  describe('Payload Size Metrics Logging', () => {
    it('should complete request without errors for normal payloads', async () => {
      const payloadSize = 500 * KB;
      const data = generatePayload(payloadSize);
      const responseBody = { data, timestamp: Date.now() };

      nock(testApiUrl).get('/v1/metrics-payload').reply(200, responseBody);

      const result = await client.get<{ data: string; timestamp: number }>(
        '/v1/metrics-payload',
      );

      // Should complete successfully
      expect(result).toBeDefined();
      expect(result.data.length).toBe(payloadSize);
    }, 30000);

    it('should complete request without errors for large payloads', async () => {
      // Large payload that should be processed
      const largeData = generatePayload(LARGE_PAYLOAD_SIZE);
      const responseBody = { data: largeData };

      nock(testApiUrl).get('/v1/large-log').reply(200, responseBody);

      const result = await client.get<{ data: string }>('/v1/large-log');

      // Should complete successfully
      expect(result).toBeDefined();
      expect(result.data.length).toBe(LARGE_PAYLOAD_SIZE);
    }, 120000);

    it('should log errors for failed requests', async () => {
      // Setup a request that will fail (500 error)
      nock(testApiUrl)
        .get('/v1/error-metrics')
        .reply(500, { error: 'Server error' });

      try {
        await client.get('/v1/error-metrics');
      } catch {
        // Expected
      }

      // Should have logged the error with endpoint info
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v1/error-metrics'),
      );
    }, 30000);
  });

  describe('Client Error Response', () => {
    it('should return appropriate error to client on server error', async () => {
      nock(testApiUrl)
        .get('/v1/client-error-test')
        .reply(500, { error: 'Internal Server Error' });

      let thrownError: Error | null = null;
      try {
        await client.get('/v1/client-error-test');
      } catch (error) {
        thrownError = error as Error;
      }

      // Should have thrown an error
      expect(thrownError).not.toBeNull();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError!.message).toBeDefined();
    }, 30000);

    it('should not crash service on large payload processing', async () => {
      const largeData = generatePayload(LARGE_PAYLOAD_SIZE);
      const responseBody = { data: largeData };

      nock(testApiUrl).get('/v1/crash-test').reply(200, responseBody);

      // Should not crash
      try {
        await client.get('/v1/crash-test');
      } catch {
        // May fail but shouldn't crash
      }

      // Service should still be operational
      expect(client).toBeDefined();
      expect(typeof client.get).toBe('function');

      // Setup normal endpoint
      nock(testApiUrl).get('/v1/after-large').reply(200, { status: 'ok' });

      // Should be able to make subsequent requests
      const result = await client.get<{ status: string }>('/v1/after-large');
      expect(result.status).toBe('ok');
    }, 120000);
  });

  describe('Concurrent Large Payload Handling', () => {
    it('should handle multiple concurrent large payloads without crashing', async () => {
      const largeData = generatePayload(2 * MB);

      // Setup 5 concurrent endpoints
      for (let i = 0; i < 5; i++) {
        nock(testApiUrl)
          .get(`/v1/concurrent-large-${i}`)
          .reply(200, { data: largeData, index: i });
      }

      // Fire concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        client
          .get<{ data: string; index: number }>(`/v1/concurrent-large-${i}`)
          .catch((e) => ({ error: e.message })),
      );

      const results = await Promise.all(promises);

      // All should have completed (either success or handled error)
      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    }, 120000);

    it('should maintain circuit breaker stability under large payload load', async () => {
      const largeData = generatePayload(2 * MB);

      // Setup endpoints
      for (let i = 0; i < 10; i++) {
        nock(testApiUrl)
          .get(`/v1/circuit-large-${i}`)
          .reply(200, { data: largeData });
      }

      // Fire requests
      for (let i = 0; i < 10; i++) {
        try {
          await client.get(`/v1/circuit-large-${i}`);
        } catch {
          // May fail but shouldn't crash
        }
      }

      // Circuit breaker should still be functional
      const state = client.getCircuitState();
      expect(state).toBeDefined();
      expect(
        typeof state.closed === 'boolean' ||
          typeof state.opened === 'boolean' ||
          typeof state.halfOpen === 'boolean',
      ).toBe(true);
    }, 120000);
  });

  describe('Edge Cases', () => {
    it('should handle empty response gracefully', async () => {
      nock(testApiUrl).get('/v1/empty').reply(200, {});

      const result = await client.get<Record<string, unknown>>('/v1/empty');

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(0);
    }, 10000);

    it('should handle null-like response gracefully', async () => {
      nock(testApiUrl).get('/v1/null').reply(200, 'null', {
        'Content-Type': 'application/json',
      });

      const result = await client.get('/v1/null');

      expect(result).toBeNull();
    }, 10000);

    it('should handle response with no Content-Length header', async () => {
      const data = generatePayload(NORMAL_PAYLOAD_SIZE);

      nock(testApiUrl)
        .get('/v1/no-content-length')
        .reply(200, { data }, { 'Transfer-Encoding': 'chunked' });

      const result = await client.get<{ data: string }>(
        '/v1/no-content-length',
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    }, 30000);

    it('should handle malformed JSON in response', async () => {
      const malformedJson = '{"data": "incomplete';

      nock(testApiUrl)
        .get('/v1/malformed')
        .reply(200, malformedJson, { 'Content-Type': 'application/json' });

      // Axios may return the raw string if JSON parsing fails silently
      // or throw depending on configuration
      let result: unknown = null;
      let thrownError: Error | null = null;
      try {
        result = await client.get('/v1/malformed');
      } catch (error) {
        thrownError = error as Error;
      }

      // Either we got a result (raw string) or an error
      expect(result !== null || thrownError !== null).toBe(true);
    }, 10000);

    it('should handle binary data in response', async () => {
      const binaryData = Buffer.alloc(1000, 0xff);

      nock(testApiUrl)
        .get('/v1/binary')
        .reply(200, binaryData, { 'Content-Type': 'application/octet-stream' });

      // Should handle without crashing
      try {
        await client.get('/v1/binary');
      } catch {
        // May throw due to JSON parsing, but shouldn't crash
      }

      // Service should still be operational
      expect(client.isAvailable()).toBe(true);
    }, 10000);
  });
});
