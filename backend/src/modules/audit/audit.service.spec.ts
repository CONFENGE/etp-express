import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditService } from './audit.service';
import {
  SecretAccessLog,
  SecretAccessStatus,
} from '../../entities/secret-access-log.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<SecretAccessLog>>;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(SecretAccessLog),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get(getRepositoryToken(SecretAccessLog));
    auditLogRepository = module.get(getRepositoryToken(AuditLog));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('logSecretAccess', () => {
    it('should log successful secret access', async () => {
      const log = {
        id: 1,
        secretName: 'JWT_SECRET',
        accessedBy: 'AuthService',
        status: SecretAccessStatus.SUCCESS,
        accessedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(log as SecretAccessLog);
      mockRepository.save.mockResolvedValue(log as SecretAccessLog);

      const result = await service.logSecretAccess(
        'JWT_SECRET',
        'AuthService',
        SecretAccessStatus.SUCCESS,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        secretName: 'JWT_SECRET',
        accessedBy: 'AuthService',
        status: SecretAccessStatus.SUCCESS,
        ipAddress: undefined,
        errorMessage: undefined,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(log);
      expect(result).toEqual(log);
    });

    it('should log failed secret access with error message', async () => {
      const log = {
        id: 2,
        secretName: 'INVALID_SECRET',
        accessedBy: 'TestService',
        status: SecretAccessStatus.FAILED,
        errorMessage: 'Secret not found',
        accessedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(log as SecretAccessLog);
      mockRepository.save.mockResolvedValue(log as SecretAccessLog);

      const result = await service.logSecretAccess(
        'INVALID_SECRET',
        'TestService',
        SecretAccessStatus.FAILED,
        undefined,
        'Secret not found',
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        secretName: 'INVALID_SECRET',
        accessedBy: 'TestService',
        status: SecretAccessStatus.FAILED,
        ipAddress: undefined,
        errorMessage: 'Secret not found',
      });
      expect(result.status).toBe(SecretAccessStatus.FAILED);
    });

    it('should log unauthorized access attempts', async () => {
      const log = {
        id: 3,
        secretName: 'DATABASE_PASSWORD',
        accessedBy: 'UnauthorizedService',
        status: SecretAccessStatus.UNAUTHORIZED,
        ipAddress: '192.168.1.100',
        accessedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(log as SecretAccessLog);
      mockRepository.save.mockResolvedValue(log as SecretAccessLog);

      const result = await service.logSecretAccess(
        'DATABASE_PASSWORD',
        'UnauthorizedService',
        SecretAccessStatus.UNAUTHORIZED,
        '192.168.1.100',
      );

      expect(result.status).toBe(SecretAccessStatus.UNAUTHORIZED);
      expect(result.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('getRecentAccess', () => {
    it('should return recent access logs for a secret', async () => {
      const logs = [
        {
          id: 1,
          secretName: 'JWT_SECRET',
          accessedBy: 'AuthService',
          status: SecretAccessStatus.SUCCESS,
          accessedAt: new Date(),
        },
        {
          id: 2,
          secretName: 'JWT_SECRET',
          accessedBy: 'JwtStrategy',
          status: SecretAccessStatus.SUCCESS,
          accessedAt: new Date(),
        },
      ] as SecretAccessLog[];

      mockRepository.find.mockResolvedValue(logs);

      const result = await service.getRecentAccess('JWT_SECRET', 50);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { secretName: 'JWT_SECRET' },
        order: { accessedAt: 'DESC' },
        take: 50,
      });
      expect(result).toHaveLength(2);
    });

    it('should use default limit of 100', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getRecentAccess('OPENAI_API_KEY');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { secretName: 'OPENAI_API_KEY' },
        order: { accessedAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomaly when access count exceeds threshold', async () => {
      mockRepository.count.mockResolvedValue(150);

      const result = await service.detectAnomalies('JWT_SECRET', 100, 60000);

      expect(mockRepository.count).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should not detect anomaly when access count is below threshold', async () => {
      mockRepository.count.mockResolvedValue(50);

      const result = await service.detectAnomalies('JWT_SECRET', 100, 60000);

      expect(result).toBe(false);
    });

    it('should use default threshold of 100 and window of 60 seconds', async () => {
      mockRepository.count.mockResolvedValue(99);

      const result = await service.detectAnomalies('OPENAI_API_KEY');

      expect(result).toBe(false);
    });
  });

  describe('getAnomalyStatus', () => {
    it('should return complete anomaly status object', async () => {
      mockRepository.count.mockResolvedValue(120);

      const result = await service.getAnomalyStatus('JWT_SECRET', 100, 60000);

      expect(result).toEqual({
        secretName: 'JWT_SECRET',
        anomalous: true,
        accessCount: 120,
        threshold: 100,
        windowSeconds: 60,
      });
    });

    it('should return non-anomalous status for low access counts', async () => {
      mockRepository.count.mockResolvedValue(10);

      const result = await service.getAnomalyStatus('EXA_API_KEY');

      expect(result.anomalous).toBe(false);
      expect(result.accessCount).toBe(10);
    });
  });

  describe('getAccessStats', () => {
    it('should return aggregated statistics', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        clone: jest.fn(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      queryBuilder.clone.mockReturnValue(queryBuilder);
      queryBuilder.getCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // success
        .mockResolvedValueOnce(8) // failed
        .mockResolvedValueOnce(2); // unauthorized
      queryBuilder.getRawOne.mockResolvedValue({ count: '5' });

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getAccessStats();

      expect(result).toEqual({
        totalAccesses: 100,
        successCount: 90,
        failedCount: 8,
        unauthorizedCount: 2,
        uniqueSecrets: 5,
      });
    });

    it('should filter stats by secret name', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        clone: jest.fn(),
      };

      queryBuilder.clone.mockReturnValue(queryBuilder);
      queryBuilder.getCount
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(48)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getAccessStats('JWT_SECRET');

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'log.secretName = :secretName',
        { secretName: 'JWT_SECRET' },
      );
      expect(result.totalAccesses).toBe(50);
      expect(result.uniqueSecrets).toBeUndefined();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      const deleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 500 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(deleteBuilder as any);

      const result = await service.cleanupOldLogs(90);

      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.where).toHaveBeenCalledWith(
        'accessedAt < :cutoffDate',
        expect.any(Object),
      );
      expect(result).toBe(500);
    });

    it('should use default retention of 90 days', async () => {
      const deleteBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(deleteBuilder as any);

      await service.cleanupOldLogs();

      expect(deleteBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('LGPD Operations', () => {
    describe('logDataExport', () => {
      it('should log user data export with metadata', async () => {
        const userId = 'user-123';
        const metadata = {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          format: 'JSON',
          etpsCount: 5,
          sectionsCount: 25,
          versionsCount: 10,
          analyticsCount: 100,
          auditLogsCount: 50,
        };

        const expectedLog = {
          id: 'log-123',
          action: AuditAction.USER_DATA_EXPORT,
          entityType: 'User',
          entityId: userId,
          userId,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent,
          description: 'User requested data export (LGPD Art. 18, II and V)',
          changes: {
            metadata: {
              format: 'JSON',
              recordCount: {
                user: 1,
                etps: 5,
                sections: 25,
                versions: 10,
                analytics: 100,
                auditLogs: 50,
              },
              exportedAt: expect.any(String),
            },
          },
          createdAt: new Date(),
        };

        mockAuditLogRepository.create.mockReturnValue(expectedLog as any);
        mockAuditLogRepository.save.mockResolvedValue(expectedLog as any);

        const result = await service.logDataExport(userId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.USER_DATA_EXPORT,
            entityType: 'User',
            entityId: userId,
            userId,
            ipAddress: metadata.ip,
            userAgent: metadata.userAgent,
          }),
        );
        expect(mockAuditLogRepository.save).toHaveBeenCalled();
        expect(result.action).toBe(AuditAction.USER_DATA_EXPORT);
      });

      it('should use default format JSON if not provided', async () => {
        const userId = 'user-456';
        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logDataExport(userId, {});

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                format: 'JSON',
              }),
            }),
          }),
        );
      });
    });

    describe('logAccountDeletion', () => {
      it('should log soft deletion with scheduled date', async () => {
        const userId = 'user-789';
        const metadata = {
          ip: '10.0.0.1',
          userAgent: 'Chrome',
          confirmation: 'CONFIRMED',
          reason: 'User requested deletion',
          etpsCount: 3,
          sectionsCount: 15,
          versionsCount: 5,
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logAccountDeletion(userId, 'SOFT', metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.ACCOUNT_DELETION_SOFT,
            entityType: 'User',
            entityId: userId,
            userId,
            ipAddress: metadata.ip,
            description: 'Account soft deletion (LGPD Art. 18, VI)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                deletionType: 'SOFT',
                confirmation: 'CONFIRMED',
                reason: 'User requested deletion',
                scheduledFor: expect.any(String),
                cascadeDeleted: {
                  etps: 3,
                  sections: 15,
                  versions: 5,
                },
              }),
            }),
          }),
        );
      });

      it('should log hard deletion without scheduled date', async () => {
        const userId = 'user-999';
        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logAccountDeletion(userId, 'HARD', {});

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.ACCOUNT_DELETION_HARD,
            description: 'Account hard deletion (LGPD Art. 18, VI)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                deletionType: 'HARD',
                scheduledFor: null,
              }),
            }),
          }),
        );
      });
    });

    describe('logDeletionCancelled', () => {
      it('should log deletion cancellation with metadata', async () => {
        const userId = 'user-111';
        const metadata = {
          ip: '172.16.0.1',
          userAgent: 'Safari',
          originalDeletionDate: '2025-01-01T00:00:00.000Z',
          reason: 'Changed mind',
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logDeletionCancelled(userId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.ACCOUNT_DELETION_CANCELLED,
            entityType: 'User',
            entityId: userId,
            userId,
            description: 'Account deletion cancelled by user',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                originalDeletionDate: '2025-01-01T00:00:00.000Z',
                cancelledAt: expect.any(String),
                reason: 'Changed mind',
              }),
            }),
          }),
        );
      });

      it('should use default reason if not provided', async () => {
        const userId = 'user-222';
        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logDeletionCancelled(userId, {});

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                reason: 'User requested cancellation',
              }),
            }),
          }),
        );
      });
    });

    describe('getLGPDOperations', () => {
      it('should retrieve LGPD logs with summary', async () => {
        const mockLogs = [
          {
            id: '1',
            action: AuditAction.USER_DATA_EXPORT,
            createdAt: new Date(),
          },
          {
            id: '2',
            action: AuditAction.ACCOUNT_DELETION_SOFT,
            createdAt: new Date(),
          },
          {
            id: '3',
            action: AuditAction.ACCOUNT_DELETION_CANCELLED,
            createdAt: new Date(),
          },
        ];

        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockLogs),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        const result = await service.getLGPDOperations();

        expect(result.logs).toEqual(mockLogs);
        expect(result.summary).toEqual({
          totalExports: 1,
          totalDeletions: 1,
          totalCancellations: 1,
        });
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        await service.getLGPDOperations({ startDate, endDate });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate,
            endDate,
          },
        );
      });

      it('should filter by action type', async () => {
        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        await service.getLGPDOperations({
          action: AuditAction.USER_DATA_EXPORT,
        });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.action = :action',
          { action: AuditAction.USER_DATA_EXPORT },
        );
      });

      it('should respect limit parameter', async () => {
        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        await service.getLGPDOperations({ limit: 100 });

        expect(queryBuilder.take).toHaveBeenCalledWith(100);
      });
    });

    describe('logLogin', () => {
      it('should log successful login with metadata', async () => {
        const userId = 'user-login-123';
        const metadata = {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          email: 'test@example.com',
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logLogin(userId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.LOGIN,
            entityType: 'User',
            entityId: userId,
            userId,
            ipAddress: metadata.ip,
            userAgent: metadata.userAgent,
            description: 'User login (LGPD Art. 37 - registro das operações)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                email: metadata.email,
                loginAt: expect.any(String),
              }),
            }),
          }),
        );
      });

      it('should log login without optional metadata', async () => {
        const userId = 'user-login-456';
        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logLogin(userId, {});

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.LOGIN,
            entityId: userId,
            ipAddress: undefined,
            userAgent: undefined,
          }),
        );
      });
    });

    describe('logLogout', () => {
      it('should log logout with metadata', async () => {
        const userId = 'user-logout-123';
        const metadata = {
          ip: '10.0.0.1',
          userAgent: 'Chrome/100',
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logLogout(userId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.LOGOUT,
            entityType: 'User',
            entityId: userId,
            userId,
            ipAddress: metadata.ip,
            userAgent: metadata.userAgent,
            description: 'User logout (LGPD Art. 37 - registro das operações)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                logoutAt: expect.any(String),
              }),
            }),
          }),
        );
      });
    });

    describe('logLoginFailed', () => {
      it('should log failed login attempt', async () => {
        const email = 'attacker@example.com';
        const metadata = {
          ip: '1.2.3.4',
          userAgent: 'BotScript',
          reason: 'Invalid credentials',
        };

        // logLoginFailed logs to console (warn) but doesn't save to DB
        // as it doesn't have a userId
        await service.logLoginFailed(email, metadata);

        // Verify it didn't try to save (no userId available)
        expect(mockAuditLogRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('logProfileAccess', () => {
      it('should log profile view access', async () => {
        const userId = 'viewer-123';
        const targetUserId = 'target-456';
        const metadata = {
          ip: '192.168.0.1',
          userAgent: 'Firefox',
          action: 'view' as const,
          fields: ['email', 'name'],
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logProfileAccess(userId, targetUserId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.PROFILE_VIEW,
            entityType: 'User',
            entityId: targetUserId,
            userId,
            description: 'Profile view (LGPD Art. 50 - boas práticas)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                targetUserId,
                fields: ['email', 'name'],
                selfAccess: false,
              }),
            }),
          }),
        );
      });

      it('should log profile update access', async () => {
        const userId = 'user-self-123';
        const metadata = {
          action: 'update' as const,
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logProfileAccess(userId, userId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.PROFILE_UPDATE,
            description: 'Profile update (LGPD Art. 50 - boas práticas)',
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                selfAccess: true,
              }),
            }),
          }),
        );
      });
    });

    describe('logDataAccess', () => {
      it('should log generic data access', async () => {
        const userId = 'data-accessor-123';
        const resource = 'ETP';
        const resourceId = 'etp-456';
        const metadata = {
          ip: '127.0.0.1',
          userAgent: 'Safari',
          operation: 'read',
        };

        mockAuditLogRepository.create.mockReturnValue({} as any);
        mockAuditLogRepository.save.mockResolvedValue({} as any);

        await service.logDataAccess(userId, resource, resourceId, metadata);

        expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            action: AuditAction.DATA_ACCESS,
            entityType: resource,
            entityId: resourceId,
            userId,
            description: `Data access: ${resource} (LGPD Art. 37)`,
            changes: expect.objectContaining({
              metadata: expect.objectContaining({
                resource,
                resourceId,
                operation: 'read',
              }),
            }),
          }),
        );
      });
    });

    describe('getAuthLogs', () => {
      it('should retrieve authentication logs for a user', async () => {
        const userId = 'user-auth-logs';
        const mockLogs = [
          { id: '1', action: AuditAction.LOGIN, createdAt: new Date() },
          { id: '2', action: AuditAction.LOGOUT, createdAt: new Date() },
        ];

        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockLogs),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        const result = await service.getAuthLogs(userId);

        expect(queryBuilder.where).toHaveBeenCalledWith(
          'log.userId = :userId',
          { userId },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.action IN (:...actions)',
          { actions: [AuditAction.LOGIN, AuditAction.LOGOUT] },
        );
        expect(result).toEqual(mockLogs);
      });

      it('should filter auth logs by date range', async () => {
        const userId = 'user-date-filter';
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        const queryBuilder = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        await service.getAuthLogs(userId, { startDate, endDate });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.createdAt >= :startDate',
          { startDate },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.createdAt <= :endDate',
          { endDate },
        );
      });
    });

    describe('exportAuditLogs', () => {
      it('should export audit logs with filters', async () => {
        const mockLogs = [
          {
            id: 'log-1',
            action: AuditAction.LOGIN,
            entityType: 'User',
            entityId: 'user-1',
            createdAt: new Date(),
          },
        ];

        const queryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockLogs),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const userId = 'target-user';
        const action = AuditAction.LOGIN;

        const result = await service.exportAuditLogs({
          startDate,
          endDate,
          userId,
          action,
          limit: 5000,
        });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.createdAt >= :startDate',
          { startDate },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.createdAt <= :endDate',
          { endDate },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.userId = :userId',
          { userId },
        );
        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'log.action = :action',
          { action },
        );
        expect(queryBuilder.take).toHaveBeenCalledWith(5000);
        expect(result.logs).toEqual(mockLogs);
        expect(result.metadata.totalRecords).toBe(1);
        expect(result.metadata.filters.userId).toBe(userId);
      });

      it('should export all logs without filters', async () => {
        const mockLogs = [
          { id: 'log-1', action: AuditAction.LOGIN, createdAt: new Date() },
          { id: 'log-2', action: AuditAction.LOGOUT, createdAt: new Date() },
        ];

        const queryBuilder = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockLogs),
        };

        mockAuditLogRepository.createQueryBuilder.mockReturnValue(
          queryBuilder as any,
        );

        const result = await service.exportAuditLogs({});

        expect(queryBuilder.take).toHaveBeenCalledWith(10000);
        expect(result.logs).toEqual(mockLogs);
        expect(result.metadata.totalRecords).toBe(2);
      });
    });

    describe('formatLogsForCsv', () => {
      it('should format audit logs for CSV export', () => {
        const mockUser = {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        };
        const mockEtp = {
          id: 'etp-1',
          title: 'Test ETP',
        };
        const mockLogs = [
          {
            id: 'log-1',
            action: AuditAction.CREATE,
            entityType: 'ETP',
            entityId: 'etp-1',
            userId: 'user-1',
            user: mockUser,
            etp: mockEtp,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            description: 'Created ETP',
            createdAt: new Date('2024-06-15T10:30:00.000Z'),
            etpId: 'etp-1',
          },
        ] as unknown as AuditLog[];

        const result = service.formatLogsForCsv(mockLogs);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 'log-1',
          action: 'create',
          entityType: 'ETP',
          entityId: 'etp-1',
          userId: 'user-1',
          userEmail: 'test@example.com',
          userName: 'Test User',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          description: 'Created ETP',
          createdAt: '2024-06-15T10:30:00.000Z',
          etpId: 'etp-1',
          etpTitle: 'Test ETP',
        });
      });

      it('should handle missing optional fields', () => {
        const mockLogs = [
          {
            id: 'log-2',
            action: AuditAction.LOGIN,
            entityType: 'User',
            entityId: null,
            userId: 'user-2',
            user: null,
            etp: null,
            ipAddress: null,
            userAgent: null,
            description: null,
            createdAt: new Date('2024-06-15T10:30:00.000Z'),
            etpId: null,
          },
        ] as unknown as AuditLog[];

        const result = service.formatLogsForCsv(mockLogs);

        expect(result[0]).toEqual({
          id: 'log-2',
          action: 'login',
          entityType: 'User',
          entityId: '',
          userId: 'user-2',
          userEmail: '',
          userName: '',
          ipAddress: '',
          userAgent: '',
          description: '',
          createdAt: '2024-06-15T10:30:00.000Z',
          etpId: '',
          etpTitle: '',
        });
      });
    });
  });
});
