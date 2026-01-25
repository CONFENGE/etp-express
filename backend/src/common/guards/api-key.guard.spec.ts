import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiKeyGuard } from './api-key.guard';
import { User, ApiPlan } from '../../entities/user.entity';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let usersRepository: Repository<User>;
  let reflector: Reflector;

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockExecutionContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access if endpoint is public', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // isPublic = true

      const context = mockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if API Key is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false); // isPublic = false

      const context = mockExecutionContext({}); // No X-API-Key header

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'API Key is required',
      );
    });

    it('should throw ForbiddenException if API Key is invalid', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockUsersRepository.findOne.mockResolvedValue(null); // User not found

      const context = mockExecutionContext({
        'x-api-key': 'invalid-api-key-123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid API Key',
      );
    });

    it('should throw ForbiddenException if user account is inactive', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockUsersRepository.findOne.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        apiKey: 'valid-api-key-123',
        apiPlan: ApiPlan.FREE,
        isActive: false, // Inactive user
      });

      const context = mockExecutionContext({
        'x-api-key': 'valid-api-key-123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'User account is inactive',
      );
    });

    it('should allow access with valid API Key and active user', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        apiKey: 'valid-api-key-123',
        apiPlan: ApiPlan.FREE,
        isActive: true,
      };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const mockRequest = { headers: { 'x-api-key': 'valid-api-key-123' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest).toHaveProperty('user', mockUser);
      expect(mockRequest).toHaveProperty('apiPlan', ApiPlan.FREE);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { apiKey: 'valid-api-key-123' },
        select: ['id', 'email', 'name', 'apiKey', 'apiPlan', 'isActive'],
      });
    });

    it('should attach PRO plan to request for PRO users', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockUser = {
        id: 'pro-user-456',
        email: 'pro@example.com',
        name: 'Pro User',
        apiKey: 'pro-api-key-456',
        apiPlan: ApiPlan.PRO,
        isActive: true,
      };
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const mockRequest = { headers: { 'x-api-key': 'pro-api-key-456' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest).toHaveProperty('apiPlan', ApiPlan.PRO);
    });
  });

  describe('getQuotaForPlan', () => {
    it('should return 100 for FREE plan', () => {
      expect(ApiKeyGuard.getQuotaForPlan(ApiPlan.FREE)).toBe(100);
    });

    it('should return 5000 for PRO plan', () => {
      expect(ApiKeyGuard.getQuotaForPlan(ApiPlan.PRO)).toBe(5000);
    });

    it('should return Number.MAX_SAFE_INTEGER for ENTERPRISE plan', () => {
      expect(ApiKeyGuard.getQuotaForPlan(ApiPlan.ENTERPRISE)).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });
  });

  describe('isQuotaExceeded', () => {
    it('should return true if usage >= quota for FREE plan', () => {
      expect(ApiKeyGuard.isQuotaExceeded(100, ApiPlan.FREE)).toBe(true);
      expect(ApiKeyGuard.isQuotaExceeded(101, ApiPlan.FREE)).toBe(true);
    });

    it('should return false if usage < quota for FREE plan', () => {
      expect(ApiKeyGuard.isQuotaExceeded(99, ApiPlan.FREE)).toBe(false);
      expect(ApiKeyGuard.isQuotaExceeded(0, ApiPlan.FREE)).toBe(false);
    });

    it('should return true if usage >= quota for PRO plan', () => {
      expect(ApiKeyGuard.isQuotaExceeded(5000, ApiPlan.PRO)).toBe(true);
      expect(ApiKeyGuard.isQuotaExceeded(5001, ApiPlan.PRO)).toBe(true);
    });

    it('should return false if usage < quota for PRO plan', () => {
      expect(ApiKeyGuard.isQuotaExceeded(4999, ApiPlan.PRO)).toBe(false);
    });

    it('should always return false for ENTERPRISE plan (unlimited)', () => {
      expect(ApiKeyGuard.isQuotaExceeded(999999, ApiPlan.ENTERPRISE)).toBe(
        false,
      );
      expect(
        ApiKeyGuard.isQuotaExceeded(
          Number.MAX_SAFE_INTEGER - 1,
          ApiPlan.ENTERPRISE,
        ),
      ).toBe(false);
    });
  });
});
