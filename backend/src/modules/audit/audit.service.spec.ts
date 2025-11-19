import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AuditService } from './audit.service';
import {
  SecretAccessLog,
  SecretAccessStatus,
} from '../../entities/secret-access-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<SecretAccessLog>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get(getRepositoryToken(SecretAccessLog));

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

      const result = await service.getAnomalyStatus('PERPLEXITY_API_KEY');

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
});
