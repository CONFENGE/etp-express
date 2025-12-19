import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard';
import { AuditService } from '../../modules/audit/audit.service';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let auditService: AuditService;

  const mockAuditService = {
    logTenantBlocked: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
    reflector = module.get<Reflector>(Reflector);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    isPublic: boolean,
    user: Partial<User> | null,
  ): ExecutionContext => {
    mockReflector.getAllAndOverride.mockReturnValue(isPublic);

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'test-agent',
          },
          url: '/test-route',
          method: 'GET',
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockUser = (
    organizationActive: boolean,
  ): Partial<User> & { organization: Organization } => ({
    id: 'user-id-123',
    email: 'test@example.com',
    organization: {
      id: 'org-id-456',
      name: 'Test Organization',
      isActive: organizationActive,
    } as Organization,
  });

  describe('Public Routes', () => {
    it('should allow access to public routes', async () => {
      const context = createMockExecutionContext(true, null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(auditService.logTenantBlocked).not.toHaveBeenCalled();
    });
  });

  describe('No User (Unauthenticated)', () => {
    it('should allow access when no user is present (let JwtAuthGuard handle)', async () => {
      const context = createMockExecutionContext(false, null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(auditService.logTenantBlocked).not.toHaveBeenCalled();
    });
  });

  describe('Active Organization', () => {
    it('should allow access when organization is active', async () => {
      const user = createMockUser(true);
      const context = createMockExecutionContext(false, user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(auditService.logTenantBlocked).not.toHaveBeenCalled();
    });
  });

  describe('Suspended Organization (Kill Switch)', () => {
    it('should block access when organization is suspended', async () => {
      const user = createMockUser(false);
      const context = createMockExecutionContext(false, user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied: Your organization has been suspended. Contact support.',
      );

      expect(auditService.logTenantBlocked).toHaveBeenCalledWith(
        'user-id-123',
        {
          organizationId: 'org-id-456',
          organizationName: 'Test Organization',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          route: '/test-route',
          method: 'GET',
        },
      );
    });

    it('should log blocked access attempt with correct metadata', async () => {
      const user = createMockUser(false);
      const context = createMockExecutionContext(false, user);

      try {
        await guard.canActivate(context);
      } catch (error) {
        // Expected to throw
      }

      expect(mockAuditService.logTenantBlocked).toHaveBeenCalledTimes(1);
      expect(mockAuditService.logTenantBlocked).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          organizationId: 'org-id-456',
          organizationName: 'Test Organization',
          route: '/test-route',
          method: 'GET',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw ForbiddenException when user has no organization', async () => {
      const user = {
        id: 'user-id-123',
        email: 'test@example.com',
        organization: null,
      } as unknown as User;
      const context = createMockExecutionContext(false, user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Access denied: Organization information unavailable',
      );
    });

    it('should not log audit when organization is missing', async () => {
      const user = {
        id: 'user-id-123',
        email: 'test@example.com',
        organization: null,
      } as unknown as User;
      const context = createMockExecutionContext(false, user);

      try {
        await guard.canActivate(context);
      } catch (error) {
        // Expected to throw
      }

      expect(auditService.logTenantBlocked).not.toHaveBeenCalled();
    });
  });
});
