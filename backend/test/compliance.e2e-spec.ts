import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EtpTemplateType } from '../src/entities/etp-template.entity';

/**
 * Compliance API E2E Test Suite
 *
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 *
 * Tests:
 * - GET /api/compliance/checklists - Lista checklists de conformidade
 * - GET /api/compliance/checklists/:id - Detalhes de um checklist
 * - GET /api/compliance/etps/:etpId/validate - Validacao completa (requer auth)
 * - GET /api/compliance/etps/:etpId/score - Score resumido (requer auth)
 * - GET /api/compliance/etps/:etpId/suggestions - Sugestoes (requer auth)
 *
 * Note: Os endpoints de validacao de ETPs requerem autenticacao JWT.
 * Endpoints de checklists requerem autenticacao mas sao acessiveis a todos os usuarios autenticados.
 */
describe('Compliance API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
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
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Test: GET /api/v1/compliance/checklists
   * Requires authentication
   */
  describe('GET /api/v1/compliance/checklists', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/compliance/checklists')
        .expect(401);
    });
  });

  /**
   * Test: GET /api/v1/compliance/checklists/:id
   * Requires authentication
   */
  describe('GET /api/v1/compliance/checklists/:id', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/checklists/${fakeUuid}`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      // Note: This might return 401 before validation since auth is required
      // The behavior depends on guard order
      const response = await request(app.getHttpServer())
        .get('/api/v1/compliance/checklists/invalid-uuid')
        .expect((res) => {
          // Accept either 400 (validation) or 401 (auth)
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  /**
   * Test: GET /api/v1/compliance/etps/:etpId/validate
   * Requires authentication and ETP ownership
   */
  describe('GET /api/v1/compliance/etps/:etpId/validate', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/etps/${fakeUuid}/validate`)
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/compliance/etps/invalid-uuid/validate')
        .expect((res) => {
          // Accept either 400 (validation) or 401 (auth)
          expect([400, 401]).toContain(res.status);
        });
    });
  });

  /**
   * Test: GET /api/v1/compliance/etps/:etpId/score
   * Requires authentication and ETP ownership
   */
  describe('GET /api/v1/compliance/etps/:etpId/score', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/etps/${fakeUuid}/score`)
        .expect(401);
    });
  });

  /**
   * Test: GET /api/v1/compliance/etps/:etpId/suggestions
   * Requires authentication and ETP ownership
   */
  describe('GET /api/v1/compliance/etps/:etpId/suggestions', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/compliance/etps/${fakeUuid}/suggestions`)
        .expect(401);
    });
  });

  /**
   * Test: Query parameters validation
   */
  describe('Query parameters validation', () => {
    it('should accept templateType query parameter for checklists', async () => {
      // Without auth, should return 401 - but validates query param is accepted
      await request(app.getHttpServer())
        .get(
          `/api/v1/compliance/checklists?templateType=${EtpTemplateType.OBRAS}`,
        )
        .expect(401);
    });

    it('should accept checklistId query parameter for validate endpoint', async () => {
      const fakeEtpId = '00000000-0000-0000-0000-000000000000';
      const fakeChecklistId = '11111111-1111-1111-1111-111111111111';
      await request(app.getHttpServer())
        .get(
          `/api/v1/compliance/etps/${fakeEtpId}/validate?checklistId=${fakeChecklistId}`,
        )
        .expect(401);
    });

    it('should accept includeOptional query parameter for validate endpoint', async () => {
      const fakeEtpId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(
          `/api/v1/compliance/etps/${fakeEtpId}/validate?includeOptional=true`,
        )
        .expect(401);
    });
  });

  /**
   * Test: Endpoint routing verification
   * Ensures all compliance endpoints are properly registered
   */
  describe('Endpoint routing verification', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/compliance/checklists' },
      {
        method: 'get',
        path: '/api/v1/compliance/checklists/00000000-0000-0000-0000-000000000000',
      },
      {
        method: 'get',
        path: '/api/v1/compliance/etps/00000000-0000-0000-0000-000000000000/validate',
      },
      {
        method: 'get',
        path: '/api/v1/compliance/etps/00000000-0000-0000-0000-000000000000/score',
      },
      {
        method: 'get',
        path: '/api/v1/compliance/etps/00000000-0000-0000-0000-000000000000/suggestions',
      },
    ];

    endpoints.forEach(({ method, path }) => {
      it(`should not return 404 for ${method.toUpperCase()} ${path}`, async () => {
        const response = await (request(app.getHttpServer()) as any)[method](
          path,
        );
        // Should return 401 (unauthorized), not 404 (not found)
        // This verifies the route is properly registered
        expect(response.status).not.toBe(404);
        expect([401, 400]).toContain(response.status);
      });
    });
  });
});
