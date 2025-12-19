import { Test, TestingModule } from '@nestjs/testing';
import {
 INestApplication,
 ValidationPipe,
 VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Health Endpoint E2E Test Suite
 *
 * Tests that health endpoints are publicly accessible without authentication.
 *
 * Issue #777: Fix health endpoint 404
 *
 * Requirements:
 * - GET /api/health returns 200 OK without authentication
 * - GET /api/health/ready returns 200 OK without authentication
 * - GET /api returns 200 OK without authentication
 */
describe('Health Endpoints (e2e)', () => {
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

 describe('GET /api/health (HealthController)', () => {
 it('should return 200 OK without authentication', async () => {
 const response = await request(app.getHttpServer())
 .get('/api/health')
 .expect(200);

 expect(response.body).toHaveProperty('status');
 expect(response.body).toHaveProperty('timestamp');
 });

 it('should include database status in response', async () => {
 const response = await request(app.getHttpServer())
 .get('/api/health')
 .expect(200);

 expect(response.body).toHaveProperty('database');
 expect(['connected', 'disconnected']).toContain(response.body.database);
 });
 });

 describe('GET /api/health/ready (Readiness Probe)', () => {
 it('should return 200 OK without authentication', async () => {
 const response = await request(app.getHttpServer())
 .get('/api/health/ready')
 .expect(200);

 expect(response.body).toHaveProperty('status');
 expect(['ready', 'starting', 'not_ready']).toContain(
 response.body.status,
 );
 });
 });

 describe('GET /api (AppController root)', () => {
 it('should return 200 OK without authentication', async () => {
 const response = await request(app.getHttpServer())
 .get('/api')
 .expect(200);

 expect(response.body).toHaveProperty('status');
 expect(response.body.status).toBe('ok');
 });
 });

 describe('GET /api/info (AppController info)', () => {
 it('should return 200 OK without authentication', async () => {
 const response = await request(app.getHttpServer())
 .get('/api/info')
 .expect(200);

 expect(response.body).toHaveProperty('version');
 expect(response.body).toHaveProperty('environment');
 });
 });

 describe('Protected endpoints still require authentication', () => {
 it('should return 401 Unauthorized for /api/v1/etps without token', async () => {
 await request(app.getHttpServer()).get('/api/v1/etps').expect(401);
 });

 it('should return 401 Unauthorized for /api/v1/users/me without token', async () => {
 await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
 });
 });
});
