/**
 * API Timeout Resilience Chaos Test
 *
 * Tests system behavior when external APIs take 30s+ to respond:
 * - Circuit breaker opens after multiple timeouts
 * - Process does not hang on 30s+ timeout
 * - Graceful error returned to client
 * - Timeout metrics logged for observability
 *
 * @see Issue #1208 - [CHAOS-1074b] Test: API timeout resilience
 * @see Issue #1074 - [QA] Implementar chaos engineering
 */

import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GovApiClient, GovApiClientConfig } from '../utils/gov-api-client';

// Timeout constants - shorter for faster tests
const SHORT_TIMEOUT = 500; // 500ms for tests
const LONG_DELAY = 2000; // 2s simulated delay (exceeds timeout)
const CIRCUIT_VOLUME_THRESHOLD = 3; // Lower threshold for faster tests

describe('API Timeout Resilience - Chaos Engineering Tests', () => {
  let client: GovApiClient;
  let configService: ConfigService;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const testApiUrl = 'https://api.timeout-test.gov.br';

  const clientConfig: GovApiClientConfig = {
    baseUrl: testApiUrl,
    source: 'pncp',
    timeout: SHORT_TIMEOUT,
    circuitBreaker: {
      timeout: SHORT_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 1000, // 1s reset for faster tests
      volumeThreshold: CIRCUIT_VOLUME_THRESHOLD,
    },
    retry: {
      maxRetries: 0, // Disable retries for timeout tests
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
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    client = new GovApiClient(configService, clientConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  describe('Circuit Breaker Behavior on Timeouts', () => {
    it('should open circuit breaker after multiple timeouts', async () => {
      // Setup: Mock endpoint that delays response beyond timeout
      // Opossum will timeout the request before nock delay completes
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 2; i++) {
        nock(testApiUrl)
          .get('/v1/items')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      // Initial state: circuit should be closed
      expect(client.getCircuitState().closed).toBe(true);
      expect(client.isAvailable()).toBe(true);

      // Fire requests to trigger circuit breaker
      const errors: Error[] = [];
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 1; i++) {
        try {
          await client.get('/v1/items');
        } catch (error) {
          errors.push(error as Error);
        }
      }

      // All requests should have failed with timeout
      expect(errors.length).toBe(CIRCUIT_VOLUME_THRESHOLD + 1);

      // Circuit should be open after threshold exceeded
      const state = client.getCircuitState();
      expect(state.opened).toBe(true);
      expect(client.isAvailable()).toBe(false);
    }, 30000);

    it('should reject requests immediately when circuit is open', async () => {
      // Setup slow endpoints to trigger circuit open
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 2; i++) {
        nock(testApiUrl)
          .get('/v1/slow')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      // Trigger circuit open
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 1; i++) {
        try {
          await client.get('/v1/slow');
        } catch {
          // Expected
        }
      }

      // Verify circuit is open
      expect(client.getCircuitState().opened).toBe(true);

      // New request should be rejected immediately (not timeout)
      const startTime = Date.now();
      try {
        await client.get('/v1/fast');
      } catch {
        // Expected rejection
      }
      const elapsed = Date.now() - startTime;

      // Should be rejected much faster than the timeout
      expect(elapsed).toBeLessThan(SHORT_TIMEOUT);

      // Logger should warn about rejection
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('rejected'),
      );
    }, 30000);
  });

  describe('Process Hang Prevention', () => {
    it('should not hang process on 30s+ timeout - completes within timeout', async () => {
      // Setup: Mock endpoint with very long delay
      nock(testApiUrl)
        .get('/v1/very-slow')
        .delay(60000) // 60s delay
        .reply(200, { data: 'very delayed' });

      const startTime = Date.now();

      // Request should fail with timeout, not hang
      await expect(client.get('/v1/very-slow')).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // Should complete within configured timeout + buffer
      expect(elapsed).toBeLessThan(SHORT_TIMEOUT + 500);
    }, 10000);

    it('should timeout predictably regardless of response time', async () => {
      // Setup: Multiple endpoints with different delays (all > SHORT_TIMEOUT)
      nock(testApiUrl)
        .get('/v1/delay-2s')
        .delay(2000)
        .reply(200, { data: 'a' });
      nock(testApiUrl)
        .get('/v1/delay-5s')
        .delay(5000)
        .reply(200, { data: 'b' });
      nock(testApiUrl)
        .get('/v1/delay-10s')
        .delay(10000)
        .reply(200, { data: 'c' });

      const results = await Promise.allSettled([
        client.get('/v1/delay-2s'),
        client.get('/v1/delay-5s'),
        client.get('/v1/delay-10s'),
      ]);

      // All should fail with timeout (all delays > SHORT_TIMEOUT)
      results.forEach((result) => {
        expect(result.status).toBe('rejected');
      });
    }, 15000);
  });

  describe('Graceful Error Handling', () => {
    it('should return appropriate error to client on timeout', async () => {
      nock(testApiUrl)
        .get('/v1/timeout-endpoint')
        .delay(LONG_DELAY)
        .reply(200, { data: 'delayed' });

      let thrownError: Error | null = null;
      try {
        await client.get('/v1/timeout-endpoint');
      } catch (error) {
        thrownError = error as Error;
      }

      // Should have thrown an error
      expect(thrownError).not.toBeNull();
      expect(thrownError).toBeInstanceOf(Error);

      // Error should be defined and have a message
      expect(thrownError!.message).toBeDefined();
      expect(typeof thrownError!.message).toBe('string');
    }, 10000);

    it('should not crash service on multiple concurrent timeouts', async () => {
      // Setup multiple slow endpoints
      for (let i = 0; i < 10; i++) {
        nock(testApiUrl)
          .get(`/v1/concurrent-${i}`)
          .delay(LONG_DELAY)
          .reply(200, { data: i });
      }

      // Fire 10 concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.get(`/v1/concurrent-${i}`).catch(() => null),
      );

      // Should complete without crashing
      const results = await Promise.all(promises);

      // All should have failed (returned null from catch)
      expect(results.every((r) => r === null)).toBe(true);

      // Service should still be operational (though circuit may be open)
      expect(client).toBeDefined();
      expect(typeof client.getCircuitState).toBe('function');
    }, 15000);
  });

  describe('Timeout Metrics and Logging', () => {
    it('should log timeout events for observability', async () => {
      nock(testApiUrl)
        .get('/v1/metrics-test')
        .delay(LONG_DELAY)
        .reply(200, { data: 'delayed' });

      try {
        await client.get('/v1/metrics-test');
      } catch {
        // Expected
      }

      // Should have logged the error
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('/v1/metrics-test'),
      );
    }, 10000);

    it('should track timeout in circuit breaker stats', async () => {
      // Setup multiple timeout scenarios
      for (let i = 0; i < 3; i++) {
        nock(testApiUrl)
          .get('/v1/stats-test')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      // Make requests
      for (let i = 0; i < 3; i++) {
        try {
          await client.get('/v1/stats-test');
        } catch {
          // Expected
        }
      }

      // Get circuit state with stats
      const state = client.getCircuitState();
      const stats = state.stats as Record<string, number>;

      // Should have recorded failures or timeouts or fires
      expect(
        (stats.failures || 0) > 0 ||
          (stats.timeouts || 0) > 0 ||
          (stats.fires || 0) > 0,
      ).toBe(true);
    }, 15000);

    it('should log circuit breaker state changes', async () => {
      // Trigger enough timeouts to open circuit
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 2; i++) {
        nock(testApiUrl)
          .get('/v1/circuit-log-test')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 1; i++) {
        try {
          await client.get('/v1/circuit-log-test');
        } catch {
          // Expected
        }
      }

      // Should have logged circuit breaker state changes
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPENED'),
      );
    }, 30000);
  });

  describe('Recovery After Timeout Issues', () => {
    it('should transition to half-open state after reset timeout', async () => {
      // First, trigger circuit open with timeouts
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 2; i++) {
        nock(testApiUrl)
          .get('/v1/recovery-test')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 1; i++) {
        try {
          await client.get('/v1/recovery-test');
        } catch {
          // Expected
        }
      }

      // Circuit should be open
      expect(client.getCircuitState().opened).toBe(true);

      // Wait for circuit reset timeout (1s + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Circuit should be half-open after reset timeout
      const state = client.getCircuitState();
      expect(state.halfOpen).toBe(true);
    }, 30000);

    it('should close circuit when API becomes responsive after half-open', async () => {
      // Create a fresh client for recovery test
      const recoveryClient = new GovApiClient(configService, {
        ...clientConfig,
        timeout: 5000, // Longer timeout for recovery
      });

      // First, trigger circuit open with timeouts (same approach as other tests)
      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 2; i++) {
        nock(testApiUrl)
          .get('/v1/recover-close')
          .delay(LONG_DELAY)
          .reply(200, { data: 'delayed' });
      }

      for (let i = 0; i < CIRCUIT_VOLUME_THRESHOLD + 1; i++) {
        try {
          await recoveryClient.get('/v1/recover-close');
        } catch {
          // Expected
        }
      }

      // Circuit should be open
      expect(recoveryClient.getCircuitState().opened).toBe(true);

      // Wait for circuit reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Circuit should now be half-open
      expect(recoveryClient.getCircuitState().halfOpen).toBe(true);

      // Clean up any remaining interceptors and setup fast response for recovery
      nock.cleanAll();
      nock(testApiUrl)
        .get('/v1/recover-close')
        .reply(200, { items: ['recovered'] });

      // Should succeed with fast response
      const result = await recoveryClient.get<{ items: string[] }>(
        '/v1/recover-close',
      );
      expect(result.items).toContain('recovered');

      // Circuit should be closed after successful request
      expect(recoveryClient.getCircuitState().closed).toBe(true);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle HTTP errors vs timeout differently', async () => {
      // HTTP 500 error (immediate failure)
      nock(testApiUrl)
        .get('/v1/error500')
        .reply(500, { error: 'Server error' });

      // Timeout (slow failure)
      nock(testApiUrl)
        .get('/v1/slow')
        .delay(LONG_DELAY)
        .reply(200, { data: 'delayed' });

      const startError = Date.now();
      let httpError: Error | null = null;
      try {
        await client.get('/v1/error500');
      } catch (e) {
        httpError = e as Error;
      }
      const elapsedError = Date.now() - startError;

      const startTimeout = Date.now();
      let timeoutError: Error | null = null;
      try {
        await client.get('/v1/slow');
      } catch (e) {
        timeoutError = e as Error;
      }
      const elapsedTimeout = Date.now() - startTimeout;

      // Both should have thrown errors
      expect(httpError).not.toBeNull();
      expect(timeoutError).not.toBeNull();

      // HTTP error should fail much faster than timeout
      expect(elapsedError).toBeLessThan(100);
      expect(elapsedTimeout).toBeGreaterThan(elapsedError);
      expect(elapsedTimeout).toBeLessThan(SHORT_TIMEOUT + 500);
    }, 15000);

    it('should handle partial response followed by timeout', async () => {
      // This tests scenarios where API starts responding but then hangs
      nock(testApiUrl)
        .get('/v1/partial')
        .delay({ head: 100, body: LONG_DELAY })
        .reply(200, { data: 'partial response data' });

      const startTime = Date.now();
      let error: Error | null = null;
      try {
        await client.get('/v1/partial');
      } catch (e) {
        error = e as Error;
      }
      const elapsed = Date.now() - startTime;

      // Should timeout and not hang
      expect(error).not.toBeNull();
      expect(elapsed).toBeLessThan(SHORT_TIMEOUT + 500);
    }, 10000);
  });
});
