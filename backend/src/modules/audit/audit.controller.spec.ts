import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, StreamableFile } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { User, UserRole } from '../../entities/user.entity';
import {
  SecretAccessLog,
  SecretAccessStatus,
} from '../../entities/secret-access-log.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { ExportFormat } from './dto/export-audit-logs.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<AuditService>;

  const mockAuditService = {
    getRecentAccess: jest.fn(),
    getAnomalyStatus: jest.fn(),
    getAccessLogs: jest.fn(),
    getAccessStats: jest.fn(),
    exportAuditLogs: jest.fn(),
    formatLogsForCsv: jest.fn(),
    getLGPDOperations: jest.fn(),
  };

  const adminUser = {
    id: 'admin-uuid',
    email: 'admin@test.com',
    name: 'Admin User',
    role: UserRole.ADMIN,
  } as User;

  const regularUser = {
    id: 'user-uuid',
    email: 'user@test.com',
    name: 'Regular User',
    role: UserRole.USER,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('getSecretAccessLogs', () => {
    it('should return logs for admin user', async () => {
      const logs = [
        {
          id: 1,
          secretName: 'JWT_SECRET',
          accessedBy: 'AuthService',
          status: SecretAccessStatus.SUCCESS,
          accessedAt: new Date(),
        },
      ] as SecretAccessLog[];

      mockAuditService.getRecentAccess.mockResolvedValue(logs);

      const result = await controller.getSecretAccessLogs(
        adminUser,
        'JWT_SECRET',
        50,
      );

      expect(mockAuditService.getRecentAccess).toHaveBeenCalledWith(
        'JWT_SECRET',
        50,
      );
      expect(result).toEqual(logs);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      await expect(
        controller.getSecretAccessLogs(regularUser, 'JWT_SECRET', 50),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAuditService.getRecentAccess).not.toHaveBeenCalled();
    });
  });

  describe('checkAnomalies', () => {
    it('should return anomaly status for admin user', async () => {
      const anomalyStatus = {
        secretName: 'JWT_SECRET',
        anomalous: false,
        accessCount: 50,
        threshold: 100,
        windowSeconds: 60,
      };

      mockAuditService.getAnomalyStatus.mockResolvedValue(anomalyStatus);

      const result = await controller.checkAnomalies(
        adminUser,
        'JWT_SECRET',
        100,
        60,
      );

      expect(mockAuditService.getAnomalyStatus).toHaveBeenCalledWith(
        'JWT_SECRET',
        100,
        60000, // seconds converted to ms
      );
      expect(result).toEqual(anomalyStatus);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      await expect(
        controller.checkAnomalies(regularUser, 'JWT_SECRET', 100, 60),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllAccessLogs', () => {
    it('should return all logs with filters for admin user', async () => {
      const result = {
        logs: [
          {
            id: 1,
            secretName: 'JWT_SECRET',
            accessedBy: 'AuthService',
            status: SecretAccessStatus.SUCCESS,
            accessedAt: new Date(),
          },
        ] as SecretAccessLog[],
        total: 1,
      };

      mockAuditService.getAccessLogs.mockResolvedValue(result);

      const response = await controller.getAllAccessLogs(
        adminUser,
        'JWT_SECRET',
        SecretAccessStatus.SUCCESS,
        50,
        0,
      );

      expect(mockAuditService.getAccessLogs).toHaveBeenCalledWith({
        secretName: 'JWT_SECRET',
        status: SecretAccessStatus.SUCCESS,
        limit: 50,
        offset: 0,
      });
      expect(response).toEqual(result);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      await expect(controller.getAllAccessLogs(regularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAccessStats', () => {
    it('should return stats for admin user', async () => {
      const stats = {
        totalAccesses: 100,
        successCount: 95,
        failedCount: 5,
        unauthorizedCount: 0,
        uniqueSecrets: 5,
      };

      mockAuditService.getAccessStats.mockResolvedValue(stats);

      const result = await controller.getAccessStats(adminUser);

      expect(mockAuditService.getAccessStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(stats);
    });

    it('should filter stats by secret name', async () => {
      const stats = {
        totalAccesses: 50,
        successCount: 48,
        failedCount: 2,
        unauthorizedCount: 0,
      };

      mockAuditService.getAccessStats.mockResolvedValue(stats);

      const result = await controller.getAccessStats(adminUser, 'JWT_SECRET');

      expect(mockAuditService.getAccessStats).toHaveBeenCalledWith(
        'JWT_SECRET',
      );
      expect(result).toEqual(stats);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      await expect(controller.getAccessStats(regularUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('exportAuditLogs', () => {
    const mockResponse = {
      set: jest.fn(),
    } as unknown as import('express').Response;

    const mockAuditLogs = [
      {
        id: 'log-1',
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: 'user-1',
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        description: 'User login',
        createdAt: new Date('2024-01-01'),
        changes: {},
        user: adminUser,
        etp: null,
        etpId: null,
      },
    ] as unknown as AuditLog[];

    const mockExportResult = {
      logs: mockAuditLogs,
      metadata: {
        totalRecords: 1,
        exportedAt: new Date().toISOString(),
        filters: {},
      },
    };

    const mockCsvData = [
      {
        id: 'log-1',
        action: 'login',
        entityType: 'User',
        entityId: 'user-1',
        userId: 'user-1',
        userEmail: 'admin@test.com',
        userName: 'Admin User',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        description: 'User login',
        createdAt: '2024-01-01T00:00:00.000Z',
        etpId: '',
        etpTitle: '',
      },
    ];

    beforeEach(() => {
      mockAuditService.exportAuditLogs.mockResolvedValue(mockExportResult);
      mockAuditService.formatLogsForCsv.mockReturnValue(mockCsvData);
    });

    it('should export logs as JSON for admin user', async () => {
      const query = {
        format: ExportFormat.JSON,
        limit: 10000,
      };

      const result = await controller.exportAuditLogs(
        adminUser,
        query,
        mockResponse,
      );

      expect(mockAuditService.exportAuditLogs).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        userId: undefined,
        action: undefined,
        limit: 10000,
      });
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/json; charset=utf-8',
        }),
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should export logs as CSV for admin user', async () => {
      const query = {
        format: ExportFormat.CSV,
        limit: 10000,
      };

      const result = await controller.exportAuditLogs(
        adminUser,
        query,
        mockResponse,
      );

      expect(mockAuditService.formatLogsForCsv).toHaveBeenCalledWith(
        mockAuditLogs,
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'text/csv; charset=utf-8',
        }),
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should apply date filters', async () => {
      const query = {
        format: ExportFormat.JSON,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        limit: 10000,
      };

      await controller.exportAuditLogs(adminUser, query, mockResponse);

      expect(mockAuditService.exportAuditLogs).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        userId: undefined,
        action: undefined,
        limit: 10000,
      });
    });

    it('should apply userId and action filters', async () => {
      const query = {
        format: ExportFormat.JSON,
        userId: 'target-user-id',
        action: AuditAction.LOGIN,
        limit: 5000,
      };

      await controller.exportAuditLogs(adminUser, query, mockResponse);

      expect(mockAuditService.exportAuditLogs).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        userId: 'target-user-id',
        action: AuditAction.LOGIN,
        limit: 5000,
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      const query = {
        format: ExportFormat.JSON,
        limit: 10000,
      };

      await expect(
        controller.exportAuditLogs(regularUser, query, mockResponse),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAuditService.exportAuditLogs).not.toHaveBeenCalled();
    });
  });
});
