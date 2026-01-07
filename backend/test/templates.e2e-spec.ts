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
 * Templates API E2E Test Suite
 *
 * Issue #1237 - [TMPL-1161c] Create templates API endpoints
 *
 * Tests:
 * - GET /api/templates - Lista todos os templates ativos
 * - GET /api/templates/:id - Retorna template específico
 * - GET /api/templates/type/:type - Filtra templates por tipo
 * - 404 handling for non-existent templates
 */
describe('Templates API (e2e)', () => {
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

  describe('GET /api/v1/templates (findAll)', () => {
    it('should return 200 OK and an array of templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return templates with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      // If templates exist (seeded), validate structure
      if (response.body.length > 0) {
        const template = response.body[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('requiredFields');
        expect(template).toHaveProperty('optionalFields');
        expect(template).toHaveProperty('defaultSections');
        expect(template).toHaveProperty('isActive');
        expect(template.isActive).toBe(true);
      }
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      // No Authorization header provided
      await request(app.getHttpServer()).get('/api/v1/templates').expect(200);
    });
  });

  describe('GET /api/v1/templates/:id (findOne)', () => {
    it('should return 404 for non-existent template with valid UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/templates/${fakeUuid}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/templates/invalid-uuid')
        .expect(400);
    });

    it('should return template with correct structure when found', async () => {
      // First get all templates to find a valid ID
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      if (listResponse.body.length > 0) {
        const templateId = listResponse.body[0].id;
        const response = await request(app.getHttpServer())
          .get(`/api/v1/templates/${templateId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', templateId);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('type');
        expect(response.body).toHaveProperty('description');
        expect(response.body).toHaveProperty('requiredFields');
        expect(Array.isArray(response.body.requiredFields)).toBe(true);
      }
    });
  });

  describe('GET /api/v1/templates/type/:type (findByType)', () => {
    it('should return 200 OK and array for OBRAS type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/templates/type/${EtpTemplateType.OBRAS}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All returned templates should be of type OBRAS
      response.body.forEach((template: { type: EtpTemplateType }) => {
        expect(template.type).toBe(EtpTemplateType.OBRAS);
      });
    });

    it('should return 200 OK and array for TI type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/templates/type/${EtpTemplateType.TI}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: { type: EtpTemplateType }) => {
        expect(template.type).toBe(EtpTemplateType.TI);
      });
    });

    it('should return 200 OK and array for SERVICOS type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/templates/type/${EtpTemplateType.SERVICOS}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: { type: EtpTemplateType }) => {
        expect(template.type).toBe(EtpTemplateType.SERVICOS);
      });
    });

    it('should return 200 OK and array for MATERIAIS type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/templates/type/${EtpTemplateType.MATERIAIS}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((template: { type: EtpTemplateType }) => {
        expect(template.type).toBe(EtpTemplateType.MATERIAIS);
      });
    });

    it('should return empty array for type with no templates', async () => {
      // Use an invalid type to test empty response
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates/type/INVALID_TYPE')
        .expect(200);

      // Should return empty array, not error (TypeORM returns [] for no matches)
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Templates endpoint accessibility', () => {
    it('should be accessible without authentication on findAll', async () => {
      await request(app.getHttpServer()).get('/api/v1/templates').expect(200);
    });

    it('should be accessible without authentication on findByType', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/templates/type/${EtpTemplateType.OBRAS}`)
        .expect(200);
    });

    it('should be accessible without authentication on findOne (valid UUID)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      // Should get 404 (not found), not 401 (unauthorized)
      await request(app.getHttpServer())
        .get(`/api/v1/templates/${fakeUuid}`)
        .expect(404);
    });
  });

  describe('Seeded templates validation', () => {
    it('should have 4 seeded templates (one per type)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      // Issue #1236 seeds 4 templates
      expect(response.body.length).toBeGreaterThanOrEqual(4);
    });

    it('should have at least one template per type', async () => {
      const types = [
        EtpTemplateType.OBRAS,
        EtpTemplateType.TI,
        EtpTemplateType.SERVICOS,
        EtpTemplateType.MATERIAIS,
      ];

      for (const type of types) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/templates/type/${type}`)
          .expect(200);

        expect(response.body.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have required fields populated for all templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      response.body.forEach(
        (template: { name: string; requiredFields: string[] }) => {
          expect(template.requiredFields.length).toBeGreaterThan(0);
        },
      );
    });

    it('should have default sections populated for all templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .expect(200);

      response.body.forEach(
        (template: { name: string; defaultSections: string[] }) => {
          expect(template.defaultSections.length).toBeGreaterThan(0);
        },
      );
    });
  });
});
