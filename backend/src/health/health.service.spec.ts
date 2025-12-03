import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HealthService } from './health.service';
import { User } from '../entities/user.entity';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { PerplexityService } from '../modules/search/perplexity/perplexity.service';

describe('HealthService', () => {
  let service: HealthService;
  let userRepository: Repository<User>;
  let dataSource: DataSource;
  let openaiService: OpenAIService;
  let perplexityService: PerplexityService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

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
        {
          provide: DataSource,
          useValue: {
            showMigrations: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            ping: jest.fn(),
            getCircuitState: jest.fn(),
          },
        },
        {
          provide: PerplexityService,
          useValue: {
            ping: jest.fn(),
            getCircuitState: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Redis not configured by default
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);
    openaiService = module.get<OpenAIService>(OpenAIService);
    perplexityService = module.get<PerplexityService>(PerplexityService);

    // Spy on logger to verify logging
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await service.check();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        database: 'connected',
        redis: 'connected', // Redis not configured returns true (healthy)
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
        redis: 'connected', // Redis not configured returns true (healthy)
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Health check failed: Database not connected',
      );
    });

    it('should return valid ISO 8601 timestamp', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);

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
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);

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
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);

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

  describe('checkProvidersHealth (cron job)', () => {
    it('should check both providers successfully', async () => {
      // Arrange
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 100 });
      jest.spyOn(perplexityService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest.spyOn(perplexityService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(perplexityService.ping).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Running scheduled providers health check...',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'OpenAI health check OK - latency: 100ms',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Perplexity health check OK - latency: 200ms',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Scheduled providers health check completed',
      );
      expect(loggerWarnSpy).not.toHaveBeenCalled();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log warning when OpenAI circuit breaker is open', async () => {
      // Arrange
      const openaiCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 10, successes: 2, failures: 8 },
      };
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 5000 });
      jest.spyOn(perplexityService, 'ping').mockResolvedValue({ latency: 200 });
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest.spyOn(perplexityService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'OpenAI circuit breaker is OPEN - service degraded',
        { stats: openaiCircuitState.stats },
      );
    });

    it('should log warning when Perplexity circuit breaker is open', async () => {
      // Arrange
      const perplexityCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 5, successes: 1, failures: 4 },
      };
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 100 });
      jest
        .spyOn(perplexityService, 'ping')
        .mockResolvedValue({ latency: 8000 });
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Perplexity circuit breaker is OPEN - service degraded',
        { stats: perplexityCircuitState.stats },
      );
    });

    it('should log error when OpenAI ping fails', async () => {
      // Arrange
      const error = new Error('OpenAI timeout');
      jest.spyOn(openaiService, 'ping').mockRejectedValue(error);
      jest.spyOn(perplexityService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(perplexityService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'OpenAI health check failed',
        {
          error: 'OpenAI timeout',
          stack: error.stack,
        },
      );
    });

    it('should log error when Perplexity ping fails', async () => {
      // Arrange
      const error = new Error('Perplexity API key invalid');
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 100 });
      jest.spyOn(perplexityService, 'ping').mockRejectedValue(error);
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Perplexity health check failed',
        {
          error: 'Perplexity API key invalid',
          stack: error.stack,
        },
      );
    });

    it('should continue checking other providers when one fails', async () => {
      // Arrange
      jest
        .spyOn(openaiService, 'ping')
        .mockRejectedValue(new Error('OpenAI down'));
      jest.spyOn(perplexityService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(perplexityService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(perplexityService.ping).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Perplexity health check OK - latency: 200ms',
      );
    });

    it('should handle both providers failing', async () => {
      // Arrange
      const openaiError = new Error('OpenAI down');
      const perplexityError = new Error('Perplexity down');
      jest.spyOn(openaiService, 'ping').mockRejectedValue(openaiError);
      jest.spyOn(perplexityService, 'ping').mockRejectedValue(perplexityError);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'OpenAI health check failed',
        expect.objectContaining({
          error: 'OpenAI down',
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Perplexity health check failed',
        expect.objectContaining({
          error: 'Perplexity down',
        }),
      );
    });
  });

  describe('checkReadiness', () => {
    it('should return ready status when database connected and no pending migrations', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result).toEqual({
        status: 'ready',
        timestamp: expect.any(String),
        database: 'connected',
        migrations: 'completed',
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return starting status when migrations are in progress', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(true);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result).toEqual({
        status: 'starting',
        reason: 'migrations_in_progress',
        database: 'connected',
        timestamp: expect.any(String),
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return not_ready status when database is disconnected', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result).toEqual({
        status: 'not_ready',
        reason: 'database_disconnected',
        timestamp: expect.any(String),
      });
      expect(dataSource.showMigrations).not.toHaveBeenCalled();
    });

    it('should not check migrations if database is disconnected', async () => {
      // Arrange
      const checkPendingMigrationsSpy = jest.spyOn(
        service as any,
        'checkPendingMigrations',
      );
      jest
        .spyOn(userRepository, 'query')
        .mockRejectedValue(new Error('ECONNREFUSED'));

      // Act
      await service.checkReadiness();

      // Assert
      expect(checkPendingMigrationsSpy).not.toHaveBeenCalled();
    });

    it('should return valid ISO 8601 timestamp in all status types', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);

      // Act
      const result = await service.checkReadiness();

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkPendingMigrations (private method)', () => {
    it('should return true when there are pending migrations', async () => {
      // Arrange
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(true);

      // Act
      const result = await (service as any).checkPendingMigrations();

      // Assert
      expect(result).toBe(true);
      expect(dataSource.showMigrations).toHaveBeenCalledTimes(1);
    });

    it('should return false when there are no pending migrations', async () => {
      // Arrange
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);

      // Act
      const result = await (service as any).checkPendingMigrations();

      // Assert
      expect(result).toBe(false);
      expect(dataSource.showMigrations).toHaveBeenCalledTimes(1);
    });

    it('should return false when showMigrations throws error', async () => {
      // Arrange
      const error = new Error('Migration check failed');
      jest.spyOn(dataSource, 'showMigrations').mockRejectedValue(error);

      // Act
      const result = await (service as any).checkPendingMigrations();

      // Assert
      expect(result).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Could not check migrations status',
        error,
      );
    });

    it('should handle TypeORM errors gracefully', async () => {
      // Arrange
      const typeormError = new Error('QueryRunner already released');
      jest.spyOn(dataSource, 'showMigrations').mockRejectedValue(typeormError);

      // Act
      const result = await (service as any).checkPendingMigrations();

      // Assert
      expect(result).toBe(false);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Could not check migrations status',
        typeormError,
      );
    });
  });

  describe('readiness integration scenarios', () => {
    it('should handle transition from starting to ready', async () => {
      // Arrange - First call: migrations pending
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest
        .spyOn(dataSource, 'showMigrations')
        .mockResolvedValueOnce(true) // First call: migrations pending
        .mockResolvedValueOnce(false); // Second call: migrations completed

      // Act - First check (starting)
      const result1 = await service.checkReadiness();
      expect(result1.status).toBe('starting');

      // Act - Second check (ready)
      const result2 = await service.checkReadiness();
      expect(result2.status).toBe('ready');
      expect(result2.migrations).toBe('completed');
    });

    it('should handle rapid consecutive readiness checks', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);

      // Act
      const results = await Promise.all([
        service.checkReadiness(),
        service.checkReadiness(),
        service.checkReadiness(),
      ]);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.status).toBe('ready');
        expect(result.database).toBe('connected');
        expect(result.migrations).toBe('completed');
      });
      expect(dataSource.showMigrations).toHaveBeenCalledTimes(3);
    });
  });
});
