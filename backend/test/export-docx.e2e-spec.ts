import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Etp, EtpStatus } from '../src/entities/etp.entity';
import {
 EtpSection,
 SectionType,
 SectionStatus,
} from '../src/entities/etp-section.entity';
import { User } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import * as AdmZip from 'adm-zip';

/**
 * Export DOCX E2E Test Suite
 *
 * Tests complete DOCX export flow via HTTP:
 * - GET /export/etp/:id/docx - Export ETP to Word document
 *
 * Requirements from issue #552:
 * ✅ Generate valid .docx file (ZIP format with correct magic bytes)
 * ✅ Include all sections in document
 * ✅ Set correct document metadata
 * ✅ Return 404 for non-existent ETP
 * ✅ Return 401 for unauthorized requests
 */
describe('Export DOCX (e2e)', () => {
 let app: INestApplication;
 let dataSource: DataSource;
 let jwtService: JwtService;

 let testUser: {
 id: string;
 email: string;
 accessToken: string;
 organizationId: string;
 };

 let testEtp: Etp;
 let testOrganization: Organization;

 beforeAll(async () => {
 const moduleFixture: TestingModule = await Test.createTestingModule({
 imports: [AppModule],
 }).compile();

 app = moduleFixture.createNestApplication();

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

 await setupTestData();
 });

 afterAll(async () => {
 await cleanupTestData();
 await app.close();
 });

 /**
 * Setup: Create test organization, user, ETP and sections
 */
 async function setupTestData() {
 const organizationRepo = dataSource.getRepository(Organization);
 const userRepo = dataSource.getRepository(User);
 const etpRepo = dataSource.getRepository(Etp);
 const sectionRepo = dataSource.getRepository(EtpSection);

 // Create test organization
 testOrganization = await organizationRepo.save({
 name: 'Test Organization DOCX E2E',
 slug: 'test-org-docx-e2e',
 cnpj: '12345678000199',
 isActive: true,
 });

 // Create test user
 const user = await userRepo.save({
 email: 'docx-e2e-test@example.com',
 password: '$2b$10$hashedpassword', // Pre-hashed for testing
 name: 'DOCX E2E Test User',
 role: 'servidor',
 organization: testOrganization,
 isActive: true,
 });

 // Generate JWT token
 const accessToken = jwtService.sign({
 sub: user.id,
 email: user.email,
 organizationId: testOrganization.id,
 });

 testUser = {
 id: user.id,
 email: user.email,
 accessToken,
 organizationId: testOrganization.id,
 };

 // Create test ETP
 testEtp = await etpRepo.save({
 title: 'ETP para Teste E2E Export DOCX',
 description: 'Descrição completa do ETP de teste',
 objeto: 'Aquisição de equipamentos de informática',
 numeroProcesso: '2025/001234',
 valorEstimado: 150000.5,
 status: EtpStatus.COMPLETED,
 currentVersion: 1,
 completionPercentage: 100,
 organization: testOrganization,
 createdBy: user,
 metadata: {
 unidadeRequisitante: 'Departamento de TI',
 responsavelTecnico: 'João da Silva',
 },
 });

 // Create test sections
 const sections = [
 {
 type: SectionType.INTRODUCAO,
 title: 'Introdução',
 content:
 'Este documento apresenta o Estudo Técnico Preliminar para aquisição de equipamentos.',
 order: 1,
 status: SectionStatus.APPROVED,
 etp: testEtp,
 },
 {
 type: SectionType.NECESSIDADE,
 title: 'Descrição da Necessidade',
 content:
 '**Justificativa:** A necessidade surge da demanda por modernização do parque tecnológico.\n\n- Item 1: Computadores\n- Item 2: Monitores\n- Item 3: Periféricos',
 order: 2,
 status: SectionStatus.APPROVED,
 etp: testEtp,
 },
 {
 type: SectionType.REQUISITOS,
 title: 'Requisitos da Contratação',
 content:
 'Os requisitos mínimos incluem:\n\n- Processador Intel Core i7 ou equivalente\n- 16GB RAM\n- SSD 512GB',
 order: 3,
 status: SectionStatus.APPROVED,
 etp: testEtp,
 },
 ];

 await sectionRepo.save(sections);
 }

 /**
 * Cleanup: Remove test data
 */
 async function cleanupTestData() {
 if (dataSource && dataSource.isInitialized) {
 try {
 const sectionRepo = dataSource.getRepository(EtpSection);
 const etpRepo = dataSource.getRepository(Etp);
 const userRepo = dataSource.getRepository(User);
 const organizationRepo = dataSource.getRepository(Organization);

 // Delete in correct order due to foreign keys
 await sectionRepo.delete({ etp: { id: testEtp?.id } });
 if (testEtp?.id) {
 await etpRepo.delete(testEtp.id);
 }
 if (testUser?.id) {
 await userRepo.delete(testUser.id);
 }
 if (testOrganization?.id) {
 await organizationRepo.delete(testOrganization.id);
 }
 } catch (error) {
 console.error('Error cleaning up test data:', error);
 }
 }
 }

 describe('GET /export/etp/:id/docx', () => {
 it('should generate valid .docx file with correct magic bytes', async () => {
 const response = await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 // Check content type
 expect(response.headers['content-type']).toBe(
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 );

 // Check content disposition
 expect(response.headers['content-disposition']).toContain(
 `attachment; filename="ETP-${testEtp.id}.docx"`,
 );

 // Validate DOCX magic bytes (PK - ZIP format)
 const buffer = response.body as Buffer;
 expect(buffer[0]).toBe(0x50); // 'P'
 expect(buffer[1]).toBe(0x4b); // 'K'

 // Validate it's a valid ZIP archive
 expect(() => new AdmZip(buffer)).not.toThrow();
 });

 it('should include all sections in the DOCX document', async () => {
 const response = await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 const buffer = response.body as Buffer;
 const zip = new AdmZip(buffer);

 // DOCX files have a document.xml inside word/ folder
 const documentXml = zip.getEntry('word/document.xml');
 expect(documentXml).toBeDefined();

 const content = documentXml!.getData().toString('utf-8');

 // Check that ETP title is present
 expect(content).toContain('ETP para Teste E2E Export DOCX');

 // Check that sections are present (section titles should appear)
 expect(content).toContain('Introdução');
 expect(content).toContain('Descrição da Necessidade');
 expect(content).toContain('Requisitos da Contratação');
 });

 it('should set correct document metadata', async () => {
 const response = await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 const buffer = response.body as Buffer;
 const zip = new AdmZip(buffer);

 // DOCX files have core.xml with document properties
 const coreXml = zip.getEntry('docProps/core.xml');
 expect(coreXml).toBeDefined();

 const coreContent = coreXml!.getData().toString('utf-8');

 // Check document title matches ETP title
 expect(coreContent).toContain('ETP para Teste E2E Export DOCX');

 // Check subject contains objeto
 expect(coreContent).toContain('Aquisição de equipamentos de informática');
 });

 it('should return 404 for non-existent ETP', async () => {
 const nonExistentId = '00000000-0000-0000-0000-000000000000';

 const response = await request(app.getHttpServer())
 .get(`/export/etp/${nonExistentId}/docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(404);

 expect(response.body.message).toContain('não encontrado');
 });

 it('should return 401 for unauthorized requests', async () => {
 await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .expect(401);
 });

 it('should return 401 for invalid JWT token', async () => {
 await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .set('Authorization', 'Bearer invalid-token')
 .expect(401);
 });

 it('should generate DOCX with proper file size (not empty)', async () => {
 const response = await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}/docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 const buffer = response.body as Buffer;

 // DOCX should have reasonable size (at least 5KB for document with content)
 expect(buffer.length).toBeGreaterThan(5000);

 // Check content-length header matches actual size
 expect(parseInt(response.headers['content-length'], 10)).toBe(
 buffer.length,
 );
 });
 });

 describe('GET /export/etp/:id?format=docx', () => {
 it('should export to DOCX via format query parameter', async () => {
 const response = await request(app.getHttpServer())
 .get(`/export/etp/${testEtp.id}?format=docx`)
 .set('Authorization', `Bearer ${testUser.accessToken}`)
 .expect(200);

 expect(response.headers['content-type']).toBe(
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 );

 const buffer = response.body as Buffer;
 expect(buffer[0]).toBe(0x50); // 'P'
 expect(buffer[1]).toBe(0x4b); // 'K'
 });
 });
});
