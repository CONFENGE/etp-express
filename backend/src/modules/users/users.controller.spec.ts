import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
});
