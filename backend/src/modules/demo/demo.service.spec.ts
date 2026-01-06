import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { DemoService } from './demo.service';
import { Organization } from '../../entities/organization.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';
import { AuditLog } from '../../entities/audit-log.entity';

describe('DemoService', () => {
  let service: DemoService;
  let organizationRepository: Repository<Organization>;
  let userRepository: Repository<User>;
  let etpRepository: Repository<Etp>;
  let dataSource: DataSource;

  const mockDemoOrganization: Organization = {
    id: 'demo-org-id',
    name: 'Demonstração ETP Express',
    cnpj: '00.000.000/0002-00',
    domainWhitelist: ['demo.etpexpress.com.br'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [],
    etps: [],
  };

  const mockDemoUser: User = {
    id: 'demo-user-id',
    email: 'demoetp@confenge.com.br',
    name: 'Usuário Demo',
    password: 'hashed-password',
    role: UserRole.DEMO,
    organizationId: 'demo-org-id',
    organization: mockDemoOrganization,
    authorizedDomainId: 'demo-domain-id',
    authorizedDomain: null,
    cargo: null,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
    lgpdConsentAt: null,
    lgpdConsentVersion: null,
    internationalTransferConsentAt: null,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    etps: [],
    auditLogs: [],
  };

  const mockEtp: Etp = {
    id: 'etp-id-1',
    title: 'Test ETP',
    objeto: 'Test objeto',
    description: 'Test description',
    numeroProcesso: 'TEST-001',
    valorEstimado: 10000,
    // Identification fields (Issue #1223 - nullable in DB)
    orgaoEntidade: null as unknown as string,
    uasg: null as unknown as string,
    unidadeDemandante: null as unknown as string,
    responsavelTecnico: null as unknown as { nome: string; matricula?: string },
    dataElaboracao: null as unknown as Date,
    // Objeto/Justificativa fields (Issue #1224 - nullable in DB)
    descricaoDetalhada: null as unknown as string,
    quantidadeEstimada: null as unknown as number,
    unidadeMedida: null as unknown as string,
    justificativaContratacao: null as unknown as string,
    necessidadeAtendida: null as unknown as string,
    beneficiosEsperados: null as unknown as string,
    // Requisitos e Riscos fields (Issue #1225 - nullable in DB)
    requisitosTecnicos: null as unknown as string,
    requisitosQualificacao: null as unknown as string,
    criteriosSustentabilidade: null as unknown as string,
    garantiaExigida: null as unknown as string,
    prazoExecucao: null as unknown as number,
    nivelRisco: null as unknown as any,
    descricaoRiscos: null as unknown as string,
    // Estimativa de Custos fields (Issue #1226 - nullable in DB)
    valorUnitario: null as unknown as number,
    fontePesquisaPrecos: null as unknown as string,
    dotacaoOrcamentaria: null as unknown as string,
    status: EtpStatus.DRAFT,
    metadata: {},
    organizationId: 'demo-org-id',
    organization: mockDemoOrganization,
    currentVersion: 1,
    completionPercentage: 0,
    createdBy: mockDemoUser,
    createdById: 'demo-user-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    sections: [],
    versions: [],
    auditLogs: [],
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockResolvedValue({}),
    },
  } as unknown as QueryRunner;

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockEtpRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockSectionRepository = {};
  const mockVersionRepository = {};
  const mockAuditLogRepository = {};

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: mockSectionRepository,
        },
        {
          provide: getRepositoryToken(EtpVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DemoService>(DemoService);
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    dataSource = module.get<DataSource>(DataSource);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findDemoOrganization', () => {
    it('should return demo organization when found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );

      const result = await service.findDemoOrganization();

      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { cnpj: '00.000.000/0002-00' },
      });
      expect(result).toEqual(mockDemoOrganization);
    });

    it('should return null when demo organization not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findDemoOrganization();

      expect(result).toBeNull();
    });
  });

  describe('findDemoUser', () => {
    it('should return demo user when found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);

      const result = await service.findDemoUser('demo-org-id');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: 'demo-org-id' },
      });
      expect(result).toEqual(mockDemoUser);
    });

    it('should return null when demo user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findDemoUser('demo-org-id');

      expect(result).toBeNull();
    });
  });

  describe('resetDemoData', () => {
    it('should return error when demo organization not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      const result = await service.resetDemoData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Demo organization not found');
      expect(result.deletedEtps).toBe(0);
      expect(result.createdEtps).toBe(0);
    });

    it('should return error when demo user not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.resetDemoData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Demo user not found');
      expect(result.deletedEtps).toBe(0);
      expect(result.createdEtps).toBe(0);
    });

    it('should successfully reset demo data when organization and user exist', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.find.mockResolvedValue([mockEtp]);

      // Mock delete operations
      mockQueryRunner.manager.delete = jest
        .fn()
        .mockResolvedValueOnce({ affected: 5 }) // audit logs
        .mockResolvedValueOnce({ affected: 10 }) // versions
        .mockResolvedValueOnce({ affected: 25 }) // sections
        .mockResolvedValueOnce({ affected: 3 }); // etps

      const result = await service.resetDemoData();

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.deletedAuditLogs).toBe(5);
      expect(result.deletedVersions).toBe(10);
      expect(result.deletedSections).toBe(25);
      expect(result.deletedEtps).toBe(3);
      expect(result.createdEtps).toBe(3); // 3 sample ETPs
    });

    it('should rollback transaction on error', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.find.mockResolvedValue([mockEtp]);

      // Mock delete to throw error
      mockQueryRunner.manager.delete = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const result = await service.resetDemoData();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle empty ETP list gracefully', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.find.mockResolvedValue([]); // No ETPs

      const result = await service.resetDemoData();

      expect(result.success).toBe(true);
      expect(result.deletedEtps).toBe(0);
      expect(result.deletedSections).toBe(0);
      expect(result.deletedVersions).toBe(0);
      expect(result.deletedAuditLogs).toBe(0);
      expect(result.createdEtps).toBe(3); // Should still create sample ETPs
    });
  });

  describe('getDemoStatistics', () => {
    it('should return statistics when demo organization exists', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockEtpRepository.count.mockResolvedValue(5);
      mockUserRepository.count.mockResolvedValue(1);

      const result = await service.getDemoStatistics();

      expect(result.organizationId).toBe('demo-org-id');
      expect(result.organizationName).toBe('Demonstração ETP Express');
      expect(result.etpCount).toBe(5);
      expect(result.userCount).toBe(1);
      expect(result.lastResetInfo).toBe('Resets daily at 00:00 UTC');
    });

    it('should return null values when demo organization not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      const result = await service.getDemoStatistics();

      expect(result.organizationId).toBeNull();
      expect(result.organizationName).toBeNull();
      expect(result.etpCount).toBe(0);
      expect(result.userCount).toBe(0);
      expect(result.lastResetInfo).toBe('Demo organization not configured');
    });
  });

  describe('handleDemoReset (cron job)', () => {
    it('should call resetDemoData on scheduled execution', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.find.mockResolvedValue([]);

      // Spy on resetDemoData
      const resetSpy = jest.spyOn(service, 'resetDemoData');

      await service.handleDemoReset();

      expect(resetSpy).toHaveBeenCalled();
    });

    it('should not throw on failed reset during scheduled execution', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      // Should not throw
      await expect(service.handleDemoReset()).resolves.not.toThrow();
    });
  });
});
