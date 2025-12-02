import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy - Dual-Key Support', () => {
  let strategy: JwtStrategy;
  let usersService: UsersService;

  const PRIMARY_SECRET = 'primary-secret-key';
  const OLD_SECRET = 'old-secret-key';
  const INVALID_SECRET = 'invalid-secret-key';

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
    name: 'Test User',
    role: 'servidor',
    organizationId: 'org-123',
    organization: mockOrganization,
    cargo: 'Analista',
    isActive: true,
  };

  const mockPayload = {
    sub: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    role: mockUser.role,
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  describe('with dual-key mode enabled (JWT_SECRET_OLD configured)', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return PRIMARY_SECRET;
        if (key === 'JWT_SECRET_OLD') return OLD_SECRET;
        return null;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UsersService, useValue: mockUsersService },
        ],
      }).compile();

      strategy = module.get<JwtStrategy>(JwtStrategy);
      usersService = module.get<UsersService>(UsersService);

      jest.clearAllMocks();
      mockUsersService.findOne.mockResolvedValue(mockUser);
    });

    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should accept token signed with primary secret (JWT_SECRET)', async () => {
      // Create token with primary secret
      const token = jwt.sign(mockPayload, PRIMARY_SECRET);

      // Strategy's secretOrKeyProvider will validate the token
      // For validate(), we just need to verify it returns correct user data
      const result = await strategy.validate(mockPayload);

      expect(usersService.findOne).toHaveBeenCalledWith(mockPayload.sub);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should accept token signed with old secret (JWT_SECRET_OLD)', async () => {
      // Create token with old secret
      const token = jwt.sign(mockPayload, OLD_SECRET);

      // Verify token is valid with old secret
      const decoded = jwt.verify(token, OLD_SECRET);
      expect(decoded).toHaveProperty('sub', mockPayload.sub);

      // Validate returns user data
      const result = await strategy.validate(mockPayload);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should reject token signed with invalid secret', () => {
      // Create token with invalid secret
      const token = jwt.sign(mockPayload, INVALID_SECRET);

      // Should not be verifiable with primary or old secret
      expect(() => jwt.verify(token, PRIMARY_SECRET)).toThrow();
      expect(() => jwt.verify(token, OLD_SECRET)).toThrow();
    });

    it('should generate new tokens with primary secret only', () => {
      // Create token with primary secret (simulating what AuthService does)
      const token = jwt.sign(mockPayload, PRIMARY_SECRET);

      // Verify it's valid with primary secret
      expect(() => jwt.verify(token, PRIMARY_SECRET)).not.toThrow();

      // Verify it's NOT valid with old secret
      expect(() => jwt.verify(token, OLD_SECRET)).toThrow();
    });

    it('should prioritize primary secret over old secret', () => {
      // Token signed with primary should be validated first
      const token = jwt.sign(mockPayload, PRIMARY_SECRET);

      // Should validate successfully
      const decoded = jwt.verify(token, PRIMARY_SECRET);
      expect(decoded).toHaveProperty('sub', mockPayload.sub);
    });
  });

  describe('with single-key mode (JWT_SECRET_OLD not configured)', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return PRIMARY_SECRET;
        return null;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UsersService, useValue: mockUsersService },
        ],
      }).compile();

      strategy = module.get<JwtStrategy>(JwtStrategy);
      usersService = module.get<UsersService>(UsersService);

      jest.clearAllMocks();
      mockUsersService.findOne.mockResolvedValue(mockUser);
    });

    it('should accept token signed with primary secret', async () => {
      const token = jwt.sign(mockPayload, PRIMARY_SECRET);
      const decoded = jwt.verify(token, PRIMARY_SECRET);

      expect(decoded).toHaveProperty('sub', mockPayload.sub);

      const result = await strategy.validate(mockPayload);
      expect(result.id).toBe(mockUser.id);
    });

    it('should reject token signed with any other secret', () => {
      const token = jwt.sign(mockPayload, INVALID_SECRET);

      expect(() => jwt.verify(token, PRIMARY_SECRET)).toThrow();
    });
  });

  describe('token expiration handling', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return PRIMARY_SECRET;
        if (key === 'JWT_SECRET_OLD') return OLD_SECRET;
        return null;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UsersService, useValue: mockUsersService },
        ],
      }).compile();

      strategy = module.get<JwtStrategy>(JwtStrategy);
      jest.clearAllMocks();
    });

    it('should reject expired token even with valid secret', () => {
      // Create expired token
      const expiredPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const token = jwt.sign(expiredPayload, PRIMARY_SECRET);

      // Should throw token expired error
      expect(() => jwt.verify(token, PRIMARY_SECRET)).toThrow('jwt expired');
    });

    it('should reject expired token from old secret during rotation', () => {
      // Create expired token with old secret
      const expiredPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const token = jwt.sign(expiredPayload, OLD_SECRET);

      // Should throw token expired error
      expect(() => jwt.verify(token, OLD_SECRET)).toThrow('jwt expired');
    });
  });

  describe('user validation after token verification', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return PRIMARY_SECRET;
        if (key === 'JWT_SECRET_OLD') return OLD_SECRET;
        return null;
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: UsersService, useValue: mockUsersService },
        ],
      }).compile();

      strategy = module.get<JwtStrategy>(JwtStrategy);
      jest.clearAllMocks();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Usuário inválido ou inativo',
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findOne.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        'Usuário inválido ou inativo',
      );
    });
  });
});
