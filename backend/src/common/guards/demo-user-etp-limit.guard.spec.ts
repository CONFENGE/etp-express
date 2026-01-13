import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemoUserEtpLimitGuard } from './demo-user-etp-limit.guard';
import { User, UserRole } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';

describe('DemoUserEtpLimitGuard', () => {
  let guard: DemoUserEtpLimitGuard;
  let userRepository: Repository<User>;
  let etpRepository: Repository<Etp>;

  const mockUserRepository = {
    update: jest.fn(),
  };

  const mockEtpRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoUserEtpLimitGuard,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
      ],
    }).compile();

    guard = module.get<DemoUserEtpLimitGuard>(DemoUserEtpLimitGuard);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));

    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user: Partial<User> | null,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockDemoUser = (
    etpLimitCount: number | null = 3,
  ): Partial<User> => ({
    id: 'demo-user-id-123',
    email: 'demo@example.com',
    role: UserRole.DEMO,
    etpLimitCount,
  });

  const createMockRegularUser = (): Partial<User> => ({
    id: 'regular-user-id-456',
    email: 'user@example.com',
    role: UserRole.USER,
    etpLimitCount: null,
  });

  const createMockAdminUser = (): Partial<User> => ({
    id: 'admin-user-id-789',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    etpLimitCount: null,
  });

  describe('No User (Unauthenticated)', () => {
    it('should allow access when no user is present (let JwtAuthGuard handle)', async () => {
      const context = createMockExecutionContext(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(etpRepository.count).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Non-Demo Users', () => {
    it('should allow access for regular users without checking ETP count', async () => {
      const user = createMockRegularUser();
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(etpRepository.count).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should allow access for admin users without checking ETP count', async () => {
      const user = createMockAdminUser();
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(etpRepository.count).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should allow access for system admin users', async () => {
      const user = {
        id: 'system-admin-id',
        email: 'sysadmin@example.com',
        role: UserRole.SYSTEM_ADMIN,
        etpLimitCount: null,
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(etpRepository.count).not.toHaveBeenCalled();
    });
  });

  describe('Demo Users - Under Limit', () => {
    it('should allow demo user with 0 ETPs (limit 3)', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(0);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(etpRepository.count).toHaveBeenCalledWith({
        where: { createdById: 'demo-user-id-123' },
      });
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should allow demo user with 1 ETP (limit 3)', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(1);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should allow demo user with 2 ETPs (limit 3)', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(2);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('Demo Users - At or Over Limit', () => {
    it('should block demo user at limit (3 ETPs, limit 3)', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(3);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(userRepository.update).toHaveBeenCalledWith('demo-user-id-123', {
        isActive: false,
      });
    });

    it('should return structured error with code DEMO_ETP_LIMIT_REACHED', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(3);

      try {
        await guard.canActivate(context);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toEqual({
          code: 'DEMO_ETP_LIMIT_REACHED',
          message:
            'Limite de ETPs atingido. Sua conta demo está bloqueada para criação.',
          etpCount: 3,
          limit: 3,
        });
      }
    });

    it('should block demo user over limit (5 ETPs, limit 3)', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(5);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(userRepository.update).toHaveBeenCalledWith('demo-user-id-123', {
        isActive: false,
      });
    });
  });

  describe('Custom ETP Limits', () => {
    it('should respect custom limit of 5', async () => {
      const user = createMockDemoUser(5);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(4);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should block at custom limit of 5', async () => {
      const user = createMockDemoUser(5);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(5);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      const error = await guard
        .canActivate(context)
        .catch((e: ForbiddenException) => e);
      const response = (error as ForbiddenException).getResponse();
      expect((response as { limit: number }).limit).toBe(5);
    });

    it('should use default limit of 3 when etpLimitCount is null', async () => {
      const user = createMockDemoUser(null);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(3);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      const error = await guard
        .canActivate(context)
        .catch((e: ForbiddenException) => e);
      const response = (error as ForbiddenException).getResponse();
      expect((response as { limit: number }).limit).toBe(3);
    });
  });

  describe('User Blocking', () => {
    it('should set isActive to false when limit reached', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(3);

      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      expect(userRepository.update).toHaveBeenCalledWith('demo-user-id-123', {
        isActive: false,
      });
    });

    it('should only update user once per request', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(3);

      try {
        await guard.canActivate(context);
      } catch {
        // Expected
      }

      expect(userRepository.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit of 0 (immediate block)', async () => {
      const user = createMockDemoUser(0);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(0);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle limit of 1', async () => {
      const user = createMockDemoUser(1);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(0);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block when limit is 1 and has 1 ETP', async () => {
      const user = createMockDemoUser(1);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(1);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Error Response Format', () => {
    it('should include etpCount in error response', async () => {
      const user = createMockDemoUser(3);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(5);

      try {
        await guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse();
        expect((response as { etpCount: number }).etpCount).toBe(5);
      }
    });

    it('should include limit in error response', async () => {
      const user = createMockDemoUser(10);
      const context = createMockExecutionContext(user);
      mockEtpRepository.count.mockResolvedValue(10);

      try {
        await guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (error) {
        const response = (error as ForbiddenException).getResponse();
        expect((response as { limit: number }).limit).toBe(10);
      }
    });
  });
});
