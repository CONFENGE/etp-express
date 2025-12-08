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
import { CreateDomainDto } from '../dto/create-domain.dto';
import { UpdateDomainDto } from '../dto/update-domain.dto';
import { AssignManagerDto } from '../dto/assign-manager.dto';

describe('SystemAdminService', () => {
  let service: SystemAdminService;
  let authorizedDomainRepository: Repository<AuthorizedDomain>;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;

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
});
