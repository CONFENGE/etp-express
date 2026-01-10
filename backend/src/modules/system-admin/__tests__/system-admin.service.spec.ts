import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAdminService } from '../system-admin.service';
import { AuthorizedDomain } from '../../../entities/authorized-domain.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { Organization } from '../../../entities/organization.entity';
import { Etp, EtpStatus } from '../../../entities/etp.entity';
import { CreateDomainDto } from '../dto/create-domain.dto';
import { UpdateDomainDto } from '../dto/update-domain.dto';
import { AssignManagerDto } from '../dto/assign-manager.dto';

describe('SystemAdminService', () => {
  let service: SystemAdminService;
  let authorizedDomainRepository: Repository<AuthorizedDomain>;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let etpRepository: Repository<Etp>;

  const mockDomain: AuthorizedDomain = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'lages.sc.gov.br',
    institutionName: 'Prefeitura de Lages',
    isActive: true,
    maxUsers: 10,
    domainManagerId: null,
    domainManager: null,
    organizationId: null,
    organization: null,
    users: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUser = {
    id: 'user-uuid-001',
    email: 'gestor@lages.sc.gov.br',
    name: 'Gestor Local',
    password: 'hashed-password',
    role: UserRole.DOMAIN_MANAGER,
    isActive: true,
    mustChangePassword: false,
    organizationId: 'org-uuid-001',
    organization: null,
    authorizedDomainId: '123e4567-e89b-12d3-a456-426614174000',
    authorizedDomain: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
    cargo: null,
    lgpdConsentAt: null,
    lgpdConsentVersion: null,
    internationalTransferConsentAt: null,
    deletedAt: null,
    etps: [],
    auditLogs: [],
  } as unknown as User;

  const mockOrganization: Organization = {
    id: 'org-uuid-001',
    name: 'Prefeitura de Lages',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['lages.sc.gov.br'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [],
    etps: [],
  };

  const mockDomainRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      query: jest.fn(),
    },
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockEtpRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminService,
        {
          provide: getRepositoryToken(AuthorizedDomain),
          useValue: mockDomainRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
      ],
    }).compile();

    service = module.get<SystemAdminService>(SystemAdminService);
    authorizedDomainRepository = module.get<Repository<AuthorizedDomain>>(
      getRepositoryToken(AuthorizedDomain),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDomain', () => {
    it('should successfully create a new domain', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
        maxUsers: 10,
      };

      mockDomainRepository.findOne.mockResolvedValue(null);
      mockDomainRepository.create.mockReturnValue(mockDomain);
      mockDomainRepository.save.mockResolvedValue(mockDomain);

      const result = await service.createDomain(createDomainDto);

      expect(mockDomainRepository.findOne).toHaveBeenCalledWith({
        where: { domain: 'lages.sc.gov.br' },
      });
      expect(mockDomainRepository.create).toHaveBeenCalledWith({
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
        maxUsers: 10,
        organizationId: null,
        isActive: true,
      });
      expect(result).toEqual(mockDomain);
    });

    it('should normalize domain to lowercase', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'LAGES.SC.GOV.BR',
        institutionName: 'Prefeitura de Lages',
      };

      mockDomainRepository.findOne.mockResolvedValue(null);
      mockDomainRepository.create.mockReturnValue(mockDomain);
      mockDomainRepository.save.mockResolvedValue(mockDomain);

      await service.createDomain(createDomainDto);

      expect(mockDomainRepository.findOne).toHaveBeenCalledWith({
        where: { domain: 'lages.sc.gov.br' },
      });
    });

    it('should throw ConflictException if domain already exists', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
      };

      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      await expect(service.createDomain(createDomainDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createDomain(createDomainDto)).rejects.toThrow(
        "Domain 'lages.sc.gov.br' is already registered",
      );
    });

    it('should validate organization if provided', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
        organizationId: 'org-uuid-001',
      };

      mockDomainRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOne.mockResolvedValue(mockOrganization);
      mockDomainRepository.create.mockReturnValue(mockDomain);
      mockDomainRepository.save.mockResolvedValue(mockDomain);

      await service.createDomain(createDomainDto);

      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid-001' },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
        organizationId: 'non-existent-org',
      };

      mockDomainRepository.findOne.mockResolvedValue(null);
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      await expect(service.createDomain(createDomainDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use default maxUsers of 10 if not provided', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
      };

      mockDomainRepository.findOne.mockResolvedValue(null);
      mockDomainRepository.create.mockReturnValue(mockDomain);
      mockDomainRepository.save.mockResolvedValue(mockDomain);

      await service.createDomain(createDomainDto);

      expect(mockDomainRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ maxUsers: 10 }),
      );
    });
  });

  describe('findAllDomains', () => {
    it('should return all domains with relations', async () => {
      const domains = [mockDomain];
      mockDomainRepository.find.mockResolvedValue(domains);

      const result = await service.findAllDomains();

      expect(mockDomainRepository.find).toHaveBeenCalledWith({
        relations: ['domainManager', 'organization', 'users'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(domains);
    });
  });

  describe('findOneDomain', () => {
    it('should return a domain by ID with relations', async () => {
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      const result = await service.findOneDomain(mockDomain.id);

      expect(mockDomainRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDomain.id },
        relations: ['domainManager', 'organization', 'users'],
      });
      expect(result).toEqual(mockDomain);
    });

    it('should throw NotFoundException if domain not found', async () => {
      mockDomainRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneDomain('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneDomain('non-existent-id')).rejects.toThrow(
        'Domain with ID non-existent-id not found',
      );
    });
  });

  describe('updateDomain', () => {
    it('should successfully update a domain', async () => {
      const updateDomainDto: UpdateDomainDto = {
        institutionName: 'Prefeitura Municipal de Lages',
      };

      const updatedDomain = {
        ...mockDomain,
        institutionName: 'Prefeitura Municipal de Lages',
      };

      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockDomainRepository.save.mockResolvedValue(updatedDomain);

      const result = await service.updateDomain(mockDomain.id, updateDomainDto);

      expect(mockDomainRepository.save).toHaveBeenCalled();
      expect(result.institutionName).toBe('Prefeitura Municipal de Lages');
    });

    it('should throw ConflictException if updating to existing domain', async () => {
      const updateDomainDto: UpdateDomainDto = {
        domain: 'floripa.sc.gov.br',
      };

      const anotherDomain = {
        ...mockDomain,
        id: 'another-id',
        domain: 'floripa.sc.gov.br',
      };

      mockDomainRepository.findOne
        .mockResolvedValueOnce(mockDomain)
        .mockResolvedValueOnce(anotherDomain);

      await expect(
        service.updateDomain(mockDomain.id, updateDomainDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should normalize domain to lowercase when updating', async () => {
      const updateDomainDto: UpdateDomainDto = {
        domain: 'NEWDOMAIN.SC.GOV.BR',
      };

      mockDomainRepository.findOne
        .mockResolvedValueOnce(mockDomain)
        .mockResolvedValueOnce(null);
      mockDomainRepository.save.mockResolvedValue({
        ...mockDomain,
        domain: 'newdomain.sc.gov.br',
      });

      await service.updateDomain(mockDomain.id, updateDomainDto);

      expect(mockDomainRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'newdomain.sc.gov.br' }),
      );
    });
  });

  describe('removeDomain', () => {
    it('should successfully remove a domain without users', async () => {
      const domainWithoutUsers = { ...mockDomain, users: [] };
      mockDomainRepository.findOne.mockResolvedValue(domainWithoutUsers);
      mockDomainRepository.remove.mockResolvedValue(domainWithoutUsers);

      await service.removeDomain(mockDomain.id);

      expect(mockDomainRepository.remove).toHaveBeenCalledWith(
        domainWithoutUsers,
      );
    });

    it('should throw BadRequestException if domain has users', async () => {
      const domainWithUsers = { ...mockDomain, users: [mockUser] };
      mockDomainRepository.findOne.mockResolvedValue(domainWithUsers);

      await expect(service.removeDomain(mockDomain.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeDomain(mockDomain.id)).rejects.toThrow(
        /Cannot delete domain/,
      );
    });

    it('should throw NotFoundException if domain not found', async () => {
      mockDomainRepository.findOne.mockResolvedValue(null);

      await expect(service.removeDomain('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignManager', () => {
    const getCleanMockDomain = () => ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      domain: 'lages.sc.gov.br',
      institutionName: 'Prefeitura de Lages',
      isActive: true,
      maxUsers: 10,
      domainManagerId: null,
      domainManager: null,
      organizationId: null,
      organization: null,
      users: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    it('should successfully assign a manager to a domain', async () => {
      const cleanDomain = getCleanMockDomain();
      const assignManagerDto: AssignManagerDto = {
        userId: 'user-uuid-001',
      };

      const userToAssign = {
        ...mockUser,
        role: UserRole.USER,
        email: 'gestor@lages.sc.gov.br',
        authorizedDomainId: null,
      };

      mockDomainRepository.findOne.mockResolvedValue(cleanDomain);
      mockUserRepository.findOne.mockResolvedValue(userToAssign);
      mockUserRepository.save.mockResolvedValue({
        ...userToAssign,
        role: UserRole.DOMAIN_MANAGER,
        authorizedDomainId: cleanDomain.id,
      });
      mockDomainRepository.save.mockResolvedValue({
        ...cleanDomain,
        domainManagerId: userToAssign.id,
        domainManager: userToAssign,
      });

      const result = await service.assignManager(
        cleanDomain.id,
        assignManagerDto,
      );

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockDomainRepository.save).toHaveBeenCalled();
      expect(result.domainManagerId).toBe(userToAssign.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      const cleanDomain = getCleanMockDomain();
      const assignManagerDto: AssignManagerDto = {
        userId: 'non-existent-user',
      };

      mockDomainRepository.findOne.mockResolvedValue(cleanDomain);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignManager(cleanDomain.id, assignManagerDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user email does not match domain', async () => {
      const cleanDomain = getCleanMockDomain();
      const assignManagerDto: AssignManagerDto = {
        userId: 'user-uuid-001',
      };

      const userWithWrongEmail = {
        ...mockUser,
        email: 'gestor@floripa.sc.gov.br',
      };

      mockDomainRepository.findOne.mockResolvedValue(cleanDomain);
      mockUserRepository.findOne.mockResolvedValue(userWithWrongEmail);

      await expect(
        service.assignManager(cleanDomain.id, assignManagerDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignManager(cleanDomain.id, assignManagerDto),
      ).rejects.toThrow(/does not match authorized domain/);
    });

    it('should update user role to DOMAIN_MANAGER', async () => {
      const cleanDomain = getCleanMockDomain();
      const assignManagerDto: AssignManagerDto = {
        userId: 'user-uuid-001',
      };

      const regularUser = {
        ...mockUser,
        role: UserRole.USER,
      };

      mockDomainRepository.findOne.mockResolvedValue(cleanDomain);
      mockUserRepository.findOne.mockResolvedValue(regularUser);
      mockUserRepository.save.mockResolvedValue({
        ...regularUser,
        role: UserRole.DOMAIN_MANAGER,
      });
      mockDomainRepository.save.mockResolvedValue(cleanDomain);

      await service.assignManager(cleanDomain.id, assignManagerDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.DOMAIN_MANAGER }),
      );
    });
  });

  describe('suspendDomain', () => {
    it('should successfully suspend an active domain', async () => {
      const activeDomain = { ...mockDomain, isActive: true };
      const suspendedDomain = { ...mockDomain, isActive: false };

      mockDomainRepository.findOne.mockResolvedValue(activeDomain);
      mockDomainRepository.save.mockResolvedValue(suspendedDomain);

      const result = await service.suspendDomain(mockDomain.id);

      expect(mockDomainRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException if domain is already suspended', async () => {
      const suspendedDomain = { ...mockDomain, isActive: false };
      mockDomainRepository.findOne.mockResolvedValue(suspendedDomain);

      await expect(service.suspendDomain(mockDomain.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.suspendDomain(mockDomain.id)).rejects.toThrow(
        /is already suspended/,
      );
    });
  });

  describe('reactivateDomain', () => {
    it('should successfully reactivate a suspended domain', async () => {
      const suspendedDomain = { ...mockDomain, isActive: false };
      const reactivatedDomain = { ...mockDomain, isActive: true };

      mockDomainRepository.findOne.mockResolvedValue(suspendedDomain);
      mockDomainRepository.save.mockResolvedValue(reactivatedDomain);

      const result = await service.reactivateDomain(mockDomain.id);

      expect(mockDomainRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if domain is already active', async () => {
      const activeDomain = { ...mockDomain, isActive: true };
      mockDomainRepository.findOne.mockResolvedValue(activeDomain);

      await expect(service.reactivateDomain(mockDomain.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reactivateDomain(mockDomain.id)).rejects.toThrow(
        /is already active/,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return global statistics', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { organizationName: 'Prefeitura de Lages', domainCount: '3' },
          ]),
      };

      mockDomainRepository.count.mockResolvedValueOnce(10); // totalDomains
      mockDomainRepository.count.mockResolvedValueOnce(8); // activeDomains
      mockUserRepository.count.mockResolvedValue(150);
      mockOrganizationRepository.count.mockResolvedValue(5);
      mockDomainRepository.manager.query.mockResolvedValue([{ count: '500' }]);
      mockDomainRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics();

      expect(result.totalDomains).toBe(10);
      expect(result.activeDomains).toBe(8);
      expect(result.inactiveDomains).toBe(2);
      expect(result.totalUsers).toBe(150);
      expect(result.totalOrganizations).toBe(5);
      expect(result.totalEtps).toBe(500);
      expect(result.domainsByOrganization).toHaveLength(1);
      expect(result.domainsByOrganization[0].organizationName).toBe(
        'Prefeitura de Lages',
      );
      expect(result.domainsByOrganization[0].domainCount).toBe(3);
    });
  });

  describe('cleanupTestDomains', () => {
    it('should delete all test domains matching pattern test-e2e-*.example.com', async () => {
      const testDomains = [
        {
          ...mockDomain,
          id: 'test-1',
          domain: 'test-e2e-1234567890.example.com',
        },
        {
          ...mockDomain,
          id: 'test-2',
          domain: 'test-e2e-9876543210.example.com',
        },
        {
          ...mockDomain,
          id: 'test-3',
          domain: 'test-e2e-1111111111.example.com',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(testDomains),
      };

      mockDomainRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockDomainRepository.remove.mockResolvedValue(testDomains);

      const result = await service.cleanupTestDomains();

      expect(mockDomainRepository.createQueryBuilder).toHaveBeenCalledWith(
        'domain',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'domain.domain LIKE :pattern',
        {
          pattern: 'test-e2e-%.example.com',
        },
      );
      expect(mockDomainRepository.remove).toHaveBeenCalledWith(testDomains);
      expect(result.deleted).toBe(3);
    });

    it('should return 0 deleted when no test domains exist', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockDomainRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.cleanupTestDomains();

      expect(mockDomainRepository.remove).not.toHaveBeenCalled();
      expect(result.deleted).toBe(0);
    });

    it('should not delete real domains that do not match the pattern', async () => {
      // Only test domains match the pattern
      const testDomains = [
        {
          ...mockDomain,
          id: 'test-1',
          domain: 'test-e2e-1234567890.example.com',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(testDomains),
      };

      mockDomainRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockDomainRepository.remove.mockResolvedValue(testDomains);

      await service.cleanupTestDomains();

      // The real domain 'lages.sc.gov.br' is not in the removed domains
      expect(mockDomainRepository.remove).toHaveBeenCalledWith(testDomains);
      expect(testDomains.some((d) => d.domain === 'lages.sc.gov.br')).toBe(
        false,
      );
    });
  });

  describe('getProductivityRanking', () => {
    const createMockQueryBuilder = (rawResults: unknown[]) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawResults),
    });

    it('should return paginated productivity ranking', async () => {
      const rawResults = [
        {
          userId: 'user-1',
          userName: 'Maria Silva',
          userEmail: 'maria@prefeitura.gov.br',
          etpsCreated: '10',
          etpsCompleted: '8',
        },
        {
          userId: 'user-2',
          userName: 'Joao Santos',
          userEmail: 'joao@prefeitura.gov.br',
          etpsCreated: '5',
          etpsCompleted: '4',
        },
      ];

      const mockQB = createMockQueryBuilder(rawResults);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 10);

      expect(mockEtpRepository.createQueryBuilder).toHaveBeenCalledWith('etp');
      expect(result.ranking).toHaveLength(2);
      expect(result.ranking[0].position).toBe(1);
      expect(result.ranking[0].userName).toBe('Maria Silva');
      expect(result.ranking[0].etpsCreated).toBe(10);
      expect(result.ranking[0].etpsCompleted).toBe(8);
      expect(result.ranking[0].completionRate).toBe(80);
      expect(result.totalUsers).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply period filter when periodDays > 0', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      await service.getProductivityRanking(30, 1, 10);

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'etp.createdAt >= :periodStart',
        expect.objectContaining({ periodStart: expect.any(Date) }),
      );
    });

    it('should not apply period filter when periodDays is 0', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      await service.getProductivityRanking(0, 1, 10);

      // Only the user.isActive filter should be applied
      expect(mockQB.andWhere).not.toHaveBeenCalledWith(
        'etp.createdAt >= :periodStart',
        expect.anything(),
      );
    });

    it('should handle empty results', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 10);

      expect(result.ranking).toHaveLength(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate completion rate correctly', async () => {
      const rawResults = [
        {
          userId: 'user-1',
          userName: 'Test User',
          userEmail: 'test@example.com',
          etpsCreated: '3',
          etpsCompleted: '2',
        },
      ];

      const mockQB = createMockQueryBuilder(rawResults);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 10);

      // 2/3 = 66.666... should be rounded to 66.7
      expect(result.ranking[0].completionRate).toBe(66.7);
    });

    it('should handle zero ETPs created (avoid division by zero)', async () => {
      const rawResults = [
        {
          userId: 'user-1',
          userName: 'Test User',
          userEmail: 'test@example.com',
          etpsCreated: '0',
          etpsCompleted: '0',
        },
      ];

      const mockQB = createMockQueryBuilder(rawResults);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 10);

      expect(result.ranking[0].completionRate).toBe(0);
    });

    it('should enforce maximum limit of 100', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 500);

      expect(result.limit).toBe(100);
      expect(mockQB.limit).toHaveBeenCalledWith(100);
    });

    it('should enforce minimum page of 1', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, -5, 10);

      expect(result.page).toBe(1);
      expect(mockQB.offset).toHaveBeenCalledWith(0);
    });

    it('should calculate correct offset for pagination', async () => {
      const mockQB = createMockQueryBuilder([]);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      await service.getProductivityRanking(0, 3, 10);

      // Page 3 with limit 10 = offset 20
      expect(mockQB.offset).toHaveBeenCalledWith(20);
    });

    it('should calculate totalPages correctly', async () => {
      // Mock 25 total users
      const users25 = Array.from({ length: 25 }, (_, i) => ({
        userId: `user-${i}`,
        userName: `User ${i}`,
        userEmail: `user${i}@example.com`,
        etpsCreated: '5',
        etpsCompleted: '3',
      }));

      const mockQB = createMockQueryBuilder(users25);
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getProductivityRanking(0, 1, 10);

      // 25 users / 10 per page = 3 pages (ceiling)
      expect(result.totalPages).toBe(3);
    });
  });
});
