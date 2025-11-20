import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserId = 'user-123';

  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    orgao: 'CONFENGE',
    cargo: 'Analista',
    role: 'servidor',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exportUserData: jest.fn(),
    softDeleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      orgao: 'CONFENGE',
      cargo: 'Analista',
    };

    it('should create a new user', async () => {
      // Arrange
      const newUser = { ...mockUser, ...createUserDto };
      mockUsersService.create.mockResolvedValue(newUser);

      // Act
      const result = await controller.create(createUserDto);

      // Assert
      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(newUser);
      expect(result.data.email).toBe(createUserDto.email);
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Email já cadastrado'),
      );

      // Act & Assert
      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(createUserDto)).rejects.toThrow(
        'Email já cadastrado',
      );
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockUsersService.create.mockResolvedValue(mockUser);

      // Act
      const result = await controller.create(createUserDto);

      // Assert
      expect(result).toHaveProperty('disclaimer');
      expect(result.disclaimer).toContain(
        'Lembre-se de verificar todas as informações',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const users = [mockUser, { ...mockUser, id: 'user-456' }];
      mockUsersService.findAll.mockResolvedValue(users);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(service.findAll).toHaveBeenCalled();
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(users);
      expect(result.data.length).toBe(2);
      expect(result.disclaimer).toBeDefined();
    });

    it('should return empty array when no users exist', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockUsersService.findAll.mockResolvedValue([mockUser]);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getProfile(mockUserId);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(mockUserId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockUser);
      expect(result.data.id).toBe(mockUserId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(controller.getProfile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include disclaimer in profile response', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getProfile(mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await controller.findOne(mockUserId);

      // Assert
      expect(service.findOne).toHaveBeenCalledWith(mockUserId);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockUser);
      expect(result.data.id).toBe(mockUserId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await controller.findOne(mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      orgao: 'Ministério da Economia',
    };

    it('should update a user', async () => {
      // Arrange
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(mockUserId, updateUserDto);

      // Assert
      expect(service.update).toHaveBeenCalledWith(mockUserId, updateUserDto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(updatedUser);
      expect(result.data.name).toBe('Updated User');
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.update.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.update('invalid-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialDto: UpdateUserDto = { name: 'Only Name Updated' };
      const updatedUser = { ...mockUser, name: 'Only Name Updated' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(mockUserId, partialDto);

      // Assert
      expect(result.data.name).toBe('Only Name Updated');
      expect(result.data.orgao).toBe(mockUser.orgao); // Orgao should remain unchanged
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockUsersService.update.mockResolvedValue(mockUser);

      // Act
      const result = await controller.update(mockUserId, updateUserDto);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      // Arrange
      mockUsersService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(mockUserId);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(mockUserId);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('Usuário deletado com sucesso');
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(controller.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include disclaimer in delete response', async () => {
      // Arrange
      mockUsersService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('exportUserData', () => {
    const mockExportData = {
      user: mockUser,
      etps: [
        { id: 'etp-1', title: 'ETP Test 1', sections: [], versions: [] },
        { id: 'etp-2', title: 'ETP Test 2', sections: [], versions: [] },
      ],
      analytics: [
        { id: 'analytics-1', eventType: 'page_view', eventName: 'dashboard' },
      ],
      auditLogs: [{ id: 'audit-1', action: 'create', entityType: 'etp' }],
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        dataRetentionPolicy: 'Os dados serão mantidos por 90 dias',
        lgpdRights: 'Seus direitos LGPD incluem acesso, correção',
        recordCounts: {
          etps: 2,
          analytics: 1,
          auditLogs: 1,
        },
      },
    };

    it('should export all user data successfully', async () => {
      // Arrange
      mockUsersService.exportUserData.mockResolvedValue(mockExportData);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(service.exportUserData).toHaveBeenCalledWith(mockUserId);
      expect(service.exportUserData).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockExportData);
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.etps).toHaveLength(2);
      expect(result.data.analytics).toHaveLength(1);
      expect(result.data.auditLogs).toHaveLength(1);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.exportUserData.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(controller.exportUserData('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.exportUserData('invalid-id')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('should include exportMetadata in response', async () => {
      // Arrange
      mockUsersService.exportUserData.mockResolvedValue(mockExportData);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.data.exportMetadata).toBeDefined();
      expect(result.data.exportMetadata.exportedAt).toBeDefined();
      expect(result.data.exportMetadata.dataRetentionPolicy).toBeDefined();
      expect(result.data.exportMetadata.lgpdRights).toBeDefined();
      expect(result.data.exportMetadata.recordCounts).toEqual({
        etps: 2,
        analytics: 1,
        auditLogs: 1,
      });
    });

    it('should include disclaimer in export response', async () => {
      // Arrange
      mockUsersService.exportUserData.mockResolvedValue(mockExportData);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should handle empty export data', async () => {
      // Arrange
      const emptyExportData = {
        ...mockExportData,
        etps: [],
        analytics: [],
        auditLogs: [],
        exportMetadata: {
          ...mockExportData.exportMetadata,
          recordCounts: { etps: 0, analytics: 0, auditLogs: 0 },
        },
      };
      mockUsersService.exportUserData.mockResolvedValue(emptyExportData);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.data.etps).toHaveLength(0);
      expect(result.data.analytics).toHaveLength(0);
      expect(result.data.auditLogs).toHaveLength(0);
      expect(result.data.exportMetadata.recordCounts).toEqual({
        etps: 0,
        analytics: 0,
        auditLogs: 0,
      });
    });

    it('should return complete user data structure', async () => {
      // Arrange
      mockUsersService.exportUserData.mockResolvedValue(mockExportData);

      // Act
      const result = await controller.exportUserData(mockUserId);

      // Assert
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('etps');
      expect(result.data).toHaveProperty('analytics');
      expect(result.data).toHaveProperty('auditLogs');
      expect(result.data).toHaveProperty('exportMetadata');
    });

    it('should use CurrentUser decorator to extract userId from JWT', async () => {
      // Arrange
      mockUsersService.exportUserData.mockResolvedValue(mockExportData);

      // Act
      await controller.exportUserData(mockUserId);

      // Assert
      // Verify that the service was called with the userId extracted from JWT
      expect(service.exportUserData).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('deleteMyAccount', () => {
    const validDeleteDto: DeleteAccountDto = {
      confirmation: 'DELETE MY ACCOUNT',
      reason: 'Não utilizo mais o sistema',
    };

    const invalidDeleteDto: DeleteAccountDto = {
      confirmation: 'delete my account',
    };

    it('should successfully delete account with valid confirmation', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      expect(service.softDeleteAccount).toHaveBeenCalledWith(mockUserId);
      expect(service.softDeleteAccount).toHaveBeenCalledTimes(1);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('marcada para deleção');
      expect(result.deletionScheduledFor).toBeDefined();
      expect(result.cancellationInfo).toBeDefined();
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw BadRequestException with invalid confirmation', async () => {
      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, invalidDeleteDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.deleteMyAccount(mockUserId, invalidDeleteDto),
      ).rejects.toThrow('Confirmação inválida');

      // Service should not be called if confirmation is invalid
      expect(service.softDeleteAccount).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with empty confirmation', async () => {
      // Arrange
      const emptyDeleteDto: DeleteAccountDto = {
        confirmation: '',
      };

      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, emptyDeleteDto),
      ).rejects.toThrow(BadRequestException);
      expect(service.softDeleteAccount).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, validDeleteDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.deleteMyAccount(mockUserId, validDeleteDto),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('should calculate deletion date 30 days in future', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue(undefined);
      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() + 30);

      // Act
      const result = await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      const deletionDate = new Date(result.deletionScheduledFor);
      const diffDays = Math.ceil(
        (deletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(30);
    });

    it('should include disclaimer in deletion response', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should include cancellation information', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      expect(result.cancellationInfo).toBeDefined();
      expect(result.cancellationInfo).toContain('30 dias');
      expect(result.cancellationInfo).toContain('suporte');
    });

    it('should use CurrentUser decorator to extract userId from JWT', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue(undefined);

      // Act
      await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      // Verify that the service was called with the userId extracted from JWT
      expect(service.softDeleteAccount).toHaveBeenCalledWith(mockUserId);
    });

    it('should be case-sensitive for confirmation string', async () => {
      // Arrange
      const wrongCaseDto: DeleteAccountDto = {
        confirmation: 'Delete My Account',
      };

      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, wrongCaseDto),
      ).rejects.toThrow(BadRequestException);
      expect(service.softDeleteAccount).not.toHaveBeenCalled();
    });
  });
});
