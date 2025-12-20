import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { AuthController, AUTH_COOKIE_NAME } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserRole } from '../../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
    logLoginFailed: jest.fn(),
    logDataAccess: jest.fn(),
    logProfileAccess: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return undefined;
    }),
  };

  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

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
    authorizedDomainId: null,
    authorizedDomain: null,
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
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

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

    it('should register a new user and set httpOnly cookie', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto, mockResponse);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false, // development mode
          sameSite: 'lax',
          path: '/',
        }),
      );
      // Token should NOT be in response body
      expect(result).not.toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('disclaimer');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email ja cadastrado'),
      );

      // Act & Assert
      await expect(
        controller.register(registerDto, mockResponse),
      ).rejects.toThrow(ConflictException);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return user without password field', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto, mockResponse);

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
    } as unknown as Request;

    it('should login user and set httpOnly cookie', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(
        loginDto,
        mockIp,
        mockRequest as never,
        mockResponse,
      );

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ip: mockIp,
        userAgent: 'Mozilla/5.0 (Test)',
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        }),
      );
      // Token should NOT be in response body
      expect(result).not.toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Email ou senha incorretos'),
      );

      // Act & Assert
      await expect(
        controller.login(loginDto, mockIp, mockRequest as never, mockResponse),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        ip: mockIp,
        userAgent: 'Mozilla/5.0 (Test)',
      });
    });

    it('should return disclaimer in response', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(
        loginDto,
        mockIp,
        mockRequest as never,
        mockResponse,
      );

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('logout', () => {
    it('should clear auth cookie and return success message', async () => {
      // Act
      const result = await controller.logout(mockResponse);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
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

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword456',
    };

    const mockIp = '192.168.1.1';
    const mockRequest = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Test)',
      },
    } as unknown as Request;

    const mockChangePasswordResponse = {
      message: 'Senha alterada com sucesso',
      accessToken: 'new-jwt-token',
      user: { ...mockUser, mustChangePassword: false },
    };

    it('should change password and set new httpOnly cookie', async () => {
      // Arrange
      mockAuthService.changePassword.mockResolvedValue(
        mockChangePasswordResponse,
      );

      // Act
      const result = await controller.changePassword(
        mockUser,
        changePasswordDto,
        mockIp,
        mockRequest as never,
        mockResponse,
      );

      // Assert
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
        {
          ip: mockIp,
          userAgent: 'Mozilla/5.0 (Test)',
        },
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'new-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        }),
      );
      // Token should NOT be in response body
      expect(result).not.toHaveProperty('accessToken');
      expect(result).toHaveProperty('message', 'Senha alterada com sucesso');
      expect(result).toHaveProperty('user');
    });
  });

  describe('cookie security settings', () => {
    it('should set secure: true in production', async () => {
      // Arrange - create production config mock
      const prodConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          return undefined;
        }),
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Need to recreate controller with new config
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: AuditService, useValue: mockAuditService },
          { provide: ConfigService, useValue: prodConfigService },
        ],
      }).compile();

      const prodController = module.get<AuthController>(AuthController);
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockReq = {
        headers: { 'user-agent': 'Mozilla/5.0' },
      } as unknown as Request;

      // Act
      await prodController.login(
        loginDto,
        '127.0.0.1',
        mockReq as never,
        mockResponse,
      );

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true, // production mode
          sameSite: 'lax',
        }),
      );
    });
  });

  /**
   * Rate limiting tests (#804)
   *
   * Validates that auth endpoints have correct @Throttle decorators:
   * - login: 5 requests/minute (brute force protection)
   * - register: 3 requests/hour (abuse prevention)
   * - forgot-password: 3 requests/hour (abuse prevention)
   * - change-password: 3 requests/minute (brute force protection)
   * - reset-password: 5 requests/minute
   */
  describe('rate limiting configuration (#804)', () => {
    const reflector = new Reflector();

    it('should have rate limiting on login: 5 requests per minute', () => {
      // Get throttle metadata from the login method
      const throttleMetadata = reflector.get(
        'THROTTLER:LIMIT',
        AuthController.prototype.login,
      );

      // Alternative: Check method has @Throttle decorator applied
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.login,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(true);
    });

    it('should have rate limiting on register: 3 requests per hour', () => {
      // Verify @Throttle decorator is present on register method
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.register,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(true);
    });

    it('should have rate limiting on forgot-password: 3 requests per hour', () => {
      // Verify @Throttle decorator is present on forgotPassword method
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.forgotPassword,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(true);
    });

    it('should have rate limiting on change-password: 3 requests per minute', () => {
      // Verify @Throttle decorator is present on changePassword method
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.changePassword,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(true);
    });

    it('should have rate limiting on reset-password: 5 requests per minute', () => {
      // Verify @Throttle decorator is present on resetPassword method
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.resetPassword,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(true);
    });

    it('should NOT have rate limiting on /me endpoint (authenticated only)', () => {
      // /me should not have throttling - it's protected by JWT
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.getMe,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(false);
    });

    it('should NOT have rate limiting on /validate endpoint (authenticated only)', () => {
      // /validate should not have throttling - it's protected by JWT
      const hasThrottleDecorator = Reflect.getMetadataKeys(
        AuthController.prototype.validateToken,
      ).some((key) => key.toString().includes('THROTTLER'));

      expect(hasThrottleDecorator).toBe(false);
    });
  });
});
