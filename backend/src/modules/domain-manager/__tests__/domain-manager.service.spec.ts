import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DomainManagerService } from '../domain-manager.service';
import { User, UserRole } from '../../../entities/user.entity';
import { AuthorizedDomain } from '../../../entities/authorized-domain.entity';
import { CreateDomainUserDto } from '../dto/create-domain-user.dto';
import { UpdateDomainUserDto } from '../dto/update-domain-user.dto';

jest.mock('bcrypt');

describe('DomainManagerService', () => {
  let service: DomainManagerService;
  let userRepository: Repository<User>;
  let authorizedDomainRepository: Repository<AuthorizedDomain>;

  const mockDomain: AuthorizedDomain = {
    id: 'domain-uuid-001',
    domain: 'lages.sc.gov.br',
    institutionName: 'Prefeitura de Lages',
    isActive: true,
    maxUsers: 10,
    domainManagerId: 'manager-uuid-001',
    domainManager: null,
    organizationId: 'org-uuid-001',
    organization: null,
    users: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockManager = {
    id: 'manager-uuid-001',
    email: 'gestor@lages.sc.gov.br',
    name: 'Gestor Local',
    password: 'hashed-password',
    role: UserRole.DOMAIN_MANAGER,
    isActive: true,
    mustChangePassword: false,
    organizationId: 'org-uuid-001',
    organization: { id: 'org-uuid-001', name: 'Org' },
    authorizedDomainId: 'domain-uuid-001',
    authorizedDomain: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
    cargo: 'Gestor',
    lgpdConsentAt: null,
    lgpdConsentVersion: null,
    internationalTransferConsentAt: null,
    deletedAt: null,
    etps: [],
    auditLogs: [],
  } as unknown as User;

  const mockUser = {
    id: 'user-uuid-001',
    email: 'joao@lages.sc.gov.br',
    name: 'Joao Silva',
    password: 'hashed-password',
    role: UserRole.USER,
    isActive: true,
    mustChangePassword: true,
    organizationId: 'org-uuid-001',
    organization: null,
    authorizedDomainId: 'domain-uuid-001',
    authorizedDomain: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
    cargo: 'Tecnico',
    lgpdConsentAt: null,
    lgpdConsentVersion: null,
    internationalTransferConsentAt: null,
    deletedAt: null,
    etps: [],
    auditLogs: [],
  } as unknown as User;

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockDomainRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainManagerService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(AuthorizedDomain),
          useValue: mockDomainRepository,
        },
      ],
    }).compile();

    service = module.get<DomainManagerService>(DomainManagerService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    authorizedDomainRepository = module.get<Repository<AuthorizedDomain>>(
      getRepositoryToken(AuthorizedDomain),
    );

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-mudar123');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllUsers', () => {
    it('should return all users in the domain', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.find.mockResolvedValue([mockUser]);

      const result = await service.findAllUsers(mockManager.id);

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: { authorizedDomainId: mockDomain.id },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('joao@lages.sc.gov.br');
    });

    it('should throw NotFoundException if manager has no domain', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockManager,
        authorizedDomainId: null,
      });

      await expect(service.findAllUsers(mockManager.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    const createUserDto: CreateDomainUserDto = {
      email: 'maria@lages.sc.gov.br',
      name: 'Maria Santos',
      cargo: 'Analista',
    };

    it('should successfully create a new user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(5);
      mockUserRepository.create.mockReturnValue({
        ...mockUser,
        email: 'maria@lages.sc.gov.br',
        name: 'Maria Santos',
      });
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        email: 'maria@lages.sc.gov.br',
        name: 'Maria Santos',
      });

      const result = await service.createUser(mockManager.id, createUserDto);

      expect(result.email).toBe('maria@lages.sc.gov.br');
      expect(result.name).toBe('Maria Santos');
      expect(result.mustChangePassword).toBe(true);
    });

    it('should throw BadRequestException if quota exceeded', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(10);

      await expect(
        service.createUser(mockManager.id, createUserDto),
      ).rejects.toThrow(/quota exceeded/i);
    });

    it('should throw BadRequestException if email domain mismatch', async () => {
      const wrongEmailDto: CreateDomainUserDto = {
        email: 'maria@floripa.sc.gov.br',
        name: 'Maria Santos',
      };

      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(5);

      await expect(
        service.createUser(mockManager.id, wrongEmailDto),
      ).rejects.toThrow(/does not match authorized domain/i);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(5);

      await expect(
        service.createUser(mockManager.id, createUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password with bcrypt', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(5);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.createUser(mockManager.id, createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('mudar123', 10);
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateDomainUserDto = {
      name: 'Joao Silva Junior',
      cargo: 'Analista Senior',
    };

    it('should successfully update a user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        name: 'Joao Silva Junior',
        cargo: 'Analista Senior',
      });

      const result = await service.updateUser(
        mockManager.id,
        mockUser.id,
        updateUserDto,
      );

      expect(result.name).toBe('Joao Silva Junior');
      expect(result.cargo).toBe('Analista Senior');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(null);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      await expect(
        service.updateUser(mockManager.id, 'non-existent', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not in domain', async () => {
      const userInOtherDomain = {
        ...mockUser,
        authorizedDomainId: 'other-domain-uuid',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(userInOtherDomain);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      await expect(
        service.updateUser(mockManager.id, mockUser.id, updateUserDto),
      ).rejects.toThrow(/does not belong to your domain/i);
    });

    it('should throw BadRequestException if trying to update admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.SYSTEM_ADMIN };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(adminUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      await expect(
        service.updateUser(mockManager.id, mockUser.id, updateUserDto),
      ).rejects.toThrow(/Cannot modify administrators/i);
    });
  });

  describe('deactivateUser', () => {
    it('should successfully deactivate a user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await service.deactivateUser(mockManager.id, mockUser.id);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw BadRequestException if trying to deactivate admin', async () => {
      const domainManagerUser = { ...mockUser, role: UserRole.DOMAIN_MANAGER };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(domainManagerUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);

      await expect(
        service.deactivateUser(mockManager.id, mockUser.id),
      ).rejects.toThrow(/Cannot deactivate administrators/i);
    });
  });

  describe('getQuota', () => {
    it('should return quota information', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(7);

      const result = await service.getQuota(mockManager.id);

      expect(result.currentUsers).toBe(7);
      expect(result.maxUsers).toBe(10);
      expect(result.available).toBe(3);
      expect(result.percentUsed).toBe(70);
    });

    it('should return 0 available when quota full', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.count.mockResolvedValue(10);

      const result = await service.getQuota(mockManager.id);

      expect(result.available).toBe(0);
      expect(result.percentUsed).toBe(100);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset password to default', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockUser);
      mockDomainRepository.findOne.mockResolvedValue(mockDomain);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.resetUserPassword(mockManager.id, mockUser.id);

      expect(bcrypt.hash).toHaveBeenCalledWith('mudar123', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-mudar123',
          mustChangePassword: true,
        }),
      );
    });

    it('should throw BadRequestException for suspended domain', async () => {
      const suspendedDomain = { ...mockDomain, isActive: false };

      mockUserRepository.findOne.mockResolvedValue(mockManager);
      mockDomainRepository.findOne.mockResolvedValue(suspendedDomain);

      await expect(
        service.resetUserPassword(mockManager.id, mockUser.id),
      ).rejects.toThrow(/currently suspended/i);
    });
  });
});
