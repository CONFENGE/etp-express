import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Contrato, ContratoStatus } from '../../entities/contrato.entity';
import { ContratoSyncLog } from '../../entities/contrato-sync-log.entity';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { ContratosGovBrSyncService } from '../../modules/contratos/services/contratos-govbr-sync.service';
import { ContratosGovBrAuthService } from '../../modules/gov-api/services/contratos-govbr-auth.service';

/**
 * Testes de Integração: Sincronização de Contratos Gov.br
 *
 * Valida fluxos completos de Push, Pull e Resolução de Conflitos
 * para integração com API Contratos.gov.br.
 *
 * Issue: #1678 - Testes de integração e documentação
 * Parent Issue: #1289 - Integração com Contratos Gov.br
 *
 * @see docs/integrations/contratos-gov-br.md
 */
describe('ContratosGovBrSync Integration Tests', () => {
  let app: INestApplication;
  let syncService: ContratosGovBrSyncService;
  let contratoRepository: Repository<Contrato>;
  let syncLogRepository: Repository<ContratoSyncLog>;
  let organizationRepository: Repository<Organization>;
  let userRepository: Repository<User>;
  let httpService: HttpService;

  // Mock data
  let testOrganization: Organization;
  let testUser: User;
  let testGestor: User;
  let testFiscal: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_DATABASE', 'etp_test'),
            entities: [Contrato, ContratoSyncLog, Organization, User],
            synchronize: true, // Apenas para testes
            dropSchema: true, // Limpar antes de cada run
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([
          Contrato,
          ContratoSyncLog,
          Organization,
          User,
        ]),
        HttpModule,
      ],
      providers: [ContratosGovBrSyncService, ContratosGovBrAuthService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    syncService = moduleFixture.get<ContratosGovBrSyncService>(
      ContratosGovBrSyncService,
    );
    contratoRepository = moduleFixture.get(getRepositoryToken(Contrato));
    syncLogRepository = moduleFixture.get(getRepositoryToken(ContratoSyncLog));
    organizationRepository = moduleFixture.get(
      getRepositoryToken(Organization),
    );
    userRepository = moduleFixture.get(getRepositoryToken(User));
    httpService = moduleFixture.get<HttpService>(HttpService);

    // Criar dados de teste
    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar contratos e logs antes de cada teste (preservar org e users)
    await contratoRepository.delete({});
    await syncLogRepository.delete({});
  });

  /**
   * Popula banco com organização e usuários de teste
   */
  async function seedTestData() {
    testOrganization = await organizationRepository.save({
      name: 'Prefeitura de Teste',
      cnpj: '12.345.678/0001-99',
      type: 'municipal',
      isActive: true,
    });

    testUser = await userRepository.save({
      email: 'admin@test.gov.br',
      name: 'Admin Teste',
      organizationId: testOrganization.id,
      role: 'admin',
      isActive: true,
    });

    testGestor = await userRepository.save({
      email: 'gestor@test.gov.br',
      name: 'Gestor Teste',
      cargo: 'Gestor de Contratos - CPF: 123.456.789-01',
      organizationId: testOrganization.id,
      role: 'user',
      isActive: true,
    });

    testFiscal = await userRepository.save({
      email: 'fiscal@test.gov.br',
      name: 'Fiscal Teste',
      cargo: 'Fiscal de Contratos - CPF: 987.654.321-09',
      organizationId: testOrganization.id,
      role: 'user',
      isActive: true,
    });
  }

  /**
   * Cria contrato de teste válido para sincronização
   */
  async function createTestContrato(
    overrides?: Partial<Contrato>,
  ): Promise<Contrato> {
    const contrato = contratoRepository.create({
      organizationId: testOrganization.id,
      numero: '001/2024-CONTRATO',
      numeroProcesso: '2024/001',
      objeto: 'Aquisição de equipamentos de TI',
      descricaoObjeto: 'Aquisição de notebooks e monitores para a prefeitura',
      contratadoCnpj: '11.222.333/0001-44',
      contratadoRazaoSocial: 'Empresa Tech Ltda',
      contratadoNomeFantasia: 'Tech Corp',
      contratadoEndereco: 'Rua das Flores, 123',
      contratadoTelefone: '(11) 98765-4321',
      contratadoEmail: 'contato@techcorp.com.br',
      valorGlobal: '100000.00',
      vigenciaInicio: new Date('2024-01-01'),
      vigenciaFim: new Date('2024-12-31'),
      status: ContratoStatus.ASSINADO,
      dataAssinatura: new Date('2023-12-15'),
      gestorResponsavelId: testGestor.id,
      fiscalResponsavelId: testFiscal.id,
      createdById: testUser.id,
      versao: 1,
      ...overrides,
    });

    return await contratoRepository.save(contrato);
  }

  // ============================================
  // PUSH SYNC TESTS
  // ============================================

  describe('Push Sync - Envio de contratos para Gov.br', () => {
    it('should push new contrato to Gov.br successfully', async () => {
      // Arrange
      const contrato = await createTestContrato();

      // Mock API response
      const mockResponse: AxiosResponse = {
        data: {
          id: 'govbr-123456',
          numero_contrato: contrato.numero,
          created_at: new Date().toISOString(),
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      // Act
      await syncService.pushContrato(contrato.id);

      // Assert
      const updated = await contratoRepository.findOne({
        where: { id: contrato.id },
      });

      expect(updated).toBeDefined();
      expect(updated!.govBrId).toBe('govbr-123456');
      expect(updated!.govBrSyncStatus).toBe('synced');
      expect(updated!.govBrSyncedAt).toBeDefined();
      expect(updated!.govBrSyncErrorMessage).toBeNull();
    });

    it('should handle push errors gracefully', async () => {
      // Arrange
      const contrato = await createTestContrato();

      // Mock API error
      const errorResponse = {
        response: {
          data: {
            message: 'API Gov.br unavailable',
          },
        },
      };

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => errorResponse));

      // Act & Assert
      await expect(syncService.pushContrato(contrato.id)).rejects.toThrow(
        'Failed to sync contrato to Gov.br',
      );

      const updated = await contratoRepository.findOne({
        where: { id: contrato.id },
      });

      expect(updated!.govBrSyncStatus).toBe('error');
      expect(updated!.govBrSyncErrorMessage).toContain(
        'API Gov.br unavailable',
      );
    });

    it('should reject push if required fields are missing', async () => {
      // Arrange - contrato sem objeto (campo obrigatório)
      const contrato = await createTestContrato({
        objeto: null as any,
      });

      // Act & Assert
      await expect(syncService.pushContrato(contrato.id)).rejects.toThrow(
        'Contract validation failed for Gov.br sync',
      );
    });

    it('should reject push if gestor CPF is missing', async () => {
      // Arrange - gestor sem CPF no campo cargo
      const gestorSemCpf = await userRepository.save({
        email: 'gestor_sem_cpf@test.gov.br',
        name: 'Gestor Sem CPF',
        cargo: 'Gestor de Contratos', // Sem CPF
        organizationId: testOrganization.id,
        role: 'user',
        isActive: true,
      });

      const contrato = await createTestContrato({
        gestorResponsavelId: gestorSemCpf.id,
      });

      // Act & Assert
      await expect(syncService.pushContrato(contrato.id)).rejects.toThrow(
        'gestorResponsavel CPF could not be determined',
      );
    });
  });

  // ============================================
  // PULL SYNC TESTS
  // ============================================

  describe('Pull Sync - Importação de contratos do Gov.br', () => {
    it('should pull contratos from Gov.br and create new records', async () => {
      // Arrange - Mock API response com 2 contratos
      const mockContratos = [
        {
          numero_contrato: '002/2024-GOVBR',
          numero_processo: '2024/002',
          objeto_contrato: 'Serviços de TI',
          descricao_detalhada: 'Manutenção de sistemas',
          cnpj_contratado: '22.333.444/0001-55',
          razao_social_contratado: 'TI Solutions',
          nome_fantasia: 'TI Sol',
          endereco_contratado: 'Av. Principal, 500',
          telefone_contratado: '(11) 99999-8888',
          email_contratado: 'contato@tisol.com.br',
          valor_global: 200000,
          valor_unitario: null,
          unidade_medida: null,
          quantidade: null,
          data_inicio_vigencia: '2024-02-01',
          data_fim_vigencia: '2024-02-28',
          prazo_execucao_dias: 28,
          condicoes_prorrogacao: null,
          cpf_gestor: '123.456.789-01',
          cpf_fiscal: '987.654.321-09',
          dotacao_orcamentaria: '3.3.90.39',
          fonte_recursos: 'Recursos Próprios',
          condicoes_pagamento: 'À vista',
          garantia_contratual: null,
          indice_reajuste: null,
          sancoes: null,
          fundamentacao_legal: 'Lei 14.133/2021',
          local_entrega: 'Sede da Prefeitura',
          clausulas_contratuais: null,
          status_contrato: 2, // ASSINADO
          data_assinatura: '2024-01-25',
          data_publicacao: null,
          referencia_publicacao: null,
          versao: 1,
          motivo_rescisao: null,
          data_rescisao: null,
        },
        {
          numero_contrato: '003/2024-GOVBR',
          numero_processo: '2024/003',
          objeto_contrato: 'Obras de infraestrutura',
          descricao_detalhada: 'Pavimentação de vias',
          cnpj_contratado: '33.444.555/0001-66',
          razao_social_contratado: 'Construtora ABC',
          nome_fantasia: 'ABC Obras',
          endereco_contratado: 'Rua das Obras, 100',
          telefone_contratado: '(11) 98888-7777',
          email_contratado: 'contato@abcobras.com.br',
          valor_global: 500000,
          valor_unitario: null,
          unidade_medida: null,
          quantidade: null,
          data_inicio_vigencia: '2024-03-01',
          data_fim_vigencia: '2024-09-30',
          prazo_execucao_dias: 180,
          condicoes_prorrogacao: null,
          cpf_gestor: '123.456.789-01',
          cpf_fiscal: '987.654.321-09',
          dotacao_orcamentaria: '4.4.90.51',
          fonte_recursos: 'Recursos Federais',
          condicoes_pagamento: 'Parcelado',
          garantia_contratual: 'Caução 5%',
          indice_reajuste: 'INPC',
          sancoes: null,
          fundamentacao_legal: 'Lei 14.133/2021',
          local_entrega: 'Vias públicas do município',
          clausulas_contratuais: null,
          status_contrato: 3, // EM_EXECUCAO
          data_assinatura: '2024-02-20',
          data_publicacao: null,
          referencia_publicacao: null,
          versao: 1,
          motivo_rescisao: null,
          data_rescisao: null,
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockContratos,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      const result = await syncService.pullContratos(testOrganization.id);

      // Assert
      expect(result.created).toBeGreaterThan(0);
      expect(result.errors).toBe(0);

      const contratos = await contratoRepository.find({
        where: { organizationId: testOrganization.id },
      });

      expect(contratos.length).toBeGreaterThanOrEqual(2);

      const contrato1 = contratos.find((c) => c.numero === '002/2024-GOVBR');
      expect(contrato1).toBeDefined();
      expect(contrato1!.objeto).toBe('Serviços de TI');
      expect(contrato1!.valorGlobal).toBe('200000');
      expect(contrato1!.govBrSyncStatus).toBe('synced');
    });

    it('should update existing contratos on pull (upsert)', async () => {
      // Arrange - Criar contrato local que já existe no Gov.br
      const existing = await createTestContrato({
        numero: '004/2024-GOVBR',
        valorGlobal: '100000.00',
      });

      // Mock API response com contrato atualizado (valor diferente)
      const mockContratos = [
        {
          numero_contrato: '004/2024-GOVBR',
          numero_processo: '2024/004',
          objeto_contrato: existing.objeto,
          descricao_detalhada: existing.descricaoObjeto,
          cnpj_contratado: existing.contratadoCnpj,
          razao_social_contratado: existing.contratadoRazaoSocial,
          nome_fantasia: existing.contratadoNomeFantasia,
          endereco_contratado: existing.contratadoEndereco,
          telefone_contratado: existing.contratadoTelefone,
          email_contratado: existing.contratadoEmail,
          valor_global: 150000, // Valor atualizado
          valor_unitario: null,
          unidade_medida: null,
          quantidade: null,
          data_inicio_vigencia: existing.vigenciaInicio
            .toISOString()
            .split('T')[0],
          data_fim_vigencia: existing.vigenciaFim.toISOString().split('T')[0],
          prazo_execucao_dias: existing.prazoExecucao,
          condicoes_prorrogacao: existing.possibilidadeProrrogacao,
          cpf_gestor: '123.456.789-01',
          cpf_fiscal: '987.654.321-09',
          dotacao_orcamentaria: existing.dotacaoOrcamentaria,
          fonte_recursos: existing.fonteRecursos,
          condicoes_pagamento: existing.condicoesPagamento,
          garantia_contratual: existing.garantiaContratual,
          indice_reajuste: existing.reajusteContratual,
          sancoes: existing.sancoesAdministrativas,
          fundamentacao_legal: existing.fundamentacaoLegal,
          local_entrega: existing.localEntrega,
          clausulas_contratuais: existing.clausulas,
          status_contrato: 2,
          data_assinatura: existing.dataAssinatura?.toISOString().split('T')[0],
          data_publicacao: null,
          referencia_publicacao: null,
          versao: 1,
          motivo_rescisao: null,
          data_rescisao: null,
        },
      ];

      const mockResponse: AxiosResponse = {
        data: mockContratos,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      // Act
      await syncService.pullContratos(testOrganization.id);

      // Assert
      const updated = await contratoRepository.findOne({
        where: { id: existing.id },
      });

      expect(updated).toBeDefined();
      expect(updated!.valorGlobal).toBe('150000'); // Valor foi atualizado
      expect(updated!.govBrSyncStatus).toBe('synced');
    });

    it('should handle pull API errors gracefully', async () => {
      // Arrange - Mock API error
      const errorResponse = {
        response: {
          data: {
            message: 'Gov.br API timeout',
          },
        },
        message: 'Gov.br API timeout',
      };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => errorResponse));

      // Act & Assert
      await expect(
        syncService.pullContratos(testOrganization.id),
      ).rejects.toThrow('Failed to sync contracts from Gov.br');
    });
  });

  // ============================================
  // CONFLICT RESOLUTION TESTS
  // ============================================

  describe('Conflict Resolution - Resolução de conflitos Last-Write-Wins', () => {
    it('should detect conflicts between local and remote data', async () => {
      // Arrange
      const local = await createTestContrato({
        valorGlobal: '100000.00',
      });

      const remote: Partial<Contrato> = {
        valorGlobal: '150000.00', // Valor diferente
      };

      // Act
      const conflicts = (syncService as any).detectConflicts(local, remote);

      // Assert
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe('valorGlobal');
      expect(conflicts[0].localValue).toBe('100000.00');
      expect(conflicts[0].remoteValue).toBe('150000.00');
    });

    it('should resolve conflicts using Last-Write-Wins (remote wins)', async () => {
      // Arrange - Local foi sincronizado há 1 hora, então remote é mais recente
      const local = await createTestContrato({
        valorGlobal: '100000.00',
        govBrSyncedAt: new Date(Date.now() - 3600 * 1000), // 1 hora atrás
      });

      // Simular que updatedAt é mais antigo que govBrSyncedAt
      await contratoRepository.update(local.id, {
        updatedAt: new Date(Date.now() - 7200 * 1000), // 2 horas atrás
      });

      const remote: Partial<Contrato> = {
        valorGlobal: '150000.00',
      };

      // Act
      await syncService.handleConflictAndUpdate(local, remote);

      // Assert
      const updated = await contratoRepository.findOne({
        where: { id: local.id },
      });

      expect(updated!.valorGlobal).toBe('150000.00'); // Remote wins
      expect(updated!.govBrSyncStatus).toBe('synced');

      // Verificar log de conflito
      const logs = await syncLogRepository.find({
        where: { contratoId: local.id },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('conflict_resolved');
      expect(logs[0].conflicts).toBeDefined();
      expect(logs[0].conflicts![0].field).toBe('valorGlobal');
    });

    it('should resolve conflicts using Last-Write-Wins (local wins)', async () => {
      // Arrange - Local foi editado após último sync, então local é mais recente
      const local = await createTestContrato({
        valorGlobal: '100000.00',
        govBrSyncedAt: new Date(Date.now() - 3600 * 1000), // 1 hora atrás
      });

      // Simular que updatedAt é mais recente que govBrSyncedAt
      await contratoRepository.update(local.id, {
        updatedAt: new Date(Date.now() - 1800 * 1000), // 30 min atrás (mais recente que sync)
      });

      const remote: Partial<Contrato> = {
        valorGlobal: '150000.00',
      };

      // Mock push para evitar chamada real
      jest.spyOn(syncService, 'pushContrato').mockResolvedValue(undefined);

      // Act
      await syncService.handleConflictAndUpdate(local, remote);

      // Assert
      const updated = await contratoRepository.findOne({
        where: { id: local.id },
      });

      expect(updated!.valorGlobal).toBe('100000.00'); // Local wins (preserva valor original)

      // Verificar que push foi agendado
      expect(syncService.pushContrato).toHaveBeenCalledWith(local.id);
    });

    it('should handle multiple conflicts correctly', async () => {
      // Arrange
      const local = await createTestContrato({
        valorGlobal: '100000.00',
        status: ContratoStatus.ASSINADO,
        objeto: 'Objeto Original',
      });

      const remote: Partial<Contrato> = {
        valorGlobal: '150000.00',
        status: ContratoStatus.EM_EXECUCAO,
        objeto: 'Objeto Modificado',
      };

      // Act
      const conflicts = (syncService as any).detectConflicts(local, remote);

      // Assert
      expect(conflicts.length).toBeGreaterThanOrEqual(3);
      expect(conflicts.map((c: any) => c.field)).toContain('valorGlobal');
      expect(conflicts.map((c: any) => c.field)).toContain('status');
      expect(conflicts.map((c: any) => c.field)).toContain('objeto');
    });

    it('should not create conflicts if values are equal', async () => {
      // Arrange
      const local = await createTestContrato({
        valorGlobal: '100000.00',
      });

      const remote: Partial<Contrato> = {
        valorGlobal: '100000.00', // Mesmo valor
      };

      // Act
      const conflicts = (syncService as any).detectConflicts(local, remote);

      // Assert
      expect(conflicts).toHaveLength(0);
    });
  });

  // ============================================
  // EDGE CASES & ERROR HANDLING
  // ============================================

  describe('Edge Cases - Casos especiais e validações', () => {
    it('should throw NotFoundException if contrato does not exist', async () => {
      // Act & Assert
      await expect(
        syncService.pushContrato('non-existent-uuid'),
      ).rejects.toThrow('Contrato with ID non-existent-uuid not found');
    });

    it('should normalize Date values for conflict detection', async () => {
      // Arrange
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-01-01T00:00:00.000Z'); // Mesma data

      const local = await createTestContrato({
        vigenciaFim: date1,
      });

      const remote: Partial<Contrato> = {
        vigenciaFim: date2,
      };

      // Act
      const conflicts = (syncService as any).detectConflicts(local, remote);

      // Assert - Não deve detectar conflito (datas iguais)
      const vigenciaConflict = conflicts.find(
        (c: any) => c.field === 'vigenciaFim',
      );
      expect(vigenciaConflict).toBeUndefined();
    });

    it('should trim string values for conflict detection', async () => {
      // Arrange
      const local = await createTestContrato({
        objeto: 'Objeto com espaços   ',
      });

      const remote: Partial<Contrato> = {
        objeto: 'Objeto com espaços', // Sem espaços extras
      };

      // Act
      const conflicts = (syncService as any).detectConflicts(local, remote);

      // Assert - Não deve detectar conflito (strings normalizadas)
      const objetoConflict = conflicts.find((c: any) => c.field === 'objeto');
      expect(objetoConflict).toBeUndefined();
    });
  });
});
