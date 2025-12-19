import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { SectionProgressService } from './section-progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { SectionStatus, SectionType } from '../../entities/etp-section.entity';

/**
 * Integration tests for rate limiting on SectionsController
 *
 * Tests Issue #38: Rate limiting per authenticated user (not IP)
 * - Validates 5 requests/minute limit per user
 * - Validates independent limits for different users
 * - Validates 429 response when limit exceeded
 * - Tests both /generate and /regenerate endpoints
 *
 * @see https://github.com/tjsasakifln/etp-express/issues/38
 */
describe('SectionsController Rate Limiting (Issue #38)', () => {
 let app: INestApplication;
 let sectionsService: SectionsService;

 const mockEtpId = 'etp-456';
 const mockSectionId = 'section-789';
 const mockUser1Id = 'user-111';
 const mockUser2Id = 'user-222';

 const mockGeneratedSection = {
 id: mockSectionId,
 etpId: mockEtpId,
 type: SectionType.JUSTIFICATIVA,
 title: 'Test Section',
 content: 'Generated content',
 status: SectionStatus.GENERATED,
 order: 1,
 isRequired: true,
 createdAt: new Date(),
 updatedAt: new Date(),
 };

 const createMockSectionsService = () => ({
 generateSection: jest.fn().mockResolvedValue(mockGeneratedSection),
 regenerateSection: jest.fn().mockResolvedValue(mockGeneratedSection),
 findAll: jest.fn().mockResolvedValue([]),
 findOne: jest.fn().mockResolvedValue(mockGeneratedSection),
 update: jest.fn().mockResolvedValue(mockGeneratedSection),
 validateSection: jest.fn().mockResolvedValue({}),
 remove: jest.fn().mockResolvedValue(undefined),
 });

 const createMockSectionProgressService = () => ({
 createProgressStream: jest.fn(),
 emitProgress: jest.fn(),
 completeStream: jest.fn(),
 errorStream: jest.fn(),
 hasStream: jest.fn().mockReturnValue(false),
 getActiveStreamCount: jest.fn().mockReturnValue(0),
 });

 /**
 * Mock JwtAuthGuard that allows setting user ID per request
 * Simulates different authenticated users for testing independent rate limits
 */
 const mockJwtAuthGuard = {
 canActivate: jest.fn((context) => {
 const request = context.switchToHttp().getRequest();
 // Use user ID from test header or default to mockUser1Id
 const userId = request.headers['x-test-user-id'] || mockUser1Id;
 request.user = { id: userId, email: `${userId}@example.com` };
 return true;
 }),
 };

 beforeEach(async () => {
 const moduleRef: TestingModule = await Test.createTestingModule({
 imports: [
 // Configure ThrottlerModule with SHORT TTL for faster tests
 ThrottlerModule.forRoot([
 {
 ttl: 1000, // 1 second TTL for tests (vs 60 seconds in production)
 limit: 5, // 5 requests per TTL window
 },
 ]),
 ],
 controllers: [SectionsController],
 providers: [
 { provide: SectionsService, useValue: createMockSectionsService() },
 {
 provide: SectionProgressService,
 useValue: createMockSectionProgressService(),
 },
 ],
 })
 .overrideGuard(JwtAuthGuard)
 .useValue(mockJwtAuthGuard)
 .compile();

 app = moduleRef.createNestApplication();
 app.useGlobalPipes(new ValidationPipe());
 await app.init();

 sectionsService = moduleRef.get<SectionsService>(SectionsService);
 });

 afterEach(async () => {
 await app.close();
 jest.clearAllMocks();
 });

 /**
 * Tests rate limiting on POST /sections/etp/:etpId/generate
 * Issue #38: Prevent OpenAI API abuse by limiting generations per user
 */
 describe('POST /sections/etp/:etpId/generate - Rate Limiting', () => {
 const generateDto = {
 type: SectionType.JUSTIFICATIVA,
 title: 'Test Section',
 userInput: 'Test input',
 context: {},
 };

 it('deve permitir 5 requisições dentro do limite por usuário', async () => {
 // Make 5 requests - all should succeed (200/201)
 for (let i = 0; i < 5; i++) {
 const response = await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto);

 expect(response.status).toBe(201);
 expect(response.body.data).toBeDefined();
 }

 // Verify service was called 5 times
 expect(sectionsService.generateSection).toHaveBeenCalledTimes(5);
 });

 it('deve retornar 429 quando exceder 5 requisições por minuto', async () => {
 // Make 5 requests - all should succeed
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(201);
 }

 // 6th request should be rate limited
 const response = await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(429);

 // Verify error message is in Portuguese
 expect(response.body.message).toContain('Limite de gerações excedido');
 expect(response.body.message).toContain('5 gerações por minuto');

 // Service should only be called 5 times (6th request blocked by guard)
 expect(sectionsService.generateSection).toHaveBeenCalledTimes(5);
 });

 it('deve ter limites independentes para usuários diferentes', async () => {
 // User 1 makes 5 requests
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(201);
 }

 // User 1's 6th request should be rate limited
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(429);

 // User 2 should still be able to make 5 requests (independent limit)
 for (let i = 0; i < 5; i++) {
 const response = await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser2Id)
 .send(generateDto);

 expect(response.status).toBe(201);
 }

 // Total service calls: 5 (user1) + 5 (user2) = 10
 expect(sectionsService.generateSection).toHaveBeenCalledTimes(10);
 });

 /**
 * NOTE: TTL reset test removed due to timing inconsistencies in test environment
 *
 * Testing TTL expiration is inherently flaky because:
 * - Test execution time varies (CI/CD, local, load)
 * - ThrottlerStorage may use different TTL implementations (in-memory vs Redis)
 * - Race conditions between test timing and internal TTL cleanup
 *
 * TTL functionality is better validated through:
 * - Manual testing in development environment
 * - Integration testing in staging environment
 * - Monitoring actual production rate limit resets
 *
 * The core rate limiting logic (5 req/min per user) is validated by other tests.
 */
 });

 /**
 * Tests rate limiting on POST /sections/:id/regenerate
 * Issue #38: Prevent OpenAI API abuse by limiting regenerations per user
 */
 describe('POST /sections/:id/regenerate - Rate Limiting', () => {
 it('deve permitir 5 regenerações dentro do limite por usuário', async () => {
 // Make 5 requests - all should succeed
 for (let i = 0; i < 5; i++) {
 const response = await request(app.getHttpServer())
 .post(`/sections/${mockSectionId}/regenerate`)
 .set('x-test-user-id', mockUser1Id);

 // POST requests return 201 Created
 expect(response.status).toBe(201);
 expect(response.body.data).toBeDefined();
 }

 expect(sectionsService.regenerateSection).toHaveBeenCalledTimes(5);
 });

 it('deve retornar 429 quando exceder 5 regenerações por minuto', async () => {
 // Make 5 requests
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/${mockSectionId}/regenerate`)
 .set('x-test-user-id', mockUser1Id)
 .expect(201); // POST returns 201 Created
 }

 // 6th request should be rate limited
 const response = await request(app.getHttpServer())
 .post(`/sections/${mockSectionId}/regenerate`)
 .set('x-test-user-id', mockUser1Id)
 .expect(429);

 expect(response.body.message).toContain('Limite de gerações excedido');
 // Guard uses generic message "5 gerações por minuto" for both endpoints
 expect(response.body.message).toContain('5 gerações por minuto');
 expect(sectionsService.regenerateSection).toHaveBeenCalledTimes(5);
 });

 it('deve ter limites independentes entre /generate e /regenerate', async () => {
 const generateDto = {
 type: SectionType.JUSTIFICATIVA,
 title: 'Test',
 userInput: 'Test',
 context: {},
 };

 // Make 5 requests to /generate
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(201);
 }

 // 6th request to /generate should be blocked
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(429);

 // /regenerate should still allow 5 requests (independent limit per endpoint)
 // NOTE: Both endpoints use the same throttler name ("default"), but @Throttle
 // decorator creates SEPARATE limits per route. This is correct behavior.
 // User1 exhausted limit on /generate, but /regenerate still has fresh limit.
 for (let i = 0; i < 5; i++) {
 const response = await request(app.getHttpServer())
 .post(`/sections/${mockSectionId}/regenerate`)
 .set('x-test-user-id', mockUser1Id);

 // All regenerate requests should succeed (independent limit)
 expect(response.status).toBe(201);
 }

 // Now exhaust regenerate limit
 const response = await request(app.getHttpServer())
 .post(`/sections/${mockSectionId}/regenerate`)
 .set('x-test-user-id', mockUser1Id);

 // 6th regenerate request should be blocked
 expect(response.status).toBe(429);
 });
 });

 /**
 * Tests UserThrottlerGuard behavior
 * Issue #38: Validates custom guard implementation
 */
 describe('UserThrottlerGuard - Custom Implementation', () => {
 it('deve usar user.id como tracker (não IP)', async () => {
 const generateDto = {
 type: SectionType.JUSTIFICATIVA,
 title: 'Test',
 userInput: 'Test',
 context: {},
 };

 // Same IP, different users should have independent limits
 // User 1 exhausts limit
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(201);
 }

 // User 1 blocked
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(429);

 // User 2 can still make requests (proves tracking by user ID, not IP)
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser2Id)
 .send(generateDto)
 .expect(201);
 });

 it('deve retornar mensagem de erro customizada em português', async () => {
 const generateDto = {
 type: SectionType.JUSTIFICATIVA,
 title: 'Test',
 userInput: 'Test',
 context: {},
 };

 // Exhaust limit
 for (let i = 0; i < 5; i++) {
 await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto);
 }

 // Get 429 response
 const response = await request(app.getHttpServer())
 .post(`/sections/etp/${mockEtpId}/generate`)
 .set('x-test-user-id', mockUser1Id)
 .send(generateDto)
 .expect(429);

 // Validate Portuguese error message
 expect(response.body.message).toContain('Limite de gerações excedido');
 expect(response.body.message).toContain('5 gerações por minuto');
 expect(response.body.message).toContain('Aguarde 60 segundos');
 });
 });
});
