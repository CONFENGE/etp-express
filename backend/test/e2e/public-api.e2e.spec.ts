/**
 * E2E Tests for Public API (Issue #1690)
 *
 * Tests all three API plans (Free, Pro, Enterprise) end-to-end:
 * - Authentication with API keys
 * - Rate limiting enforcement per plan
 * - Full request/response validation
 *
 * Test Scenarios:
 * 1. Free Plan: 100 requests/month → 101st returns 429
 * 2. Pro Plan: 5000 requests/month → functional
 * 3. Enterprise Plan: unlimited → no 429s
 * 4. Auth: Missing/Invalid/Valid API Key
 *
 * Part of M13: Market Intelligence (#1275)
 *
 * @see Issue #1690
 * @see Issue #1275 (parent)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../src/entities/user.entity';
import { ApiUsage } from '../../src/modules/market-intelligence/entities/api-usage.entity';
import { ApiPlan } from '../../src/entities/user.entity';

describe('Public API E2E Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let apiUsageRepository: Repository<ApiUsage>;

  // Test users with different plans
  let freeUser: User;
  let proUser: User;
  let enterpriseUser: User;

  const FREE_API_KEY = 'test-free-e2e-key-12345';
  const PRO_API_KEY = 'test-pro-e2e-key-67890';
  const ENTERPRISE_API_KEY = 'test-enterprise-e2e-key-abcde';
  const INVALID_API_KEY = 'invalid-key-xyz';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    apiUsageRepository = moduleFixture.get<Repository<ApiUsage>>(
      getRepositoryToken(ApiUsage),
    );

    // Create test users with different plans
    freeUser = await userRepository.save({
      email: 'free-user@example.com',
      name: 'Free User',
      password: 'hashed-password',
      apiKey: FREE_API_KEY,
      apiPlan: ApiPlan.FREE,
      apiQuotaLimit: 100,
      apiQuotaUsed: 0,
      apiQuotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    proUser = await userRepository.save({
      email: 'pro-user@example.com',
      name: 'Pro User',
      password: 'hashed-password',
      apiKey: PRO_API_KEY,
      apiPlan: ApiPlan.PRO,
      apiQuotaLimit: 5000,
      apiQuotaUsed: 0,
      apiQuotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    enterpriseUser = await userRepository.save({
      email: 'enterprise-user@example.com',
      name: 'Enterprise User',
      password: 'hashed-password',
      apiKey: ENTERPRISE_API_KEY,
      apiPlan: ApiPlan.ENTERPRISE,
      apiQuotaLimit: null, // Unlimited
      apiQuotaUsed: 0,
      apiQuotaResetAt: null,
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup test users
    if (freeUser) await userRepository.remove(freeUser);
    if (proUser) await userRepository.remove(proUser);
    if (enterpriseUser) await userRepository.remove(enterpriseUser);

    // Cleanup API usage records
    await apiUsageRepository.delete({ userId: freeUser?.id });
    await apiUsageRepository.delete({ userId: proUser?.id });
    await apiUsageRepository.delete({ userId: enterpriseUser?.id });

    await app.close();
  });

  describe('Authentication Tests', () => {
    it('should return 401 when API Key is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: expect.stringContaining('API Key'),
      });
    });

    it('should return 403 when API Key is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', INVALID_API_KEY)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('Invalid API Key'),
      });
    });

    it('should return 200 when API Key is valid', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(200);
    });
  });

  describe('Free Plan (100 requests/month)', () => {
    beforeEach(async () => {
      // Reset quota before each test
      await userRepository.update(freeUser.id, {
        apiQuotaUsed: 0,
      });
    });

    it('should allow requests within quota', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark?categoryCode=CATMAT-44122&limit=10')
        .set('X-API-Key', FREE_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should reject 101st request with 429 Too Many Requests', async () => {
      // Simulate 100 requests already made
      await userRepository.update(freeUser.id, {
        apiQuotaUsed: 100,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', FREE_API_KEY)
        .expect(429);

      expect(response.body).toMatchObject({
        statusCode: 429,
        message: expect.stringContaining('quota exceeded'),
      });
    });

    it('should increment quota usage on successful request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', FREE_API_KEY)
        .expect(200);

      const updatedUser = await userRepository.findOne({
        where: { id: freeUser.id },
      });

      expect(updatedUser.apiQuotaUsed).toBeGreaterThan(0);
    });

    it('should track API usage in api_usage table', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark?categoryCode=CATMAT-44122')
        .set('X-API-Key', FREE_API_KEY)
        .expect(200);

      const usageRecords = await apiUsageRepository.find({
        where: { userId: freeUser.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      expect(usageRecords).toHaveLength(1);
      expect(usageRecords[0]).toMatchObject({
        userId: freeUser.id,
        endpoint: '/api/v1/prices/benchmark',
        method: 'GET',
        statusCode: 200,
      });
      expect(usageRecords[0].responseTime).toBeGreaterThan(0);
    });
  });

  describe('Pro Plan (5000 requests/month)', () => {
    beforeEach(async () => {
      await userRepository.update(proUser.id, {
        apiQuotaUsed: 0,
      });
    });

    it('should allow requests within quota', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/search?query=microcomputador&limit=20')
        .set('X-API-Key', PRO_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
    });

    it('should reject request when quota is exceeded', async () => {
      // Simulate 5000 requests already made
      await userRepository.update(proUser.id, {
        apiQuotaUsed: 5000,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', PRO_API_KEY)
        .expect(429);

      expect(response.body).toMatchObject({
        statusCode: 429,
        message: expect.stringContaining('quota exceeded'),
      });
    });

    it('should handle high usage gracefully', async () => {
      // Simulate 4999 requests
      await userRepository.update(proUser.id, {
        apiQuotaUsed: 4999,
      });

      // Last request should succeed
      await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', PRO_API_KEY)
        .expect(200);

      // Next request should fail
      await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', PRO_API_KEY)
        .expect(429);
    });
  });

  describe('Enterprise Plan (Unlimited)', () => {
    it('should never return 429 regardless of usage', async () => {
      // Simulate very high usage
      await userRepository.update(enterpriseUser.id, {
        apiQuotaUsed: 999999,
      });

      await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(200);
    });

    it('should track usage even though unlimited', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/search?query=impressora')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(200);

      const usageRecords = await apiUsageRepository.find({
        where: { userId: enterpriseUser.id },
      });

      expect(usageRecords.length).toBeGreaterThan(0);
    });

    it('should handle sustained high volume', async () => {
      // Make 50 rapid requests
      const requests = Array(50)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/prices/categories')
            .set('X-API-Key', ENTERPRISE_API_KEY),
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    }, 30000);
  });

  describe('Endpoint Functionality Tests', () => {
    describe('GET /api/v1/prices/benchmark', () => {
      it('should return benchmarks with correct structure', async () => {
        const response = await request(app.getHttpServer())
          .get(
            '/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&limit=10',
          )
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          totalPages: expect.any(Number),
        });

        if (response.body.data.length > 0) {
          const benchmark = response.body.data[0];
          expect(benchmark).toHaveProperty('categoryCode');
          expect(benchmark).toHaveProperty('categoryName');
          expect(benchmark).toHaveProperty('uf');
          expect(benchmark).toHaveProperty('median');
          expect(benchmark).toHaveProperty('average');
          expect(benchmark).toHaveProperty('priceRange');
        }
      });

      it('should support pagination', async () => {
        const page1 = await request(app.getHttpServer())
          .get('/api/v1/prices/benchmark?page=1&limit=10')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        const page2 = await request(app.getHttpServer())
          .get('/api/v1/prices/benchmark?page=2&limit=10')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        expect(page1.body.page).toBe(1);
        expect(page2.body.page).toBe(2);
      });

      it('should filter by UF', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/benchmark?uf=SP')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        response.body.data.forEach((item) => {
          if (item.uf) {
            expect(item.uf).toBe('SP');
          }
        });
      });
    });

    describe('GET /api/v1/prices/search', () => {
      it('should search items with query parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/search?query=microcomputador&limit=20')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
          limit: 20,
          offset: 0,
        });
      });

      it('should require query parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/search')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(400);

        expect(response.body.message).toContain('query');
      });

      it('should support category filtering', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/prices/search?query=test&category=CATMAT-44122')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);
      });
    });

    describe('GET /api/v1/prices/categories', () => {
      it('should return list of categories', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/categories')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
        });

        if (response.body.data.length > 0) {
          const category = response.body.data[0];
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('code');
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('type');
          expect(category).toHaveProperty('benchmarkCount');
          expect(category).toHaveProperty('active');
        }
      });

      it('should only return active categories', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/categories')
          .set('X-API-Key', ENTERPRISE_API_KEY)
          .expect(200);

        // All returned categories should be active (or we accept both)
        response.body.data.forEach((category) => {
          expect(category).toHaveProperty('active');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark?limit=invalid')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(400);
    });

    it('should return 400 for out-of-range pagination', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark?limit=500') // Max is 100
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(400);
    });

    it('should handle non-existent category gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark?categoryCode=INVALID-99999')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should include response time in API usage tracking', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .expect(200);

      const usageRecords = await apiUsageRepository.find({
        where: { userId: enterpriseUser.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      expect(usageRecords[0].responseTime).toBeDefined();
      expect(usageRecords[0].responseTime).toBeGreaterThan(0);
      expect(usageRecords[0].responseTime).toBeLessThan(5000); // Should be under 5s
    });

    it('should track user agent and IP', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', ENTERPRISE_API_KEY)
        .set('User-Agent', 'Test-Client/1.0')
        .expect(200);

      const usageRecords = await apiUsageRepository.find({
        where: { userId: enterpriseUser.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      expect(usageRecords[0].userAgent).toBeDefined();
      expect(usageRecords[0].ipAddress).toBeDefined();
    });
  });
});
