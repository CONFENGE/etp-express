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
import { AuditService } from '../audit/audit.service';
import { OrganizationsService } from '../organizations/organizations.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let organizationsService: OrganizationsService;

  const mockOrganization = {
    id: 'org-123',
    name: 'CONFENGE',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['confenge.gov.br'],
    isActive: true,
    stripeCustomerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password: '$2b$10$hashedPassword',
    name: 'Test User',
    role: 'servidor',
    organizationId: 'org-123',
    organization: mockOrganization,
    cargo: 'Analista',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
    findOne: jest.fn(),
    updatePassword: jest.fn(),
    setMustChangePassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditService = {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
    logLoginFailed: jest.fn(),
    logProfileAccess: jest.fn(),
    logDataAccess: jest.fn(),
    logPasswordChange: jest.fn(),
  };

  const mockOrganizationsService = {
    findByDomain: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    organizationsService =
      module.get<OrganizationsService>(OrganizationsService);

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
        organizationId: mockUser.organizationId,
        mustChangePassword: mockUser.mustChangePassword,
      });
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        cargo: mockUser.cargo,
        organizationId: mockUser.organizationId,
        mustChangePassword: mockUser.mustChangePassword,
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
      cargo: 'Analista',
      lgpdConsent: true,
      internationalTransferConsent: true,
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

    it('should throw BadRequestException when international transfer consent is not provided', async () => {
      // Arrange
      const dtoWithoutTransferConsent = {
        ...registerDto,
        internationalTransferConsent: false,
      };

      // Act & Assert
      await expect(service.register(dtoWithoutTransferConsent)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(dtoWithoutTransferConsent)).rejects.toThrow(
        'É obrigatório aceitar a transferência internacional de dados (LGPD Art. 33)',
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
      const authorizedDto = { ...registerDto, email: 'user@example.com' };
      mockUsersService.findByEmail.mockResolvedValue(null);
      // MT-03: Mock organization lookup
      mockOrganizationsService.findByDomain.mockResolvedValue(mockOrganization);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        email: authorizedDto.email,
        name: authorizedDto.name,
        password: hashedPassword,
        organizationId: mockOrganization.id,
        lgpdConsentAt: new Date(),
        lgpdConsentVersion: '1.0.0',
        internationalTransferConsentAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.register(authorizedDto);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(authorizedDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: authorizedDto.email,
          password: hashedPassword,
          name: authorizedDto.name,
          cargo: authorizedDto.cargo,
          organizationId: mockOrganization.id,
          lgpdConsentVersion: '1.0.0',
        }),
      );
      // Verify lgpdConsentAt is a Date
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lgpdConsentAt: expect.any(Date),
        }),
      );
      // Verify internationalTransferConsentAt is a Date
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          internationalTransferConsentAt: expect.any(Date),
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(authorizedDto.email);
      expect(result).toHaveProperty('disclaimer');
    });

    it('should not store plain text password', async () => {
      // Arrange
      const hashedPassword = '$2b$10$newHashedPassword';
      const authorizedDto = { ...registerDto, email: 'user@example.com' };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockOrganizationsService.findByDomain.mockResolvedValue(mockOrganization);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        organizationId: mockOrganization.id,
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.register(authorizedDto);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: hashedPassword,
        }),
      );
      expect(mockUsersService.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password: authorizedDto.password,
        }),
      );
    });

    it('should save LGPD consent version 1.0.0', async () => {
      // Arrange
      const hashedPassword = '$2b$10$newHashedPassword';
      const authorizedDto = { ...registerDto, email: 'user@example.com' };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockOrganizationsService.findByDomain.mockResolvedValue(mockOrganization);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        organizationId: mockOrganization.id,
        lgpdConsentAt: new Date(),
        lgpdConsentVersion: '1.0.0',
      });
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      await service.register(authorizedDto);

      // Assert
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lgpdConsentVersion: '1.0.0',
        }),
      );
    });

    // MT-03: Domain validation tests
    describe('MT-03: Domain Validation & Multi-Tenancy', () => {
      it('should reject registration when email domain is not authorized', async () => {
        // Arrange
        const unauthorizedDto = {
          ...registerDto,
          email: 'user@unauthorized-domain.com',
        };
        mockUsersService.findByEmail.mockResolvedValue(null);
        mockOrganizationsService.findByDomain.mockResolvedValue(null);

        // Act & Assert
        await expect(service.register(unauthorizedDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.register(unauthorizedDto)).rejects.toThrow(
          'Domínio de email "unauthorized-domain.com" não autorizado. Contate comercial@etpexpress.com.br para cadastrar sua organização.',
        );
        expect(mockOrganizationsService.findByDomain).toHaveBeenCalledWith(
          'unauthorized-domain.com',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should reject registration when organization is suspended', async () => {
        // Arrange
        const suspendedOrg = { ...mockOrganization, isActive: false };
        const userDto = { ...registerDto, email: 'user@confenge.gov.br' };
        mockUsersService.findByEmail.mockResolvedValue(null);
        mockOrganizationsService.findByDomain.mockResolvedValue(suspendedOrg);

        // Act & Assert
        await expect(service.register(userDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.register(userDto)).rejects.toThrow(
          'Organização "CONFENGE" está suspensa. Contate o suporte.',
        );
        expect(mockOrganizationsService.findByDomain).toHaveBeenCalledWith(
          'confenge.gov.br',
        );
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });

      it('should create user with organizationId when domain is authorized', async () => {
        // Arrange
        const hashedPassword = '$2b$10$newHashedPassword';
        const authorizedDto = { ...registerDto, email: 'user@confenge.gov.br' };
        mockUsersService.findByEmail.mockResolvedValue(null);
        mockOrganizationsService.findByDomain.mockResolvedValue(
          mockOrganization,
        );
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
        mockUsersService.create.mockResolvedValue({
          ...mockUser,
          email: authorizedDto.email,
          organizationId: mockOrganization.id,
        });
        mockJwtService.sign.mockReturnValue('mock-jwt-token');

        // Act
        const result = await service.register(authorizedDto);

        // Assert
        expect(mockOrganizationsService.findByDomain).toHaveBeenCalledWith(
          'confenge.gov.br',
        );
        expect(mockUsersService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: mockOrganization.id,
          }),
        );
        expect(result.user.organizationId).toBe(mockOrganization.id);
      });

      it('should extract domain in lowercase (case-insensitive matching)', async () => {
        // Arrange
        const hashedPassword = '$2b$10$newHashedPassword';
        const mixedCaseDto = {
          ...registerDto,
          email: 'User@CONFENGE.GOV.BR',
        };
        mockUsersService.findByEmail.mockResolvedValue(null);
        mockOrganizationsService.findByDomain.mockResolvedValue(
          mockOrganization,
        );
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
        mockUsersService.create.mockResolvedValue({
          ...mockUser,
          organizationId: mockOrganization.id,
        });
        mockJwtService.sign.mockReturnValue('mock-jwt-token');

        // Act
        await service.register(mixedCaseDto);

        // Assert
        expect(mockOrganizationsService.findByDomain).toHaveBeenCalledWith(
          'confenge.gov.br',
        );
      });

      it('should include organizationId in JWT payload', async () => {
        // Arrange
        const hashedPassword = '$2b$10$newHashedPassword';
        const authorizedDto = { ...registerDto, email: 'user@confenge.gov.br' };
        mockUsersService.findByEmail.mockResolvedValue(null);
        mockOrganizationsService.findByDomain.mockResolvedValue(
          mockOrganization,
        );
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
        mockUsersService.create.mockResolvedValue({
          ...mockUser,
          organizationId: mockOrganization.id,
        });
        mockJwtService.sign.mockReturnValue('mock-jwt-token');

        // Act
        await service.register(authorizedDto);

        // Assert
        expect(mockJwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: mockOrganization.id,
          }),
        );
      });

      it('should reject registration with invalid email format', async () => {
        // Arrange
        const invalidEmailDto = { ...registerDto, email: 'invalid-email' };

        // Act & Assert
        await expect(service.register(invalidEmailDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.register(invalidEmailDto)).rejects.toThrow(
          'Email inválido',
        );
        expect(mockOrganizationsService.findByDomain).not.toHaveBeenCalled();
        expect(mockUsersService.create).not.toHaveBeenCalled();
      });
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
          organizationId: mockUser.organizationId,
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
        mockJwtService.verify.mockImplementation(
          (token: string, options?: any) => {
            callCount++;
            if (callCount === 1) {
              // First call (primary secret) fails
              throw new Error('Invalid signature');
            }
            // Second call (with old secret) succeeds
            return mockPayload;
          },
        );
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
            organizationId: mockUser.organizationId,
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

  describe('changePassword (M8: Domain Management)', () => {
    const changePasswordDto = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };

    const mockMetadata = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test',
    };

    it('should change password successfully and return new JWT token', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // Old password valid
        .mockResolvedValueOnce(false); // New password different
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newHashedPassword');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockUsersService.setMustChangePassword.mockResolvedValue(undefined);
      mockAuditService.logPasswordChange.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await service.changePassword(
        mockUser.id,
        changePasswordDto,
        mockMetadata,
      );

      // Assert
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.oldPassword,
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
        10,
      );
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        '$2b$10$newHashedPassword',
      );
      expect(mockUsersService.setMustChangePassword).toHaveBeenCalledWith(
        mockUser.id,
        false,
      );
      expect(mockAuditService.logPasswordChange).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          ip: mockMetadata.ip,
          userAgent: mockMetadata.userAgent,
          wasMandatory: false,
        }),
      );
      expect(result).toHaveProperty('message', 'Senha alterada com sucesso');
      expect(result).toHaveProperty('accessToken', 'new-jwt-token');
      expect(result.user.mustChangePassword).toBe(false);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow('Usuário inativo');
    });

    it('should throw UnauthorizedException when old password is incorrect', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow('Senha atual incorreta');
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new password equals old password', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // First call: Old password valid
        .mockResolvedValueOnce(true); // Second call: New password same as old

      // Act & Assert
      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow(BadRequestException);

      // Reset mock for second assertion
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        service.changePassword(mockUser.id, changePasswordDto, mockMetadata),
      ).rejects.toThrow('Nova senha não pode ser igual à senha atual');
      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should log mandatory password change when mustChangePassword is true', async () => {
      // Arrange
      const userWithMandatoryChange = { ...mockUser, mustChangePassword: true };
      mockUsersService.findOne.mockResolvedValue(userWithMandatoryChange);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newHashedPassword');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockUsersService.setMustChangePassword.mockResolvedValue(undefined);
      mockAuditService.logPasswordChange.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      await service.changePassword(
        mockUser.id,
        changePasswordDto,
        mockMetadata,
      );

      // Assert
      expect(mockAuditService.logPasswordChange).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          wasMandatory: true,
        }),
      );
    });

    it('should include mustChangePassword=false in new JWT token', async () => {
      // Arrange
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newHashedPassword');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockUsersService.setMustChangePassword.mockResolvedValue(undefined);
      mockAuditService.logPasswordChange.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      // Act
      await service.changePassword(
        mockUser.id,
        changePasswordDto,
        mockMetadata,
      );

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          organizationId: mockUser.organizationId,
          mustChangePassword: false,
        }),
      );
    });
  });
});
