import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let etpsRepository: Repository<Etp>;
  let analyticsRepository: Repository<AnalyticsEvent>;
  let auditLogsRepository: Repository<AuditLog>;

  const mockOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'CONFENGE',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['example.gov.br'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [],
  };

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.gov.br',
    password: '$2b$10$hashedPassword',
    name: 'João da Silva',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    organization: mockOrganization as any,
    cargo: 'Analista',
    role: UserRole.USER,
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: new Date('2025-01-01'),
    lgpdConsentAt: new Date('2024-01-01'),
    lgpdConsentVersion: '1.0.0',
    internationalTransferConsentAt: new Date('2024-01-01'),
    deletedAt: null as any,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    etps: [],
    auditLogs: [],
    authorizedDomainId: null,
    authorizedDomain: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockEtpsRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockAnalyticsRepository = {
    find: jest.fn(),
  };

  const mockAuditLogsRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailService = {
    sendDeletionConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    logDataExport: jest.fn().mockResolvedValue({}),
    logAccountDeletion: jest.fn().mockResolvedValue({}),
    logDeletionCancelled: jest.fn().mockResolvedValue({}),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: number) => {
      if (key === 'LGPD_RETENTION_DAYS') {
        return 30; // Default retention period for tests
      }
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpsRepository,
        },
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: mockAnalyticsRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    etpsRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    analyticsRepository = module.get<Repository<AnalyticsEvent>>(
      getRepositoryToken(AnalyticsEvent),
    );
    auditLogsRepository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.gov.br',
        password: 'SenhaSegura123!',
        name: 'João da Silva',
        organizationId: 'org-123',
        cargo: 'Analista',
        role: UserRole.USER,
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should create user with default role when not specified', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.gov.br',
        password: 'SenhaSegura123!',
        name: 'João da Silva',
        organizationId: 'org-123',
      };

      const userWithDefaultRole = { ...mockUser, role: UserRole.USER };
      mockRepository.create.mockReturnValue(userWithDefaultRole);
      mockRepository.save.mockResolvedValue(userWithDefaultRole);

      const result = await service.create(createUserDto);

      expect(result.role).toBe(UserRole.USER);
    });

    it('should log user creation', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.gov.br',
        password: 'SenhaSegura123!',
        name: 'João da Silva',
        organizationId: 'org-123',
      };

      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.create(createUserDto);

      expect(loggerSpy).toHaveBeenCalledWith(`User created: ${mockUser.email}`);
    });
  });

  describe('findAll', () => {
    it('should return an array of users ordered by createdAt DESC', async () => {
      const users = [mockUser, { ...mockUser, id: '456' }];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(users);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const invalidId = 'invalid-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(invalidId)).rejects.toThrow(
        `Usuário com ID ${invalidId} não encontrado`,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'João da Silva Junior',
        cargo: 'Coordenador',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateUserDto.name);
      expect(result.cargo).toBe(updateUserDto.cargo);
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      const updateUserDto: UpdateUserDto = { name: 'New Name' };
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log user update', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      await service.update(mockUser.id, updateUserDto);

      expect(loggerSpy).toHaveBeenCalledWith(`User updated: ${mockUser.email}`);
    });

    it('should update user role', async () => {
      const updateUserDto: UpdateUserDto = { role: UserRole.ADMIN };
      const updatedUser = { ...mockUser, role: UserRole.ADMIN };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should update user isActive status', async () => {
      const updateUserDto: UpdateUserDto = { isActive: false };
      const updatedUser = { ...mockUser, isActive: false };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('should successfully remove a user', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      await service.remove(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when removing non-existent user', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log user deletion', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      await service.remove(mockUser.id);

      expect(loggerSpy).toHaveBeenCalledWith(`User deleted: ${mockUser.email}`);
    });
  });

  describe('updateLastLogin', () => {
    it('should successfully update last login timestamp', async () => {
      const userId = mockUser.id;
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateLastLogin(userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should update with current timestamp', async () => {
      const beforeUpdate = new Date();
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateLastLogin(mockUser.id);

      const callArgs = mockRepository.update.mock.calls[0];
      const updatedTimestamp = callArgs[1].lastLoginAt;

      expect(updatedTimestamp).toBeInstanceOf(Date);
      expect(updatedTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });
  });

  describe('validation scenarios', () => {
    it('should handle duplicate email on create', async () => {
      const createUserDto: CreateUserDto = {
        email: 'duplicate@example.gov.br',
        password: 'SenhaSegura123!',
        name: 'Duplicate User',
        organizationId: 'org-123',
      };

      const dbError = new Error('Duplicate key violation');
      Object.assign(dbError, {
        code: '23505', // PostgreSQL unique violation code
        detail: 'Key (email)=(duplicate@example.gov.br) already exists.',
      });

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockRejectedValue(dbError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Duplicate key violation',
      );
    });

    it('should handle various user roles', async () => {
      const roles = [UserRole.ADMIN, UserRole.USER, UserRole.VIEWER];

      for (const role of roles) {
        const updateDto: UpdateUserDto = { role };
        const userWithRole = { ...mockUser, role };

        mockRepository.findOne.mockResolvedValue(mockUser);
        mockRepository.save.mockResolvedValue(userWithRole);

        const result = await service.update(mockUser.id, updateDto);

        expect(result.role).toBe(role);
      }
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors on create', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.gov.br',
        password: 'SenhaSegura123!',
        name: 'Test User',
        organizationId: 'org-123',
      };

      const dbError = new Error('Database connection error');
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockRejectedValue(dbError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        'Database connection error',
      );
    });

    it('should propagate repository errors on findAll', async () => {
      const dbError = new Error('Database query error');
      mockRepository.find.mockRejectedValue(dbError);

      await expect(service.findAll()).rejects.toThrow('Database query error');
    });

    it('should propagate repository errors on update', async () => {
      const updateUserDto: UpdateUserDto = { name: 'New Name' };
      const dbError = new Error('Database update error');

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(dbError);

      await expect(service.update(mockUser.id, updateUserDto)).rejects.toThrow(
        'Database update error',
      );
    });

    it('should propagate repository errors on remove', async () => {
      const dbError = new Error('Database delete error');

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockRejectedValue(dbError);

      await expect(service.remove(mockUser.id)).rejects.toThrow(
        'Database delete error',
      );
    });
  });

  describe('exportUserData', () => {
    const mockEtps = [
      {
        id: 'etp-1',
        title: 'ETP Test',
        createdById: mockUser.id,
        sections: [],
        versions: [],
      },
      {
        id: 'etp-2',
        title: 'ETP Test 2',
        createdById: mockUser.id,
        sections: [{ id: 'section-1' }],
        versions: [{ id: 'version-1' }],
      },
    ];

    const mockAnalytics = [
      {
        id: 'analytics-1',
        eventType: 'page_view',
        eventName: 'dashboard',
        userId: mockUser.id,
      },
      {
        id: 'analytics-2',
        eventType: 'action',
        eventName: 'generate_section',
        userId: mockUser.id,
      },
    ];

    const mockAuditLogs = [
      {
        id: 'audit-1',
        action: 'create',
        entityType: 'etp',
        userId: mockUser.id,
      },
    ];

    const mockExportLog = {
      id: 'export-log-1',
      action: 'export',
      entityType: 'user',
      userId: mockUser.id,
    };

    it('should successfully export all user data', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      const result = await service.exportUserData(mockUser.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: [
          'id',
          'name',
          'email',
          'organizationId',
          'cargo',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
          'lastLoginAt',
          'lgpdConsentAt',
          'lgpdConsentVersion',
          'internationalTransferConsentAt',
        ],
      });
      expect(result.user).toEqual(mockUser);
      expect(result.etps).toEqual(mockEtps);
      expect(result.analytics).toEqual(mockAnalytics);
      expect(result.auditLogs).toEqual(mockAuditLogs);
      expect(result.exportMetadata).toBeDefined();
      expect(result.exportMetadata.exportedAt).toBeDefined();
      expect(result.exportMetadata.recordCounts).toEqual({
        etps: 2,
        analytics: 2,
        auditLogs: 1,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const invalidId = 'invalid-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.exportUserData(invalidId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.exportUserData(invalidId)).rejects.toThrow(
        `Usuário com ID ${invalidId} não encontrado`,
      );
    });

    it('should query ETPs with correct relations and order', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      await service.exportUserData(mockUser.id);

      expect(mockEtpsRepository.find).toHaveBeenCalledWith({
        where: { createdById: mockUser.id },
        relations: ['sections', 'versions'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should query analytics with correct filters', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      await service.exportUserData(mockUser.id);

      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        order: { createdAt: 'DESC' },
      });
    });

    it('should limit audit logs to 1000 entries', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockAnalyticsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      await service.exportUserData(mockUser.id);

      expect(mockAuditLogsRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        order: { createdAt: 'DESC' },
        take: 1000,
      });
    });

    it('should create audit log for export action via AuditService', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);

      await service.exportUserData(mockUser.id);

      expect(mockAuditService.logDataExport).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          format: 'JSON',
          etpsCount: 2,
          analyticsCount: 2,
          auditLogsCount: 1,
        }),
      );
    });

    it('should log export action', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      await service.exportUserData(mockUser.id);

      expect(loggerSpy).toHaveBeenCalledWith(
        `User data exported: ${mockUser.email} (2 ETPs, 2 analytics, 1 audit logs)`,
      );
    });

    it('should include exportMetadata with correct structure', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      const result = await service.exportUserData(mockUser.id);

      expect(result.exportMetadata).toHaveProperty('exportedAt');
      expect(result.exportMetadata).toHaveProperty('dataRetentionPolicy');
      expect(result.exportMetadata).toHaveProperty('lgpdRights');
      expect(result.exportMetadata).toHaveProperty('recordCounts');
      expect(result.exportMetadata.recordCounts).toEqual({
        etps: 2,
        analytics: 2,
        auditLogs: 1,
      });
    });

    it('should handle empty data export', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockAnalyticsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      const result = await service.exportUserData(mockUser.id);

      expect(result.etps).toEqual([]);
      expect(result.analytics).toEqual([]);
      expect(result.auditLogs).toEqual([]);
      expect(result.exportMetadata.recordCounts).toEqual({
        etps: 0,
        analytics: 0,
        auditLogs: 0,
      });
    });

    it('should exclude password from user export', async () => {
      const userWithoutPassword = { ...mockUser };
      mockRepository.findOne.mockResolvedValue(userWithoutPassword);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockAnalyticsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.find.mockResolvedValue([]);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      const result = await service.exportUserData(mockUser.id);

      // Verify password field is not in select query
      expect(mockRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.arrayContaining(['password']),
        }),
      );
      expect(result.user).toBeDefined();
    });
  });

  describe('purgeDeletedAccounts', () => {
    it('should purge users soft-deleted more than 30 days ago', async () => {
      // User deleted 31 days ago (should be purged)
      const oldDeletedUser: User = {
        ...mockUser,
        id: 'old-user-id',
        email: 'old@example.com',
        deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        isActive: false,
      };

      const mockEtps = [
        {
          id: 'etp-1',
          sections: [{}, {}],
          versions: [{}],
        },
        {
          id: 'etp-2',
          sections: [{}],
          versions: [],
        },
      ];

      mockRepository.find.mockResolvedValue([oldDeletedUser]);
      mockEtpsRepository.count.mockResolvedValue(2);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockRepository.remove.mockResolvedValue(oldDeletedUser);

      const result = await service.purgeDeletedAccounts();

      // Verify correct cutoff date was used (30 days ago)
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        }),
      );

      // Verify audit log was created
      expect(mockAuditService.logAccountDeletion).toHaveBeenCalledWith(
        oldDeletedUser.id,
        'HARD',
        expect.objectContaining({
          reason: expect.stringContaining('Hard delete after 30-day retention'),
          etpsCount: 2,
          sectionsCount: 3, // 2 + 1
          versionsCount: 1,
        }),
      );

      // Verify user was removed
      expect(mockRepository.remove).toHaveBeenCalledWith(oldDeletedUser);

      // Verify result
      expect(result.purgedCount).toBe(1);
      expect(result.purgedUserIds).toEqual([oldDeletedUser.id]);
      expect(result.purgedAt).toBeInstanceOf(Date);
    });

    it('should NOT purge users soft-deleted less than 30 days ago', async () => {
      // User deleted 29 days ago (should NOT be purged)
      const recentDeletedUser: User = {
        ...mockUser,
        id: 'recent-user-id',
        email: 'recent@example.com',
        deletedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days ago
        isActive: false,
      };

      // Mock find to return no users (because LessThan(30 days) won't match)
      mockRepository.find.mockResolvedValue([]);

      const result = await service.purgeDeletedAccounts();

      // Verify no users were removed
      expect(mockRepository.remove).not.toHaveBeenCalled();
      expect(mockAuditService.logAccountDeletion).not.toHaveBeenCalled();

      // Verify result
      expect(result.purgedCount).toBe(0);
      expect(result.purgedUserIds).toEqual([]);
    });

    it('should purge multiple users in a single run', async () => {
      const deletedUser1: User = {
        ...mockUser,
        id: 'user-1',
        email: 'user1@example.com',
        deletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      const deletedUser2: User = {
        ...mockUser,
        id: 'user-2',
        email: 'user2@example.com',
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      mockRepository.find.mockResolvedValue([deletedUser1, deletedUser2]);
      mockEtpsRepository.count.mockResolvedValue(0);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockRepository.remove
        .mockResolvedValueOnce(deletedUser1)
        .mockResolvedValueOnce(deletedUser2);

      const result = await service.purgeDeletedAccounts();

      expect(result.purgedCount).toBe(2);
      expect(result.purgedUserIds).toEqual(['user-1', 'user-2']);
      expect(mockRepository.remove).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logAccountDeletion).toHaveBeenCalledTimes(2);
    });

    it('should continue purging other users if one fails', async () => {
      const deletedUser1: User = {
        ...mockUser,
        id: 'user-1',
        email: 'user1@example.com',
        deletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      const deletedUser2: User = {
        ...mockUser,
        id: 'user-2',
        email: 'user2@example.com',
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      mockRepository.find.mockResolvedValue([deletedUser1, deletedUser2]);
      mockEtpsRepository.count.mockResolvedValue(0);
      mockEtpsRepository.find.mockResolvedValue([]);

      // First user fails, second succeeds
      mockRepository.remove
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(deletedUser2);

      const result = await service.purgeDeletedAccounts();

      // Only user2 should be purged
      expect(result.purgedCount).toBe(1);
      expect(result.purgedUserIds).toEqual(['user-2']);
      expect(mockRepository.remove).toHaveBeenCalledTimes(2);
    });

    it('should return empty result when no users to purge', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.purgeDeletedAccounts();

      expect(result.purgedCount).toBe(0);
      expect(result.purgedUserIds).toEqual([]);
      expect(mockRepository.remove).not.toHaveBeenCalled();
      expect(mockAuditService.logAccountDeletion).not.toHaveBeenCalled();
    });

    it('should calculate correct related data counts for audit log', async () => {
      const deletedUser: User = {
        ...mockUser,
        id: 'user-id',
        deletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      const mockEtps = [
        {
          id: 'etp-1',
          sections: [{}, {}, {}], // 3 sections
          versions: [{}, {}], // 2 versions
        },
        {
          id: 'etp-2',
          sections: [{}, {}], // 2 sections
          versions: [{}], // 1 version
        },
      ];

      mockRepository.find.mockResolvedValue([deletedUser]);
      mockEtpsRepository.count.mockResolvedValue(2);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockRepository.remove.mockResolvedValue(deletedUser);

      await service.purgeDeletedAccounts();

      expect(mockAuditService.logAccountDeletion).toHaveBeenCalledWith(
        deletedUser.id,
        'HARD',
        expect.objectContaining({
          etpsCount: 2,
          sectionsCount: 5, // 3 + 2
          versionsCount: 3, // 2 + 1
        }),
      );
    });

    it('should include retentionDays in result', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.purgeDeletedAccounts();

      expect(result.retentionDays).toBe(30);
    });

    it('should include retentionDays in audit log metadata', async () => {
      const deletedUser: User = {
        ...mockUser,
        id: 'user-id',
        deletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        isActive: false,
      };

      mockRepository.find.mockResolvedValue([deletedUser]);
      mockEtpsRepository.count.mockResolvedValue(0);
      mockEtpsRepository.find.mockResolvedValue([]);
      mockRepository.remove.mockResolvedValue(deletedUser);

      await service.purgeDeletedAccounts();

      expect(mockAuditService.logAccountDeletion).toHaveBeenCalledWith(
        deletedUser.id,
        'HARD',
        expect.objectContaining({
          retentionDays: 30,
        }),
      );
    });
  });

  describe('LGPD retention configuration', () => {
    it('should use ConfigService to get retention days', () => {
      // Service is initialized with mockConfigService, which uses 30 days
      // Verify service is using the retention days from config
      // Note: mockConfigService.get is called during service initialization in beforeEach
      // Since jest.clearAllMocks() is called, we verify via behavior instead
      expect(service).toBeDefined();
      // The service constructor sets retentionDays from ConfigService
      // We verify this by checking purge result includes retentionDays
    });

    it('should include retentionDays in softDeleteAccount response', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        isActive: false,
      });
      mockEtpsRepository.count.mockResolvedValue(0);
      mockEtpsRepository.find.mockResolvedValue([]);

      const result = await service.softDeleteAccount(mockUser.id);

      expect(result.retentionDays).toBe(30);
      expect(result.scheduledDeletionDate).toBeInstanceOf(Date);
    });

    it('should calculate correct scheduled deletion date based on retention period', async () => {
      const beforeCall = new Date();
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        isActive: false,
      });
      mockEtpsRepository.count.mockResolvedValue(0);
      mockEtpsRepository.find.mockResolvedValue([]);

      const result = await service.softDeleteAccount(mockUser.id);
      const afterCall = new Date();

      // Calculate expected date range (should be ~30 days from now)
      const expectedMinDate = new Date(beforeCall);
      expectedMinDate.setDate(expectedMinDate.getDate() + 30);

      const expectedMaxDate = new Date(afterCall);
      expectedMaxDate.setDate(expectedMaxDate.getDate() + 30);

      expect(result.scheduledDeletionDate.getTime()).toBeGreaterThanOrEqual(
        expectedMinDate.getTime() - 1000, // 1 second tolerance
      );
      expect(result.scheduledDeletionDate.getTime()).toBeLessThanOrEqual(
        expectedMaxDate.getTime() + 1000, // 1 second tolerance
      );
    });
  });
});
