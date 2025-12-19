import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

/**
 * LGPD Compliance E2E Test Suite
 *
 * Tests complete LGPD data export and deletion flows:
 * - GET /users/me/export - Data portability (Art. 18, II e V)
 * - DELETE /users/me - Right to deletion (Art. 18, VI)
 * - POST /users/cancel-deletion - Cancellation flow
 * - Retention policy - Hard delete after 30 days
 *
 * Requirements from issue #239 (sub-issue 113g):
 * ✅ Export returns complete data (user, etps, analytics, audit_logs)
 * ✅ Export excludes password
 * ✅ Export generates audit log
 * ✅ Delete with valid confirmation marks deletedAt
 * ✅ Delete without confirmation returns 400
 * ✅ Cascade delete removes ETPs
 * ✅ Deletion generates audit log
 * ✅ Cancellation reactivates account
 * ✅ Hard delete after 30 days removes permanently
 * ✅ Hard delete before 30 days does NOT remove
 */
describe('LGPD Compliance (e2e)', () => {
 let app: INestApplication;
 let dataSource: DataSource;
 let jwtService: JwtService;

 let testUser: {
 id: string;
 email: string;
 accessToken: string;
 };

 beforeAll(async () => {
 const moduleFixture: TestingModule = await Test.createTestingModule({
 imports: [AppModule],
 }).compile();

 app = moduleFixture.createNestApplication();

 // Apply same validation pipe as main.ts
 app.useGlobalPipes(
 new ValidationPipe({
 whitelist: true,
 forbidNonWhitelisted: true,
 transform: true,
 }),
 );

 await app.init();

 dataSource = moduleFixture.get<DataSource>(DataSource);
 jwtService = moduleFixture.get<JwtService>(JwtService);

 // Create test user and authenticate
 await setupTestUser();
 });

 afterAll(async () => {
 await cleanupTestData();
 await app.close();
 });

 /**
 * Setup: Create test user and get access token
 */
 async function setupTestUser() {
 // Register new test user
 const registerResponse = await request(app.getHttpServer())
 .post('/auth/register')
 .send({
 email: 'lgpd-test@example.com',
 password: 'SecurePass123!',
 name: 'LGPD Test User',
 role: 'servidor',
 orgao: 'CONFENGE',
 cargo: 'Testador',
 })
 .expect(201);

 testUser = {
 id: registerResponse.body.data.user.id,
 email: registerResponse.body.data.user.email,
 accessToken: registerResponse.body.data.accessToken,
 };
 }

 /**
 * Cleanup: Remove test data
 */
 async function cleanupTestData() {
 if (dataSource && dataSource.isInitialized) {
 try {
 // Hard delete test user and cascaded entities
 await dataSource.query(
 `DELETE FROM users WHERE email LIKE 'lgpd-test%'`,
 );
 } catch (error) {
 console.error('Cleanup failed:', error);
 }
 }
 }

 /**
 * Test Suite: Data Export (GET /users/me/export)
 */
 describe('GET /users/me/export (Data Portability)', () => {
 it('should export complete user data', async () => {
 const response = await request(app.getHttpServer())
 .get('/users/me/export')
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Verify response structure
 expect(response.body).toHaveProperty('data');
 expect(response.body.data).toHaveProperty('user');
 expect(response.body.data).toHaveProperty('etps');
 expect(response.body.data).toHaveProperty('analytics');
 expect(response.body.data).toHaveProperty('auditLogs');
 expect(response.body.data).toHaveProperty('exportMetadata');

 // Verify user data completeness
 expect(response.body.data.user.id).toBe(testUser.id);
 expect(response.body.data.user.email).toBe(testUser.email);

 // Verify arrays exist (may be empty for new user)
 expect(Array.isArray(response.body.data.etps)).toBe(true);
 expect(Array.isArray(response.body.data.analytics)).toBe(true);
 expect(Array.isArray(response.body.data.auditLogs)).toBe(true);

 // Verify metadata
 expect(response.body.data.exportMetadata).toHaveProperty('exportedAt');
 expect(response.body.data.exportMetadata).toHaveProperty('format');
 });

 it('should exclude password from export', async () => {
 const response = await request(app.getHttpServer())
 .get('/users/me/export')
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Password must NOT be present in export
 expect(response.body.data.user).not.toHaveProperty('password');
 });

 it('should create audit log for export', async () => {
 await request(app.getHttpServer())
 .get('/users/me/export')
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Query audit logs directly
 const auditLogs = await dataSource.query(
 `SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'DATA_EXPORT' ORDER BY timestamp DESC LIMIT 1`,
 [testUser.id],
 );

 expect(auditLogs.length).toBeGreaterThan(0);
 expect(auditLogs[0].action).toBe('DATA_EXPORT');
 expect(auditLogs[0].user_id).toBe(testUser.id);
 });

 it('should reject unauthenticated requests', async () => {
 await request(app.getHttpServer())
 .get('/users/me/export')
 // No Authorization header
 .expect(401);
 });
 });

 /**
 * Test Suite: Account Deletion (DELETE /users/me)
 */
 describe('DELETE /users/me (Right to Deletion)', () => {
 let deletionTestUser: {
 id: string;
 accessToken: string;
 etpId?: string;
 };

 beforeEach(async () => {
 // Create fresh user for deletion tests
 const registerResponse = await request(app.getHttpServer())
 .post('/auth/register')
 .send({
 email: `lgpd-delete-${Date.now()}@example.com`,
 password: 'SecurePass123!',
 name: 'Delete Test User',
 role: 'servidor',
 orgao: 'CONFENGE',
 cargo: 'Testador',
 })
 .expect(201);

 deletionTestUser = {
 id: registerResponse.body.data.user.id,
 accessToken: registerResponse.body.data.accessToken,
 };

 // Create an ETP for cascade delete testing
 const etpResponse = await request(app.getHttpServer())
 .post('/etps')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 title: 'Test ETP for Deletion',
 category: 'infraestrutura',
 })
 .expect(201);

 deletionTestUser.etpId = etpResponse.body.data.id;
 });

 it('should soft delete account with valid confirmation', async () => {
 const response = await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 confirmation: 'DELETE MY ACCOUNT',
 reason: 'E2E test deletion',
 })
 .expect(200);

 // Verify response
 expect(response.body).toHaveProperty('message');
 expect(response.body).toHaveProperty('deletionScheduledFor');

 // Verify soft delete in database
 const [user] = await dataSource.query(
 `SELECT deleted_at, scheduled_deletion_date FROM users WHERE id = $1`,
 [deletionTestUser.id],
 );

 expect(user.deleted_at).not.toBeNull();
 expect(user.scheduled_deletion_date).not.toBeNull();

 // Verify scheduled deletion is ~30 days from now
 const scheduledDate = new Date(user.scheduled_deletion_date);
 const now = new Date();
 const daysDifference = Math.floor(
 (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
 );
 expect(daysDifference).toBeGreaterThanOrEqual(29);
 expect(daysDifference).toBeLessThanOrEqual(31);
 });

 it('should reject deletion without valid confirmation', async () => {
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 confirmation: 'delete my account', // Wrong case
 })
 .expect(400);

 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 confirmation: 'YES', // Wrong phrase
 })
 .expect(400);
 });

 it('should cascade delete ETPs when account is deleted', async () => {
 // Delete account
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 confirmation: 'DELETE MY ACCOUNT',
 })
 .expect(200);

 // Verify ETPs are soft deleted
 const [etp] = await dataSource.query(
 `SELECT deleted_at FROM etps WHERE id = $1`,
 [deletionTestUser.etpId],
 );

 expect(etp.deleted_at).not.toBeNull();
 });

 it('should create audit log for deletion', async () => {
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${deletionTestUser.accessToken}`)
 .send({
 confirmation: 'DELETE MY ACCOUNT',
 reason: 'Audit log test',
 })
 .expect(200);

 // Query audit logs
 const auditLogs = await dataSource.query(
 `SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'ACCOUNT_DELETION' ORDER BY timestamp DESC LIMIT 1`,
 [deletionTestUser.id],
 );

 expect(auditLogs.length).toBeGreaterThan(0);
 expect(auditLogs[0].action).toBe('ACCOUNT_DELETION');
 expect(auditLogs[0].details).toContain('Audit log test');
 });
 });

 /**
 * Test Suite: Cancellation (POST /users/cancel-deletion)
 */
 describe('POST /users/cancel-deletion (Cancellation Flow)', () => {
 let cancellationTestUser: {
 id: string;
 accessToken: string;
 };

 beforeEach(async () => {
 // Create and soft delete user
 const registerResponse = await request(app.getHttpServer())
 .post('/auth/register')
 .send({
 email: `lgpd-cancel-${Date.now()}@example.com`,
 password: 'SecurePass123!',
 name: 'Cancel Test User',
 role: 'servidor',
 orgao: 'CONFENGE',
 cargo: 'Testador',
 })
 .expect(201);

 cancellationTestUser = {
 id: registerResponse.body.data.user.id,
 accessToken: registerResponse.body.data.accessToken,
 };

 // Soft delete the account
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${cancellationTestUser.accessToken}`)
 .send({
 confirmation: 'DELETE MY ACCOUNT',
 })
 .expect(200);
 });

 it('should reactivate account with valid cancellation token', async () => {
 // Generate cancellation token (simulating email link)
 const cancellationToken = jwtService.sign(
 {
 sub: cancellationTestUser.id,
 type: 'CANCEL_DELETION',
 },
 { expiresIn: '30d' },
 );

 const response = await request(app.getHttpServer())
 .post('/users/cancel-deletion')
 .send({ token: cancellationToken })
 .expect(200);

 // Verify response
 expect(response.body).toHaveProperty('message');
 expect(response.body.accountReactivated).toBe(true);

 // Verify database state
 const [user] = await dataSource.query(
 `SELECT deleted_at, scheduled_deletion_date FROM users WHERE id = $1`,
 [cancellationTestUser.id],
 );

 expect(user.deleted_at).toBeNull();
 expect(user.scheduled_deletion_date).toBeNull();
 });

 it('should reject invalid token', async () => {
 await request(app.getHttpServer())
 .post('/users/cancel-deletion')
 .send({ token: 'invalid-token' })
 .expect(401);
 });

 it('should reject expired token', async () => {
 // Create expired token
 const expiredToken = jwtService.sign(
 {
 sub: cancellationTestUser.id,
 type: 'CANCEL_DELETION',
 },
 { expiresIn: '-1d' }, // Already expired
 );

 await request(app.getHttpServer())
 .post('/users/cancel-deletion')
 .send({ token: expiredToken })
 .expect(401);
 });

 it('should reject token with wrong type', async () => {
 // Create token with wrong type
 const wrongTypeToken = jwtService.sign(
 {
 sub: cancellationTestUser.id,
 type: 'ACCESS_TOKEN', // Wrong type
 },
 { expiresIn: '30d' },
 );

 await request(app.getHttpServer())
 .post('/users/cancel-deletion')
 .send({ token: wrongTypeToken })
 .expect(400);
 });
 });

 /**
 * Test Suite: Retention Policy (Hard Delete)
 */
 describe('Data Retention Policy (Hard Delete)', () => {
 it('should permanently delete accounts after 30 days', async () => {
 // Create test user
 const registerResponse = await request(app.getHttpServer())
 .post('/auth/register')
 .send({
 email: `lgpd-retention-old-${Date.now()}@example.com`,
 password: 'SecurePass123!',
 name: 'Retention Test User (Old)',
 role: 'servidor',
 orgao: 'CONFENGE',
 cargo: 'Testador',
 })
 .expect(201);

 const userId = registerResponse.body.data.user.id;
 const accessToken = registerResponse.body.data.accessToken;

 // Soft delete account
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${accessToken}`)
 .send({ confirmation: 'DELETE MY ACCOUNT' })
 .expect(200);

 // Manually set deleted_at to 31 days ago (simulate passage of time)
 await dataSource.query(
 `UPDATE users SET deleted_at = NOW() - INTERVAL '31 days', scheduled_deletion_date = NOW() - INTERVAL '1 day' WHERE id = $1`,
 [userId],
 );

 // Trigger hard delete purge (admin endpoint)
 const purgeResponse = await request(app.getHttpServer())
 .post('/users/admin/purge-deleted')
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Verify user was purged
 expect(purgeResponse.body.purgedCount).toBeGreaterThan(0);
 expect(purgeResponse.body.purgedUserIds).toContain(userId);

 // Verify user is completely removed from database
 const [result] = await dataSource.query(
 `SELECT COUNT(*) as count FROM users WHERE id = $1`,
 [userId],
 );

 expect(parseInt(result.count)).toBe(0);
 });

 it('should NOT delete accounts before 30 days', async () => {
 // Create test user
 const registerResponse = await request(app.getHttpServer())
 .post('/auth/register')
 .send({
 email: `lgpd-retention-new-${Date.now()}@example.com`,
 password: 'SecurePass123!',
 name: 'Retention Test User (New)',
 role: 'servidor',
 orgao: 'CONFENGE',
 cargo: 'Testador',
 })
 .expect(201);

 const userId = registerResponse.body.data.user.id;
 const accessToken = registerResponse.body.data.accessToken;

 // Soft delete account
 await request(app.getHttpServer())
 .delete('/users/me')
 .set('Authorization', `Bearer ${accessToken}`)
 .send({ confirmation: 'DELETE MY ACCOUNT' })
 .expect(200);

 // Set deleted_at to only 15 days ago (within 30-day grace period)
 await dataSource.query(
 `UPDATE users SET deleted_at = NOW() - INTERVAL '15 days', scheduled_deletion_date = NOW() + INTERVAL '15 days' WHERE id = $1`,
 [userId],
 );

 // Trigger hard delete purge
 const purgeResponse = await request(app.getHttpServer())
 .post('/users/admin/purge-deleted')
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Verify this user was NOT purged
 expect(purgeResponse.body.purgedUserIds).not.toContain(userId);

 // Verify user still exists in database
 const [result] = await dataSource.query(
 `SELECT COUNT(*) as count FROM users WHERE id = $1`,
 [userId],
 );

 expect(parseInt(result.count)).toBe(1);

 // Cleanup: hard delete this test user manually
 await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);
 });
 });
});
