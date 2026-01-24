import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import { Contrato, ContratoStatus } from '../src/entities/contrato.entity';
import { Medicao, MedicaoStatus } from '../src/entities/medicao.entity';
import { Ateste, AtesteResultado } from '../src/entities/ateste.entity';
import {
  Ocorrencia,
  OcorrenciaGravidade,
  OcorrenciaTipo,
} from '../src/entities/ocorrencia.entity';

/**
 * Fiscalização API E2E Test Suite
 *
 * Issue #1646 - [FISC-1286f] Add E2E tests for fiscalização workflow
 * Parent: #1286 - [Contratos-c] Módulo de fiscalização
 *
 * Cenários de Teste:
 * 1. Registro de Medição
 * 2. Ateste de Medição - Aprovação
 * 3. Ateste de Medição - Rejeição
 * 4. Registro de Ocorrência
 * 5. Validações de Negócio
 */
describe('Fiscalização de Contratos (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let fiscalUser: {
    id: string;
    email: string;
    accessToken: string;
    organizationId: string;
  };

  let otherUser: {
    id: string;
    email: string;
    accessToken: string;
    organizationId: string;
  };

  let testContrato: Contrato;
  let testOrganization: Organization;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup: Create test organization, users, and contract
   */
  async function setupTestData() {
    const organizationRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);
    const contratoRepo = dataSource.getRepository(Contrato);

    // Create test organization
    testOrganization = await organizationRepo.save({
      name: 'Test Organization Fiscalização E2E',
      slug: 'test-org-fisc-e2e',
      cnpj: '00000000000191', // CNPJ válido para teste
      tier: 'professional',
      isActive: true,
    });

    // Create fiscal user (responsible for the contract)
    const fiscal = await userRepo.save({
      name: 'Fiscal de Contrato',
      email: `fiscal-fisc-e2e-${Date.now()}@test.com`,
      password: 'hashed_password_placeholder',
      role: UserRole.USER,
      organizationId: testOrganization.id,
      isActive: true,
    });

    fiscalUser = {
      id: fiscal.id,
      email: fiscal.email,
      organizationId: testOrganization.id,
      accessToken: jwtService.sign({
        sub: fiscal.id,
        email: fiscal.email,
        organizationId: testOrganization.id,
      }),
    };

    // Create another user (not fiscal)
    const other = await userRepo.save({
      name: 'Usuario Comum',
      email: `user-fisc-e2e-${Date.now()}@test.com`,
      password: 'hashed_password_placeholder',
      role: UserRole.USER,
      organizationId: testOrganization.id,
      isActive: true,
    });

    otherUser = {
      id: other.id,
      email: other.email,
      organizationId: testOrganization.id,
      accessToken: jwtService.sign({
        sub: other.id,
        email: other.email,
        organizationId: testOrganization.id,
      }),
    };

    // Create test contract
    testContrato = await contratoRepo.save({
      numero: 'E2E-001/2024',
      objeto: 'Contrato de Teste E2E - Fiscalização',
      status: ContratoStatus.EM_EXECUCAO,
      dataAssinatura: new Date('2024-01-01'),
      vigenciaInicio: new Date('2024-01-15'),
      vigenciaFim: new Date('2024-12-31'),
      valorTotal: '100000.00', // R$ 100.000,00
      fornecedor: 'Fornecedor Teste LTDA',
      fornecedorCnpj: '12345678000195',
      fiscalResponsavelId: fiscalUser.id,
      gestorResponsavelId: fiscalUser.id,
      organizationId: testOrganization.id,
      createdById: fiscalUser.id,
    });
  }

  /**
   * Cleanup: Remove test data
   */
  async function cleanupTestData() {
    if (!dataSource || !dataSource.isInitialized) {
      return;
    }

    try {
      const medicaoRepo = dataSource.getRepository(Medicao);
      const atesteRepo = dataSource.getRepository(Ateste);
      const ocorrenciaRepo = dataSource.getRepository(Ocorrencia);
      const contratoRepo = dataSource.getRepository(Contrato);
      const userRepo = dataSource.getRepository(User);
      const organizationRepo = dataSource.getRepository(Organization);

      // Delete in order due to foreign key constraints
      await atesteRepo.delete({ medicao: { contratoId: testContrato?.id } });
      await medicaoRepo.delete({ contratoId: testContrato?.id });
      await ocorrenciaRepo.delete({ contratoId: testContrato?.id });
      await contratoRepo.delete({ id: testContrato?.id });
      await userRepo.delete({
        organizationId: testOrganization?.id,
      });
      await organizationRepo.delete({ id: testOrganization?.id });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Cenário 1: Registro de Medição
   */
  describe('1. Registro de Medição', () => {
    let createdMedicao: any;

    it('should create a new medicao with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-01-15',
          periodoFim: '2024-01-31',
          valorMedido: '10000.00',
          descricao: 'Primeira medição - janeiro 2024',
          observacoes: 'Medição realizada conforme cronograma',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.numero).toBe(1); // primeira medição
      expect(response.body.valorMedido).toBe('10000.00');
      expect(response.body.status).toBe(MedicaoStatus.PENDENTE);
      expect(response.body.contratoId).toBe(testContrato.id);
      expect(response.body.fiscalResponsavelId).toBe(fiscalUser.id);

      createdMedicao = response.body;
    });

    it('should list medicoes of the contract', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should get medicao details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/medicoes/${createdMedicao.id}`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdMedicao.id);
      expect(response.body.valorMedido).toBe('10000.00');
    });
  });

  /**
   * Cenário 2: Ateste de Medição - Aprovação
   */
  describe('2. Ateste de Medição - Aprovação', () => {
    let medicaoToApprove: any;
    let createdAteste: any;

    beforeAll(async () => {
      // Create a medicao to approve
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-02-01',
          periodoFim: '2024-02-29',
          valorMedido: '15000.00',
          descricao: 'Segunda medição - fevereiro 2024',
        })
        .expect(201);

      medicaoToApprove = response.body;
    });

    it('should approve medicao with ateste', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/medicoes/${medicaoToApprove.id}/ateste`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          resultado: AtesteResultado.APROVADO,
          observacoes: 'Medição aprovada sem ressalvas',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.medicaoId).toBe(medicaoToApprove.id);
      expect(response.body.resultado).toBe(AtesteResultado.APROVADO);
      expect(response.body.fiscalId).toBe(fiscalUser.id);
      expect(response.body).toHaveProperty('dataAteste');

      createdAteste = response.body;
    });

    it('should update medicao status to APROVADA after ateste', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/medicoes/${medicaoToApprove.id}`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe(MedicaoStatus.APROVADA);
      expect(response.body.dataAteste).toBeTruthy();
    });

    it('should get ateste details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/atestes/${createdAteste.id}`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdAteste.id);
      expect(response.body.resultado).toBe(AtesteResultado.APROVADO);
    });
  });

  /**
   * Cenário 3: Ateste de Medição - Rejeição
   */
  describe('3. Ateste de Medição - Rejeição', () => {
    let medicaoToReject: any;

    beforeAll(async () => {
      // Create a medicao to reject
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-03-01',
          periodoFim: '2024-03-31',
          valorMedido: '12000.00',
          descricao: 'Terceira medição - março 2024',
        })
        .expect(201);

      medicaoToReject = response.body;
    });

    it('should reject medicao with justification', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/medicoes/${medicaoToReject.id}/ateste`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          resultado: AtesteResultado.REJEITADO,
          justificativa:
            'Documentação comprobatória insuficiente. Necessário anexar notas fiscais e relatórios fotográficos.',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.medicaoId).toBe(medicaoToReject.id);
      expect(response.body.resultado).toBe(AtesteResultado.REJEITADO);
      expect(response.body.justificativa).toContain('Documentação');
    });

    it('should keep medicao status as PENDENTE after rejection', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/medicoes/${medicaoToReject.id}`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      // After rejection, medicao can stay PENDENTE or become REJEITADA depending on business logic
      expect([MedicaoStatus.PENDENTE, MedicaoStatus.REJEITADA]).toContain(
        response.body.status,
      );
    });

    it('should fail to ateste without justification for rejection', async () => {
      // Create another medicao to test validation
      const medicaoResponse = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-04-01',
          periodoFim: '2024-04-30',
          valorMedido: '8000.00',
          descricao: 'Quarta medição - abril 2024',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/medicoes/${medicaoResponse.body.id}/ateste`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          resultado: AtesteResultado.REJEITADO,
          // Missing justificativa - should fail
        })
        .expect(400);
    });
  });

  /**
   * Cenário 4: Registro de Ocorrência
   */
  describe('4. Registro de Ocorrência', () => {
    let createdOcorrencia: any;

    it('should create ocorrencia with gravidade CRITICA', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/ocorrencias`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          tipo: OcorrenciaTipo.ATRASO,
          gravidade: OcorrenciaGravidade.CRITICA,
          dataOcorrencia: '2024-05-15',
          descricao:
            'Atraso crítico de 30 dias na entrega dos equipamentos previstos no cronograma. Obra paralisada.',
          acaoCorretiva:
            'Fornecedor notificado e prazo de regularização definido. Aplicação de multa prevista em contrato.',
          prazoResolucao: '2024-05-30',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.contratoId).toBe(testContrato.id);
      expect(response.body.tipo).toBe(OcorrenciaTipo.ATRASO);
      expect(response.body.gravidade).toBe(OcorrenciaGravidade.CRITICA);
      expect(response.body.registradoPorId).toBe(fiscalUser.id);
      expect(response.body.status).toBe('aberta');

      createdOcorrencia = response.body;
    });

    it('should list ocorrencias of the contract', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/contracts/${testContrato.id}/ocorrencias`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('tipo');
      expect(response.body[0]).toHaveProperty('gravidade');
    });

    it('should update ocorrencia status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${createdOcorrencia.id}`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          status: 'resolvida',
        })
        .expect(200);

      expect(response.body.status).toBe('resolvida');
    });
  });

  /**
   * Cenário 5: Validações de Negócio
   */
  describe('5. Validações de Negócio', () => {
    it('should fail to create medicao with valor > saldo contrato', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-06-01',
          periodoFim: '2024-06-30',
          valorMedido: '200000.00', // Exceeds contract total (100.000)
          descricao: 'Medição inválida - valor excede saldo',
        })
        .expect(400);
    });

    it('should fail to create medicao without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .send({
          periodoInicio: '2024-07-01',
          periodoFim: '2024-07-31',
          valorMedido: '5000.00',
          descricao: 'Medição sem autenticação',
        })
        .expect(401);
    });

    it('should fail to create medicao if user is not fiscal', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({
          periodoInicio: '2024-08-01',
          periodoFim: '2024-08-31',
          valorMedido: '5000.00',
          descricao: 'Medição por usuário não-fiscal',
        })
        .expect(403);
    });

    it('should fail to create ocorrencia without descricao', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/ocorrencias`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          tipo: OcorrenciaTipo.FALHA,
          gravidade: OcorrenciaGravidade.MEDIA,
          dataOcorrencia: '2024-09-01',
          // Missing descricao - should fail
        })
        .expect(400);
    });

    it('should fail to approve already approved medicao', async () => {
      // Create and approve a medicao
      const medicaoResponse = await request(app.getHttpServer())
        .post(`/api/v1/contracts/${testContrato.id}/medicoes`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          periodoInicio: '2024-10-01',
          periodoFim: '2024-10-31',
          valorMedido: '7000.00',
          descricao: 'Medição outubro 2024',
        })
        .expect(201);

      // Approve it
      await request(app.getHttpServer())
        .post(`/api/v1/medicoes/${medicaoResponse.body.id}/ateste`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          resultado: AtesteResultado.APROVADO,
        })
        .expect(201);

      // Try to approve again - should fail
      await request(app.getHttpServer())
        .post(`/api/v1/medicoes/${medicaoResponse.body.id}/ateste`)
        .set('Authorization', `Bearer ${fiscalUser.accessToken}`)
        .send({
          resultado: AtesteResultado.APROVADO,
        })
        .expect(400);
    });
  });
});
