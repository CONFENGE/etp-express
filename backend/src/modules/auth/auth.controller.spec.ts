import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserRole } from '../../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
    logLoginFailed: jest.fn(),
    logDataAccess: jest.fn(),
    logProfileAccess: jest.fn(),
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'CONFENGE',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['confenge.gov.br'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    users: [],
    etps: [],
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    organizationId: 'org-123',
    organization: mockOrganization,
    cargo: 'Analista',
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: new Date('2025-01-01'),
    lgpdConsentAt: new Date('2025-01-01'),
    lgpdConsentVersion: '1.0',
    internationalTransferConsentAt: new Date('2025-01-01'),
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    etps: [],
    auditLogs: [],
  };

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    user: mockUser,
    disclaimer: DISCLAIMER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditService, useValue: mockAuditService },
      ],
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
      cargo: 'Analista',
      lgpdConsent: true,
      internationalTransferConsent: true,
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

    const mockIp = '192.168.1.1';
    const mockRequest = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Test)',
      },
    } as any;

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, mockIp, mockRequest);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ip: mockIp,
        userAgent: 'Mozilla/5.0 (Test)',
      });
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
      await expect(
        controller.login(loginDto, mockIp, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.login(loginDto, mockIp, mockRequest),
      ).rejects.toThrow('Email ou senha incorretos');
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ip: mockIp,
        userAgent: 'Mozilla/5.0 (Test)',
      });
    });

    it('should return access token in response', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, mockIp, mockRequest);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should return disclaimer in response', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto, mockIp, mockRequest);

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
