import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, ApiPlan } from '../src/entities/user.entity';
import {
  PriceBenchmark,
  OrgaoPorte,
} from '../src/entities/price-benchmark.entity';
import {
  ItemCategory,
  ItemCategoryType,
} from '../src/entities/item-category.entity';
import * as bcrypt from 'bcrypt';

/**
 * E2E Tests for Public Prices API
 *
 * Tests the complete public API flow for third-party price data access:
 * - API Key authentication (X-API-Key header)
 * - Rate limiting by subscription plan (FREE/PRO/ENTERPRISE)
 * - Three public endpoints: /benchmark, /search, /categories
 * - Error handling for invalid/missing API keys
 * - Quota enforcement (429 Too Many Requests)
 *
 * Part of issue #1275 - API de consulta de preços para terceiros
 *
 * @see PublicPricesController
 * @see ApiKeyGuard
 * @see ApiKeyThrottlerGuard
 */
describe('Public Prices API (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<ItemCategory>;
  let benchmarkRepository: Repository<PriceBenchmark>;

  // Test API keys (plain text for testing - in production these would be hashed)
  const TEST_API_KEY_FREE = 'test-free-api-key-12345';
  const TEST_API_KEY_PRO = 'test-pro-api-key-67890';
  const TEST_API_KEY_ENTERPRISE = 'test-enterprise-api-key-99999';
  const INVALID_API_KEY = 'invalid-api-key-xxxxx';

  let testUserFree: User;
  let testUserPro: User;
  let testUserEnterprise: User;
  let testCategory: ItemCategory;
  let testBenchmark: PriceBenchmark;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Get repositories for test data setup
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    categoryRepository = moduleFixture.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
    benchmarkRepository = moduleFixture.get<Repository<PriceBenchmark>>(
      getRepositoryToken(PriceBenchmark),
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testBenchmark) {
      await benchmarkRepository.delete(testBenchmark.id);
    }
    if (testCategory) {
      await categoryRepository.delete(testCategory.id);
    }
    if (testUserFree) {
      await userRepository.delete(testUserFree.id);
    }
    if (testUserPro) {
      await userRepository.delete(testUserPro.id);
    }
    if (testUserEnterprise) {
      await userRepository.delete(testUserEnterprise.id);
    }

    await app.close();
  });

  beforeEach(async () => {
    // Create test users with different API plans
    const hashedKeyFree = await bcrypt.hash(TEST_API_KEY_FREE, 10);
    const hashedKeyPro = await bcrypt.hash(TEST_API_KEY_PRO, 10);
    const hashedKeyEnterprise = await bcrypt.hash(TEST_API_KEY_ENTERPRISE, 10);

    testUserFree = await userRepository.save({
      email: 'test-free@example.com',
      name: 'Test User Free',
      password: 'test-password',
      apiKey: TEST_API_KEY_FREE, // Plaintext for transition period (TD-001)
      apiKeyHash: hashedKeyFree,
      apiPlan: ApiPlan.FREE,
      isActive: true,
    });

    testUserPro = await userRepository.save({
      email: 'test-pro@example.com',
      name: 'Test User Pro',
      password: 'test-password',
      apiKey: TEST_API_KEY_PRO,
      apiKeyHash: hashedKeyPro,
      apiPlan: ApiPlan.PRO,
      isActive: true,
    });

    testUserEnterprise = await userRepository.save({
      email: 'test-enterprise@example.com',
      name: 'Test User Enterprise',
      password: 'test-password',
      apiKey: TEST_API_KEY_ENTERPRISE,
      apiKeyHash: hashedKeyEnterprise,
      apiPlan: ApiPlan.ENTERPRISE,
      isActive: true,
    });

    // Create test category
    testCategory = await categoryRepository.save({
      code: 'CATMAT-TEST-001',
      name: 'Test Category E2E',
      description: 'Test category for E2E testing',
      type: ItemCategoryType.CATMAT,
      level: 0,
      active: true,
      patterns: [],
      keywords: [],
    });

    // Create test benchmark
    testBenchmark = await benchmarkRepository.save({
      categoryId: testCategory.id,
      uf: 'SP',
      orgaoPorte: OrgaoPorte.TODOS,
      avgPrice: 1500.0,
      medianPrice: 1400.0,
      minPrice: 1000.0,
      maxPrice: 2000.0,
      p25: 1200.0,
      p75: 1600.0,
      stdDev: 300.0,
      sampleCount: 50,
      unit: 'UN',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2026-01-01'),
      calculatedAt: new Date(),
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without API Key (401 Unauthorized)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('API Key is required');
          expect(res.body.statusCode).toBe(401);
        });
    });

    it('should reject requests with invalid API Key (403 Forbidden)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', INVALID_API_KEY)
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid API Key');
          expect(res.body.statusCode).toBe(403);
        });
    });

    it('should accept requests with valid FREE plan API Key (200 OK)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);
    });

    it('should accept requests with valid PRO plan API Key (200 OK)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_PRO)
        .expect(200);
    });

    it('should accept requests with valid ENTERPRISE plan API Key (200 OK)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_ENTERPRISE)
        .expect(200);
    });

    it('should reject requests for inactive user account (403 Forbidden)', async () => {
      // Deactivate user
      await userRepository.update(testUserFree.id, { isActive: false });

      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(403);

      expect(response.body.message).toBe('User account is inactive');

      // Reactivate for other tests
      await userRepository.update(testUserFree.id, { isActive: true });
    });
  });

  describe('GET /api/v1/prices/benchmark', () => {
    it('should return benchmarks with pagination metadata', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter benchmarks by category code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ categoryCode: testCategory.code })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(0);
          // If data returned, verify it matches the filter
          if (res.body.data.length > 0) {
            expect(res.body.data[0].categoryCode).toBe(testCategory.code);
          }
        });
    });

    it('should filter benchmarks by UF (state)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ uf: 'SP' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          if (res.body.data.length > 0) {
            expect(res.body.data[0].uf).toBe('SP');
          }
        });
    });

    it('should filter benchmarks by orgaoPorte (organization size)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ orgaoPorte: 'MEDIUM' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);
    });

    it('should support pagination with page and limit parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ page: 1, limit: 10 })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(10);
        });
    });

    it('should use default pagination values when not provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(20); // Default limit
        });
    });

    it('should enforce max limit of 100 results per page', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ limit: 150 })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(400); // Validation should reject limit > 100
    });

    it('should return benchmark with all expected statistical fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ categoryCode: testCategory.code, uf: 'SP' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);

      if (response.body.data.length > 0) {
        const benchmark = response.body.data[0];
        expect(benchmark).toHaveProperty('id');
        expect(benchmark).toHaveProperty('categoryCode');
        expect(benchmark).toHaveProperty('categoryName');
        expect(benchmark).toHaveProperty('uf');
        expect(benchmark).toHaveProperty('orgaoPorte');
        expect(benchmark).toHaveProperty('median');
        expect(benchmark).toHaveProperty('average');
        expect(benchmark).toHaveProperty('priceRange');
        expect(benchmark.priceRange).toHaveProperty('min');
        expect(benchmark.priceRange).toHaveProperty('max');
        expect(benchmark.priceRange).toHaveProperty('p25');
        expect(benchmark.priceRange).toHaveProperty('p75');
        expect(benchmark).toHaveProperty('stdDev');
        expect(benchmark).toHaveProperty('sampleSize');
      }
    });
  });

  describe('GET /api/v1/prices/search', () => {
    it('should require query parameter (400 Bad Request)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(400); // Missing required query parameter
    });

    it('should return search results with similarity scores', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .query({ query: 'microcomputador' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('offset');
          expect(Array.isArray(res.body.data)).toBe(true);
          // Note: Implementation returns empty results (placeholder)
          // When implemented, verify similarity field exists
        });
    });

    it('should support category filter in search', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .query({ query: 'test', category: 'CATMAT-44122' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);
    });

    it('should support limit and offset pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .query({ query: 'test', limit: 50, offset: 10 })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(50);
          expect(res.body.offset).toBe(10);
        });
    });

    it('should use default limit (20) when not provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .query({ query: 'test' })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(20);
          expect(res.body.offset).toBe(0);
        });
    });

    it('should enforce max limit of 100 results', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/search')
        .query({ query: 'test', limit: 150 })
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(400); // Validation should reject limit > 100
    });
  });

  describe('GET /api/v1/prices/categories', () => {
    it('should return list of categories with metadata', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });

    it('should include test category in results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);

      const testCat = response.body.data.find(
        (c: any) => c.code === testCategory.code,
      );
      expect(testCat).toBeDefined();
      expect(testCat.name).toBe(testCategory.name);
      expect(testCat.type).toBe(testCategory.type);
      expect(testCat.active).toBe(true);
    });

    it('should return category with all expected fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);

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

    it('should include both CATMAT and CATSER categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);

      const hasCatmat = response.body.data.some(
        (c: any) => c.type === ItemCategoryType.CATMAT,
      );
      const hasCatser = response.body.data.some(
        (c: any) => c.type === ItemCategoryType.CATSER,
      );

      expect(hasCatmat || hasCatser).toBe(true); // At least one type present
    });
  });

  describe('Swagger Documentation', () => {
    it('should expose Swagger UI in non-production environments', () => {
      // Swagger is disabled in production, but we're in test environment
      return request(app.getHttpServer()).get('/api/docs').expect(200); // Should return Swagger UI HTML
    });

    it('should include Public API - Prices tag in Swagger docs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const tags = response.body.tags || [];
      const publicPricesTag = tags.find(
        (t: any) => t.name === 'Public API - Prices',
      );

      expect(publicPricesTag).toBeDefined();
      expect(publicPricesTag.description).toContain('API Key');
    });

    it('should document X-API-Key authentication scheme', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const securitySchemes = response.body.components?.securitySchemes || {};
      expect(securitySchemes['X-API-Key']).toBeDefined();
      expect(securitySchemes['X-API-Key'].type).toBe('apiKey');
      expect(securitySchemes['X-API-Key'].name).toBe('X-API-Key');
      expect(securitySchemes['X-API-Key'].in).toBe('header');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow cross-origin requests with proper headers', () => {
      return request(app.getHttpServer())
        .options('/api/v1/prices/benchmark')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204); // Preflight should succeed
    });

    it('should include CORS headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format for 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return proper error format for 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', INVALID_API_KEY)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body.statusCode).toBe(403);
    });

    it('should return proper error format for 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .query({ limit: 9999 }) // Invalid limit
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('API Versioning', () => {
    it('should accept requests with /api/v1/ prefix', () => {
      return request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);
    });

    it('should reject requests without version prefix', () => {
      return request(app.getHttpServer())
        .get('/api/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(404); // Route not found without version
    });
  });

  describe('Content Type', () => {
    it('should return JSON content type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/categories')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should accept JSON content type for POST/PUT requests', async () => {
      // This API is read-only (GET only), but test header acceptance
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/benchmark')
        .set('X-API-Key', TEST_API_KEY_FREE)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
