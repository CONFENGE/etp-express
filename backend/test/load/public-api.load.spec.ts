/**
 * Load Tests for Public API (Issue #1690)
 *
 * Tests the Public API endpoints under various load scenarios:
 * - Normal load: 100 req/s for 1 minute
 * - Burst load: 500 req/s for 30 seconds
 * - Rate limiting behavior under load
 *
 * Metrics validated:
 * - P95 latency < 200ms
 * - Error rate < 0.1%
 * - Rate limiting (429) when quota exceeded
 *
 * Part of M13: Market Intelligence (#1275)
 *
 * @see Issue #1690
 * @see Issue #1275 (parent)
 */

import autocannon from 'autocannon';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

describe('Public API Load Tests', () => {
  let app: INestApplication;
  let baseUrl: string;

  // Test API Key (Free plan: 100/month)
  const FREE_API_KEY = 'test-free-key-12345';
  const PRO_API_KEY = 'test-pro-key-67890';
  const ENTERPRISE_API_KEY = 'test-enterprise-key-abcde';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const server = app.getHttpServer();
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('Normal Load (100 req/s for 1 minute)', () => {
    it('should handle 100 req/s with P95 latency < 200ms', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 10,
        pipelining: 1,
        duration: 60,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&limit=10',
          },
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-45001&uf=RJ&limit=20',
          },
          {
            method: 'GET',
            path: '/api/v1/prices/categories',
          },
        ],
      });

      // Validate metrics
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);

      // P95 latency < 200ms
      const p95Latency = result.latency.p97_5; // autocannon uses p97.5 as closest to p95
      console.log(`P95 Latency: ${p95Latency}ms`);
      expect(p95Latency).toBeLessThan(200);

      // Error rate < 0.1%
      const errorRate = (result.non2xx / result.requests.total) * 100;
      console.log(`Error Rate: ${errorRate}%`);
      expect(errorRate).toBeLessThan(0.1);

      // Throughput validation
      console.log(`Throughput: ${result.requests.average} req/s`);
      expect(result.requests.average).toBeGreaterThanOrEqual(90); // Allow 10% variance
    }, 90000);
  });

  describe('Burst Load (500 req/s for 30 seconds)', () => {
    it('should handle burst traffic with degraded but acceptable performance', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 50,
        pipelining: 1,
        duration: 30,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP',
          },
        ],
      });

      // Validate metrics (more lenient for burst)
      expect(result.errors).toBe(0);

      // P95 latency < 500ms for burst (more lenient)
      const p95Latency = result.latency.p97_5;
      console.log(`Burst P95 Latency: ${p95Latency}ms`);
      expect(p95Latency).toBeLessThan(500);

      // Error rate < 1% for burst
      const errorRate = (result.non2xx / result.requests.total) * 100;
      console.log(`Burst Error Rate: ${errorRate}%`);
      expect(errorRate).toBeLessThan(1.0);

      // Throughput validation
      console.log(`Burst Throughput: ${result.requests.average} req/s`);
      expect(result.requests.average).toBeGreaterThanOrEqual(400); // Allow 20% variance
    }, 60000);
  });

  describe('Rate Limiting Under Load', () => {
    it('should enforce rate limits correctly under sustained load', async () => {
      // Simulate Free plan hitting quota (100/month = ~0.0023 req/s)
      // For testing, we'll send 150 requests rapidly to trigger rate limiting
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 10,
        amount: 150, // Total requests
        headers: {
          'X-API-Key': FREE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122',
          },
        ],
      });

      // Should have some 429 responses
      console.log(`Non-2xx responses: ${result.non2xx}`);
      console.log(`2xx responses: ${result['2xx']}`);

      // With Free plan, we expect rate limiting to kick in
      expect(result.non2xx).toBeGreaterThan(0);

      // Overall error rate should be acceptable (rate limiting is expected)
      const errorRate = (result.non2xx / result.requests.total) * 100;
      console.log(`Rate Limit Test Error Rate: ${errorRate}%`);

      // Most requests should succeed until quota is hit
      expect(result['2xx']).toBeGreaterThan(50);
    }, 60000);

    it('should not rate limit Pro plan under normal load', async () => {
      // Pro plan: 5000/month = ~0.192 req/s
      // Send 100 requests which is well under daily quota
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 5,
        amount: 100,
        headers: {
          'X-API-Key': PRO_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122',
          },
        ],
      });

      // Should have minimal/no 429s
      console.log(`Pro Plan Non-2xx: ${result.non2xx}`);
      console.log(`Pro Plan 2xx: ${result['2xx']}`);

      // All or most requests should succeed
      const successRate = (result['2xx'] / result.requests.total) * 100;
      console.log(`Pro Plan Success Rate: ${successRate}%`);
      expect(successRate).toBeGreaterThan(95);
    }, 45000);

    it('should never rate limit Enterprise plan', async () => {
      // Enterprise plan: unlimited
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 20,
        amount: 500,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122',
          },
        ],
      });

      // Should have zero 429s
      console.log(`Enterprise Non-2xx: ${result.non2xx}`);
      console.log(`Enterprise 2xx: ${result['2xx']}`);

      // All requests should succeed
      const successRate = (result['2xx'] / result.requests.total) * 100;
      console.log(`Enterprise Success Rate: ${successRate}%`);
      expect(successRate).toBe(100);
    }, 60000);
  });

  describe('Endpoint-Specific Load Tests', () => {
    it('/prices/categories should handle high concurrency', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/categories`,
        connections: 20,
        duration: 20,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
      });

      expect(result.errors).toBe(0);

      // Categories endpoint should be fast (mostly cached)
      const p95Latency = result.latency.p97_5;
      console.log(`Categories P95 Latency: ${p95Latency}ms`);
      expect(p95Latency).toBeLessThan(100);

      const errorRate = (result.non2xx / result.requests.total) * 100;
      expect(errorRate).toBeLessThan(0.1);
    }, 45000);

    it('/prices/search should handle complex queries under load', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/prices/search`,
        connections: 10,
        duration: 30,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/search?query=microcomputador&limit=20',
          },
          {
            method: 'GET',
            path: '/api/v1/prices/search?query=impressora&category=CATMAT-45001&limit=10',
          },
        ],
      });

      expect(result.errors).toBe(0);

      // Search is more expensive, allow higher latency
      const p95Latency = result.latency.p97_5;
      console.log(`Search P95 Latency: ${p95Latency}ms`);
      expect(p95Latency).toBeLessThan(300);

      const errorRate = (result.non2xx / result.requests.total) * 100;
      expect(errorRate).toBeLessThan(0.5);
    }, 60000);
  });

  describe('Performance Degradation Tests', () => {
    it('should maintain performance with varied query complexity', async () => {
      const simpleResult = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 10,
        amount: 100,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?limit=10',
          },
        ],
      });

      const complexResult = await autocannon({
        url: `${baseUrl}/api/v1/prices/benchmark`,
        connections: 10,
        amount: 100,
        headers: {
          'X-API-Key': ENTERPRISE_API_KEY,
        },
        requests: [
          {
            method: 'GET',
            path: '/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&orgaoPorte=MEDIUM&periodMonths=12&limit=50',
          },
        ],
      });

      // Complex queries should not be more than 2x slower
      const degradationRatio =
        complexResult.latency.p50 / simpleResult.latency.p50;
      console.log(`Performance degradation ratio: ${degradationRatio}x`);
      expect(degradationRatio).toBeLessThan(2);
    }, 90000);
  });
});
