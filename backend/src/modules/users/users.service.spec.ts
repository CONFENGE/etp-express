import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let etpsRepository: Repository<Etp>;
  let analyticsRepository: Repository<AnalyticsEvent>;
  let auditLogsRepository: Repository<AuditLog>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.gov.br',
    password: '$2b$10$hashedPassword',
    name: 'João da Silva',
    orgao: 'CONFENGE',
    cargo: 'Analista',
    role: UserRole.USER,
    isActive: true,
    lastLoginAt: new Date('2025-01-01'),
    lgpdConsentAt: new Date('2024-01-01'),
    lgpdConsentVersion: '1.0.0',
    internationalTransferConsentAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    etps: [],
    auditLogs: [],
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
  };

  const mockAnalyticsRepository = {
    find: jest.fn(),
  };

  const mockAuditLogsRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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
        orgao: 'CONFENGE',
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
          'orgao',
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

    it('should create audit log for export action', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockEtpsRepository.find.mockResolvedValue(mockEtps);
      mockAnalyticsRepository.find.mockResolvedValue(mockAnalytics);
      mockAuditLogsRepository.find.mockResolvedValue(mockAuditLogs);
      mockAuditLogsRepository.create.mockReturnValue(mockExportLog);
      mockAuditLogsRepository.save.mockResolvedValue(mockExportLog);

      await service.exportUserData(mockUser.id);

      expect(mockAuditLogsRepository.create).toHaveBeenCalledWith({
        action: 'export',
        entityType: 'user',
        entityId: mockUser.id,
        userId: mockUser.id,
        description: 'User data exported for LGPD compliance',
        changes: {
          metadata: {
            etpsCount: 2,
            analyticsCount: 2,
            auditLogsCount: 1,
          },
        },
      });
      expect(mockAuditLogsRepository.save).toHaveBeenCalledWith(mockExportLog);
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
});
