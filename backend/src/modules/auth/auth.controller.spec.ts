import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DISCLAIMER } from '../../common/constants/messages';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'servidor',
    orgao: 'CONFENGE',
    cargo: 'Analista',
  };

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    user: mockUser,
    disclaimer: DISCLAIMER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      orgao: 'CONFENGE',
      cargo: 'Analista',
      lgpdConsent: true,
    };

    it('should register a new user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('disclaimer');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email já cadastrado'),
      );

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email já cadastrado',
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return user without password field', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAuthResponse);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Email ou senha incorretos'),
      );

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Email ou senha incorretos',
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return access token in response', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should return disclaimer in response', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getMe', () => {
    it('should return current user data', async () => {
      // Arrange
      const currentUser = mockUser;

      // Act
      const result = await controller.getMe(currentUser);

      // Assert
      expect(result).toHaveProperty('user', currentUser);
      expect(result).toHaveProperty('disclaimer');
    });

    it('should return disclaimer with user data', async () => {
      // Arrange
      const currentUser = mockUser;

      // Act
      const result = await controller.getMe(currentUser);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('validateToken', () => {
    it('should return valid status with user data', async () => {
      // Arrange
      const currentUser = mockUser;

      // Act
      const result = await controller.validateToken(currentUser);

      // Assert
      expect(result).toEqual({
        valid: true,
        user: currentUser,
      });
    });

    it('should return valid: true when token is valid', async () => {
      // Arrange
      const currentUser = mockUser;

      // Act
      const result = await controller.validateToken(currentUser);

      // Assert
      expect(result.valid).toBe(true);
    });
  });
});
