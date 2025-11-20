import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password: '$2b$10$hashedPassword',
    name: 'Test User',
    role: 'servidor',
    orgao: 'CONFENGE',
    cargo: 'Analista',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      // Assert
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      // UserWithoutPassword type ensures password is excluded
      expect('password' in (result as any)).toBe(false);
      expect(result?.email).toBe(mockUser.email);
      expect(result?.id).toBe(mockUser.id);
    });

    it('should return null when user is not found', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      // Assert
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password,
      );
      expect(result).toBeNull();
      expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow('Usuário inativo');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token and user data when credentials are valid', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        orgao: mockUser.orgao,
        cargo: mockUser.cargo,
      });
      expect(result).toHaveProperty('disclaimer');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email ou senha incorretos',
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      orgao: 'CONFENGE',
      cargo: 'Analista',
      lgpdConsent: true,
    };

    it('should throw BadRequestException when LGPD consent is not provided', async () => {
      // Arrange
      const dtoWithoutConsent = { ...registerDto, lgpdConsent: false };

      // Act & Assert
      await expect(service.register(dtoWithoutConsent)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(dtoWithoutConsent)).rejects.toThrow(
        'É obrigatório aceitar os termos de uso e política de privacidade (LGPD)',
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email já cadastrado',
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should create user with hashed password and LGPD consent timestamp', async () => {
      // Arrange
      const hashedPassword = '$2b$10$newHashedPassword';
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
        lgpdConsentAt: new Date(),
        lgpdConsentVersion: '1.0.0',
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          orgao: registerDto.orgao,
          cargo: registerDto.cargo,
          lgpdConsentVersion: '1.0.0',
        }),
      );
      // Verify lgpdConsentAt is a Date
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lgpdConsentAt: expect.any(Date),
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(result).toHaveProperty('disclaimer');
    });

    it('should not store plain text password', async () => {
      // Arrange
      const hashedPassword = '$2b$10$newHashedPassword';
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.register(registerDto);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: hashedPassword,
        }),
      );
      expect(mockUsersService.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: registerDto.password,
        }),
      );
    });

    it('should save LGPD consent version 1.0.0', async () => {
      // Arrange
      const hashedPassword = '$2b$10$newHashedPassword';
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        lgpdConsentAt: new Date(),
        lgpdConsentVersion: '1.0.0',
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.register(registerDto);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lgpdConsentVersion: '1.0.0',
        }),
      );
    });
  });

  describe('validateToken', () => {
    const mockToken = 'valid-jwt-token';
    const mockPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
    };

    it('should return valid status and user data when token is valid', async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateToken(mockToken);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        valid: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockConfigService.get.mockReturnValue(null); // No JWT_SECRET_OLD

      // Act & Assert
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        'Token inválido ou expirado',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        'Token inválido',
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUsersService.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateToken(mockToken)).rejects.toThrow(
        'Token inválido',
      );
    });

    describe('dual-key support', () => {
      it('should try old secret when primary fails and JWT_SECRET_OLD is configured', async () => {
        // Arrange
        let callCount = 0;
        mockJwtService.verify.mockImplementation((token: string, options?: any) => {
          callCount++;
          if (callCount === 1) {
            // First call (primary secret) fails
            throw new Error('Invalid signature');
          }
          // Second call (with old secret) succeeds
          return mockPayload;
        });
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'JWT_SECRET_OLD') return 'old-secret-key';
          return null;
        });
        mockUsersService.findOne.mockResolvedValue(mockUser);

        // Act
        const result = await service.validateToken(mockToken);

        // Assert
        expect(mockJwtService.verify).toHaveBeenCalledTimes(2);
        expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET_OLD');
        expect(result).toEqual({
          valid: true,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          },
        });
      });

      it('should throw UnauthorizedException when both primary and old secrets fail', async () => {
        // Arrange
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'JWT_SECRET_OLD') return 'old-secret-key';
          return null;
        });

        // Act & Assert
        await expect(service.validateToken(mockToken)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.validateToken(mockToken)).rejects.toThrow(
          'Token inválido ou expirado',
        );
      });

      it('should not try old secret when JWT_SECRET_OLD is not configured', async () => {
        // Arrange
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        mockConfigService.get.mockReturnValue(null); // No JWT_SECRET_OLD

        // Act & Assert
        await expect(service.validateToken(mockToken)).rejects.toThrow(
          UnauthorizedException,
        );
        // Token validation called once, then config.get called once for JWT_SECRET_OLD
        expect(mockJwtService.verify).toHaveBeenCalledTimes(1);
        expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET_OLD');
      });
    });
  });
});
