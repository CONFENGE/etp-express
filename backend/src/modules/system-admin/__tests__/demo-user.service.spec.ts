import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DemoUserService } from '../demo-user.service';
import { User, UserRole } from '../../../entities/user.entity';
import { Organization } from '../../../entities/organization.entity';
import { Etp, EtpStatus } from '../../../entities/etp.entity';
import { CreateDemoUserDto } from '../dto/create-demo-user.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-mock'),
}));

describe('DemoUserService', () => {
  let service: DemoUserService;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let etpRepository: Repository<Etp>;

  const mockDemoOrganization: Organization = {
    id: 'demo-org-uuid',
    name: 'Organização Demo',
    cnpj: '00.000.000/0002-00',
    domainWhitelist: ['demo.example.com'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [],
    etps: [],
  };

  const mockDemoUser: User = {
    id: 'demo-user-uuid',
    email: 'demo@example.com',
    name: 'Demo User',
    password: 'hashed-password',
    cargo: null,
    role: UserRole.DEMO,
    isActive: true,
    mustChangePassword: true,
    organizationId: 'demo-org-uuid',
    organization: undefined,
    authorizedDomainId: null,
    authorizedDomain: null,
    lastLoginAt: null,
    lgpdConsentAt: null,
    lgpdConsentVersion: null,
    internationalTransferConsentAt: null,
    deletedAt: null,
    etpLimitCount: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    etps: [],
    auditLogs: [],
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  const mockEtpRepository = {
    count: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoUserService,
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

    service = module.get<DemoUserService>(DemoUserService);
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

  describe('countUserEtps', () => {
    it('should return the count of ETPs for a user', async () => {
      mockEtpRepository.count.mockResolvedValue(5);

      const result = await service.countUserEtps('user-id');

      expect(mockEtpRepository.count).toHaveBeenCalledWith({
        where: { createdById: 'user-id' },
      });
      expect(result).toBe(5);
    });
  });

  describe('createDemoUser', () => {
    const createDemoUserDto: CreateDemoUserDto = {
      email: 'newdemo@example.com',
      name: 'New Demo User',
      cargo: 'Tester',
    };

    it('should create a demo user with generated password', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...mockDemoUser,
        email: 'newdemo@example.com',
        name: 'New Demo User',
        cargo: 'Tester',
      });
      mockUserRepository.save.mockResolvedValue({
        ...mockDemoUser,
        id: 'new-demo-user-uuid',
        email: 'newdemo@example.com',
        name: 'New Demo User',
        cargo: 'Tester',
      });

      const result = await service.createDemoUser(createDemoUserDto);

      expect(mockOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { cnpj: '00.000.000/0002-00' },
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'newdemo@example.com' },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'newdemo@example.com',
        password: 'hashed-password-mock',
        name: 'New Demo User',
        cargo: 'Tester',
        organizationId: 'demo-org-uuid',
        role: UserRole.DEMO,
        isActive: true,
        mustChangePassword: true,
        etpLimitCount: 3,
      });
      expect(result.user.email).toBe('newdemo@example.com');
      expect(result.user.role).toBe(UserRole.DEMO);
      expect(result.user.etpLimitCount).toBe(3);
      expect(result.generatedPassword).toBeDefined();
      expect(result.generatedPassword.length).toBeLessThanOrEqual(12);
    });

    it('should throw NotFoundException if demo organization not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      await expect(service.createDemoUser(createDemoUserDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createDemoUser(createDemoUserDto)).rejects.toThrow(
        /Demo organization not found/,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);

      await expect(service.createDemoUser(createDemoUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createDemoUser(createDemoUserDto)).rejects.toThrow(
        /já está cadastrado/,
      );
    });

    it('should normalize email to lowercase', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockDemoUser);
      mockUserRepository.save.mockResolvedValue(mockDemoUser);

      await service.createDemoUser({
        email: 'UPPERCASE@EXAMPLE.COM',
        name: 'Test User',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'uppercase@example.com' },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'uppercase@example.com' }),
      );
    });

    it('should set cargo to null if not provided', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockDemoUser);
      mockUserRepository.save.mockResolvedValue(mockDemoUser);

      await service.createDemoUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ cargo: null }),
      );
    });
  });

  describe('findAllDemoUsers', () => {
    it('should return all demo users with ETP counts', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.find.mockResolvedValue([mockDemoUser]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: mockDemoUser.id, count: '2' }]),
      };
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllDemoUsers();

      expect(mockUserRepository.find).toHaveBeenCalledWith({
        where: {
          organizationId: mockDemoOrganization.id,
          role: UserRole.DEMO,
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(mockDemoUser.email);
      expect(result[0].etpCount).toBe(2);
      expect(result[0].isBlocked).toBe(false);
    });

    it('should return empty array if demo organization not found', async () => {
      mockOrganizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findAllDemoUsers();

      expect(result).toEqual([]);
    });

    it('should mark user as blocked when ETP count equals limit', async () => {
      const blockedUser = { ...mockDemoUser, etpLimitCount: 3 };
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.find.mockResolvedValue([blockedUser]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: blockedUser.id, count: '3' }]),
      };
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllDemoUsers();

      expect(result[0].isBlocked).toBe(true);
    });

    it('should mark user as blocked when ETP count exceeds limit', async () => {
      const blockedUser = { ...mockDemoUser, etpLimitCount: 3 };
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.find.mockResolvedValue([blockedUser]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: blockedUser.id, count: '5' }]),
      };
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllDemoUsers();

      expect(result[0].isBlocked).toBe(true);
    });

    it('should not mark user as blocked when etpLimitCount is null', async () => {
      const unlimitedUser = { ...mockDemoUser, etpLimitCount: null };
      mockOrganizationRepository.findOne.mockResolvedValue(
        mockDemoOrganization,
      );
      mockUserRepository.find.mockResolvedValue([unlimitedUser]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ userId: unlimitedUser.id, count: '100' }]),
      };
      mockEtpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAllDemoUsers();

      expect(result[0].isBlocked).toBe(false);
    });
  });

  describe('findOneDemoUser', () => {
    it('should return a demo user with ETP count', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.count.mockResolvedValue(2);

      const result = await service.findOneDemoUser(mockDemoUser.id);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDemoUser.id, role: UserRole.DEMO },
      });
      expect(result.email).toBe(mockDemoUser.email);
      expect(result.etpCount).toBe(2);
      expect(result.isBlocked).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneDemoUser('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user is not a demo user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneDemoUser('regular-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeDemoUser', () => {
    it('should remove a demo user and their ETPs', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.delete.mockResolvedValue({ affected: 3 });
      mockUserRepository.remove.mockResolvedValue(mockDemoUser);

      await service.removeDemoUser(mockDemoUser.id);

      expect(mockEtpRepository.delete).toHaveBeenCalledWith({
        createdById: mockDemoUser.id,
      });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockDemoUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.removeDemoUser('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resetDemoUser', () => {
    it('should reset demo user and clear ETPs', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockDemoUser,
        isActive: false,
      });
      mockEtpRepository.delete.mockResolvedValue({ affected: 3 });
      mockUserRepository.save.mockResolvedValue({
        ...mockDemoUser,
        isActive: true,
      });

      const result = await service.resetDemoUser(mockDemoUser.id);

      expect(mockEtpRepository.delete).toHaveBeenCalledWith({
        createdById: mockDemoUser.id,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(result.user.etpCount).toBe(0);
      expect(result.user.isBlocked).toBe(false);
      expect(result.generatedPassword).toBeUndefined();
    });

    it('should regenerate password when requested', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.delete.mockResolvedValue({ affected: 0 });
      mockUserRepository.save.mockResolvedValue({
        ...mockDemoUser,
        mustChangePassword: true,
      });

      const result = await service.resetDemoUser(mockDemoUser.id, true);

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-password-mock',
          mustChangePassword: true,
        }),
      );
      expect(result.generatedPassword).toBeDefined();
    });

    it('should not regenerate password when not requested', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockDemoUser);
      mockEtpRepository.delete.mockResolvedValue({ affected: 0 });
      mockUserRepository.save.mockResolvedValue(mockDemoUser);

      const result = await service.resetDemoUser(mockDemoUser.id, false);

      expect(result.generatedPassword).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resetDemoUser('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reactivate inactive user during reset', async () => {
      const inactiveUser = { ...mockDemoUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);
      mockEtpRepository.delete.mockResolvedValue({ affected: 0 });
      mockUserRepository.save.mockResolvedValue({
        ...inactiveUser,
        isActive: true,
      });

      const result = await service.resetDemoUser(mockDemoUser.id);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(result.user.isActive).toBe(true);
    });
  });
});
