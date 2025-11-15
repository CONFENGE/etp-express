import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthService } from './health.service';
import { User } from '../entities/user.entity';

describe('HealthService', () => {
  let service: HealthService;
  let userRepository: Repository<User>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Spy on logger to verify error logging
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      jest.spyOn(userRepository, 'query').mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await service.check();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        database: 'connected',
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      jest.spyOn(userRepository, 'query').mockRejectedValue(dbError);

      // Act
      const result = await service.check();

      // Assert
      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        database: 'disconnected',
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Health check failed: Database not connected',
      );
    });

    it('should return valid ISO 8601 timestamp', async () => {
      // Arrange
      jest.spyOn(userRepository, 'query').mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await service.check();

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should call checkDatabase method', async () => {
      // Arrange
      const checkDatabaseSpy = jest
        .spyOn(service as any, 'checkDatabase')
        .mockResolvedValue(true);

      // Act
      await service.check();

      // Assert
      expect(checkDatabaseSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkDatabase (private method)', () => {
    it('should return true when database query succeeds', async () => {
      // Arrange
      jest.spyOn(userRepository, 'query').mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await (service as any).checkDatabase();

      // Assert
      expect(result).toBe(true);
      expect(userRepository.query).toHaveBeenCalledWith('SELECT 1');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should return false when database query fails', async () => {
      // Arrange
      const dbError = new Error('ECONNREFUSED');
      jest.spyOn(userRepository, 'query').mockRejectedValue(dbError);

      // Act
      const result = await (service as any).checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(userRepository.query).toHaveBeenCalledWith('SELECT 1');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Database connectivity check failed',
        dbError,
      );
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout');
      jest.spyOn(userRepository, 'query').mockRejectedValue(timeoutError);

      // Act
      const result = await (service as any).checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Database connectivity check failed',
        timeoutError,
      );
    });

    it('should handle PostgreSQL connection errors', async () => {
      // Arrange
      const pgError = new Error('password authentication failed');
      jest.spyOn(userRepository, 'query').mockRejectedValue(pgError);

      // Act
      const result = await (service as any).checkDatabase();

      // Assert
      expect(result).toBe(false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Database connectivity check failed',
        pgError,
      );
    });
  });

  describe('error logging behavior', () => {
    it('should only log errors when health check fails', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockRejectedValueOnce(new Error('DB down'));

      // Act - First call (healthy)
      await service.check();
      expect(loggerErrorSpy).not.toHaveBeenCalled();

      // Act - Second call (unhealthy)
      await service.check();
      expect(loggerErrorSpy).toHaveBeenCalledTimes(2); // Once in check(), once in checkDatabase()
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid consecutive health checks', async () => {
      // Arrange
      jest.spyOn(userRepository, 'query').mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const results = await Promise.all([
        service.check(),
        service.check(),
        service.check(),
      ]);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.status).toBe('healthy');
        expect(result.database).toBe('connected');
      });
      expect(userRepository.query).toHaveBeenCalledTimes(3);
    });

    it('should handle database recovery (unhealthy -> healthy)', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockRejectedValueOnce(new Error('DB down'))
        .mockResolvedValueOnce([{ '?column?': 1 }]);

      // Act - First check (unhealthy)
      const result1 = await service.check();
      expect(result1.status).toBe('unhealthy');

      // Act - Second check (recovered)
      const result2 = await service.check();
      expect(result2.status).toBe('healthy');

      // Assert
      expect(userRepository.query).toHaveBeenCalledTimes(2);
    });
  });
});
