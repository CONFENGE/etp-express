import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { CancelDeletionDto } from './dto/cancel-deletion.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  let jwtService: JwtService;

  const mockUserId = 'user-123';

  const mockOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'CONFENGE',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['example.com'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    organization: mockOrganization,
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
    cancelDeletion: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

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
      organizationId: 'org-123',
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
      expect(result.data.organizationId).toBe(mockUser.organizationId); // Organization should remain unchanged
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
      reason: 'Não preciso mais da plataforma',
    };

    const scheduledDeletionDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days from now

    it('should soft delete account successfully with valid confirmation', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      const result = await controller.deleteMyAccount(
        mockUserId,
        validDeleteDto,
      );

      // Assert
      expect(service.softDeleteAccount).toHaveBeenCalledWith(
        mockUserId,
        validDeleteDto.reason,
      );
      expect(service.softDeleteAccount).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('marcada para deleção');
      expect(result.deletionScheduledFor).toBe(
        scheduledDeletionDate.toISOString(),
      );
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('30 dias');
    });

    it('should throw BadRequestException with invalid confirmation', async () => {
      // Arrange
      const invalidDeleteDto: DeleteAccountDto = {
        confirmation: 'delete my account', // lowercase - invalid
      };

      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, invalidDeleteDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.deleteMyAccount(mockUserId, invalidDeleteDto),
      ).rejects.toThrow('Confirmação inválida');

      // Verify service was NOT called due to validation failure
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

    it('should throw BadRequestException with wrong confirmation phrase', async () => {
      // Arrange
      const wrongDeleteDto: DeleteAccountDto = {
        confirmation: 'DELETE ACCOUNT', // Missing "MY"
      };

      // Act & Assert
      await expect(
        controller.deleteMyAccount(mockUserId, wrongDeleteDto),
      ).rejects.toThrow(BadRequestException);

      expect(service.softDeleteAccount).not.toHaveBeenCalled();
    });

    it('should accept deletion without reason (optional field)', async () => {
      // Arrange
      const deleteWithoutReason: DeleteAccountDto = {
        confirmation: 'DELETE MY ACCOUNT',
      };
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      const result = await controller.deleteMyAccount(
        mockUserId,
        deleteWithoutReason,
      );

      // Assert
      expect(service.softDeleteAccount).toHaveBeenCalledWith(
        mockUserId,
        undefined,
      );
      expect(result.message).toContain('marcada para deleção');
      expect(result.deletionScheduledFor).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.deleteMyAccount('invalid-id', validDeleteDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.deleteMyAccount('invalid-id', validDeleteDto),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('should include deletion scheduled date in ISO format', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      const result = await controller.deleteMyAccount(
        mockUserId,
        validDeleteDto,
      );

      // Assert
      expect(result.deletionScheduledFor).toBe(
        scheduledDeletionDate.toISOString(),
      );
      // Verify ISO format
      expect(result.deletionScheduledFor).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should include comprehensive disclaimer in response', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      const result = await controller.deleteMyAccount(
        mockUserId,
        validDeleteDto,
      );

      // Assert
      expect(result.disclaimer).toContain('30 dias');
      expect(result.disclaimer).toContain('permanentemente removidos');
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should pass optional reason to service when provided', async () => {
      // Arrange
      const deleteWithReason: DeleteAccountDto = {
        confirmation: 'DELETE MY ACCOUNT',
        reason: 'Mudança de plataforma',
      };
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      await controller.deleteMyAccount(mockUserId, deleteWithReason);

      // Assert
      expect(service.softDeleteAccount).toHaveBeenCalledWith(
        mockUserId,
        'Mudança de plataforma',
      );
    });

    it('should use CurrentUser decorator to extract userId from JWT', async () => {
      // Arrange
      mockUsersService.softDeleteAccount.mockResolvedValue({
        scheduledDeletionDate,
      });

      // Act
      await controller.deleteMyAccount(mockUserId, validDeleteDto);

      // Assert
      // Verify that the service was called with the userId extracted from JWT
      expect(service.softDeleteAccount).toHaveBeenCalledWith(
        mockUserId,
        validDeleteDto.reason,
      );
    });
  });

  describe('cancelDeletion', () => {
    const mockToken = 'valid-jwt-token-123';
    const cancelDto: CancelDeletionDto = { token: mockToken };

    it('should successfully cancel deletion with valid token', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUserId,
        type: 'CANCEL_DELETION',
      });
      mockUsersService.cancelDeletion.mockResolvedValue(undefined);

      // Act
      const result = await controller.cancelDeletion(cancelDto);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
      expect(service.cancelDeletion).toHaveBeenCalledWith(mockUserId);
      expect(service.cancelDeletion).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'Exclusão de conta cancelada com sucesso',
        accountReactivated: true,
        disclaimer: expect.any(String),
      });
      expect(result.disclaimer).toContain('reativada');
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should throw BadRequestException if token type is wrong', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUserId,
        type: 'WRONG_TYPE', // Invalid type
      });

      // Act & Assert
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        'Token inválido. Este token não é para cancelamento de deleção.',
      );

      // Verify service was NOT called
      expect(service.cancelDeletion).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      // Arrange
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockJwtService.verifyAsync.mockRejectedValue(expiredError);

      // Act & Assert
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        'Token expirado. O período de 30 dias para cancelamento expirou.',
      );

      // Verify service was NOT called
      expect(service.cancelDeletion).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token signature is invalid', async () => {
      // Arrange
      const jwtError = new Error('Invalid signature');
      jwtError.name = 'JsonWebTokenError';
      mockJwtService.verifyAsync.mockRejectedValue(jwtError);

      // Act & Assert
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        'Token inválido ou assinatura inválida.',
      );

      // Verify service was NOT called
      expect(service.cancelDeletion).not.toHaveBeenCalled();
    });

    it('should re-throw BadRequestException from service if account not marked for deletion', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: mockUserId,
        type: 'CANCEL_DELETION',
      });

      const serviceError = new BadRequestException(
        'Conta não está marcada para deleção',
      );
      mockUsersService.cancelDeletion.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        'Conta não está marcada para deleção',
      );

      // Verify JWT was verified and service was called
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
      expect(service.cancelDeletion).toHaveBeenCalledWith(mockUserId);
    });

    it('should re-throw NotFoundException from service if user not found', async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'non-existent-user-id',
        type: 'CANCEL_DELETION',
      });

      mockUsersService.cancelDeletion.mockRejectedValue(
        new NotFoundException('Usuário não encontrado'),
      );

      // Act & Assert
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.cancelDeletion(cancelDto)).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('should extract userId from JWT token payload', async () => {
      // Arrange
      const testUserId = 'test-user-uuid-456';
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: testUserId,
        type: 'CANCEL_DELETION',
      });
      mockUsersService.cancelDeletion.mockResolvedValue(undefined);

      // Act
      await controller.cancelDeletion(cancelDto);

      // Assert - verify service called with extracted userId
      expect(service.cancelDeletion).toHaveBeenCalledWith(testUserId);
    });
  });
});
