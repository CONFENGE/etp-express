import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HealthService } from './health.service';
import { User } from '../entities/user.entity';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { ExaService } from '../modules/search/exa/exa.service';

describe('HealthService', () => {
  let service: HealthService;
  let userRepository: Repository<User>;
  let dataSource: DataSource;
  let openaiService: OpenAIService;
  let exaService: ExaService;
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
          provide: ExaService,
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
    exaService = module.get<ExaService>(ExaService);

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
      jest.spyOn(exaService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(exaService.ping).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Running scheduled providers health check...',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'OpenAI health check OK - latency: 100ms',
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Exa health check OK - latency: 200ms',
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
      jest.spyOn(exaService, 'ping').mockResolvedValue({ latency: 200 });
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
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

    it('should log warning when Exa circuit breaker is open', async () => {
      // Arrange
      const exaCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 5, successes: 1, failures: 4 },
      };
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 100 });
      jest.spyOn(exaService, 'ping').mockResolvedValue({ latency: 8000 });
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest
        .spyOn(exaService, 'getCircuitState')
        .mockReturnValue(exaCircuitState as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Exa circuit breaker is OPEN - service degraded',
        { stats: exaCircuitState.stats },
      );
    });

    it('should log error when OpenAI ping fails', async () => {
      // Arrange
      const error = new Error('OpenAI timeout');
      jest.spyOn(openaiService, 'ping').mockRejectedValue(error);
      jest.spyOn(exaService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
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

    it('should log error when Exa ping fails', async () => {
      // Arrange
      const error = new Error('Exa API key invalid');
      jest.spyOn(openaiService, 'ping').mockResolvedValue({ latency: 100 });
      jest.spyOn(exaService, 'ping').mockRejectedValue(error);
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith('Exa health check failed', {
        error: 'Exa API key invalid',
        stack: error.stack,
      });
    });

    it('should continue checking other providers when one fails', async () => {
      // Arrange
      jest
        .spyOn(openaiService, 'ping')
        .mockRejectedValue(new Error('OpenAI down'));
      jest.spyOn(exaService, 'ping').mockResolvedValue({ latency: 200 });
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);

      // Act
      await service.checkProvidersHealth();

      // Assert
      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(exaService.ping).toHaveBeenCalledTimes(1);
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'Exa health check OK - latency: 200ms',
      );
    });

    it('should handle both providers failing', async () => {
      // Arrange
      const openaiError = new Error('OpenAI down');
      const exaError = new Error('Exa down');
      jest.spyOn(openaiService, 'ping').mockRejectedValue(openaiError);
      jest.spyOn(exaService, 'ping').mockRejectedValue(exaError);

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
        'Exa health check failed',
        expect.objectContaining({
          error: 'Exa down',
        }),
      );
    });
  });

  describe('checkReadiness', () => {
    beforeEach(() => {
      // Default: circuit breakers closed (healthy)
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
    });

    it('should return ready status with all components when fully healthy', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe('ready');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.components).toEqual({
        database: { status: 'healthy' },
        migrations: { status: 'completed' },
        redis: { status: 'not_configured' },
        providers: {
          openai: { status: 'healthy', circuitOpen: false },
          exa: { status: 'healthy', circuitOpen: false },
        },
      });
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
      expect(result.status).toBe('starting');
      expect(result.reason).toBe('migrations_in_progress');
      expect(result.components.database.status).toBe('healthy');
      expect(result.components.migrations.status).toBe('pending');
    });

    it('should return not_ready status when database is disconnected', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('database_disconnected');
      expect(result.components.database.status).toBe('unhealthy');
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

    it('should return degraded status when OpenAI circuit breaker is open', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {},
      } as any);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe('degraded');
      const openaiProvider = result.components.providers.openai as { status: string; circuitOpen: boolean };
      const exaProvider = result.components.providers.exa as { status: string; circuitOpen: boolean };
      expect(openaiProvider.status).toBe('degraded');
      expect(openaiProvider.circuitOpen).toBe(true);
      expect(exaProvider.status).toBe('healthy');
    });

    it('should return degraded status when Exa circuit breaker is open', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {},
      } as any);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe('degraded');
      const exaProvider = result.components.providers.exa as { status: string; circuitOpen: boolean };
      expect(exaProvider.status).toBe('degraded');
      expect(exaProvider.circuitOpen).toBe(true);
    });

    it('should return degraded status when both circuit breakers are open', async () => {
      // Arrange
      jest
        .spyOn(userRepository, 'query')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(dataSource, 'showMigrations').mockResolvedValue(false);
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {},
      } as any);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {},
      } as any);

      // Act
      const result = await service.checkReadiness();

      // Assert
      expect(result.status).toBe('degraded');
      const openaiProvider = result.components.providers.openai as { status: string; circuitOpen: boolean };
      const exaProvider = result.components.providers.exa as { status: string; circuitOpen: boolean };
      expect(openaiProvider.circuitOpen).toBe(true);
      expect(exaProvider.circuitOpen).toBe(true);
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
    beforeEach(() => {
      // Default: circuit breakers closed (healthy)
      jest.spyOn(openaiService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
      jest.spyOn(exaService, 'getCircuitState').mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      } as any);
    });

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
      expect(result2.components.migrations.status).toBe('completed');
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
        expect(result.components.database.status).toBe('healthy');
        expect(result.components.migrations.status).toBe('completed');
      });
      expect(dataSource.showMigrations).toHaveBeenCalledTimes(3);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics with all required fields', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('uptimeFormatted');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('process');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return uptime as a positive number', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory metrics with correct structure', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsedMB');
      expect(result.memory).toHaveProperty('heapTotalMB');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('rssMB');

      // Verify types
      expect(typeof result.memory.heapUsed).toBe('number');
      expect(typeof result.memory.heapTotal).toBe('number');
      expect(typeof result.memory.heapUsedMB).toBe('number');
      expect(typeof result.memory.heapTotalMB).toBe('number');
    });

    it('should return CPU metrics with correct structure', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      expect(result.cpu).toHaveProperty('user');
      expect(result.cpu).toHaveProperty('system');
      expect(result.cpu).toHaveProperty('userMs');
      expect(result.cpu).toHaveProperty('systemMs');

      // Verify types
      expect(typeof result.cpu.user).toBe('number');
      expect(typeof result.cpu.system).toBe('number');
    });

    it('should return process info with correct structure', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      expect(result.process).toHaveProperty('pid');
      expect(result.process).toHaveProperty('nodeVersion');
      expect(result.process).toHaveProperty('platform');
      expect(result.process).toHaveProperty('arch');

      // Verify types
      expect(typeof result.process.pid).toBe('number');
      expect(result.process.nodeVersion).toMatch(/^v\d+/);
    });

    it('should return valid ISO 8601 timestamp', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should return formatted uptime in human-readable format', () => {
      // Act
      const result = service.getSystemMetrics();

      // Assert - should match pattern like "1d 2h 3m 4s" or "2h 3m 4s" or "3m 4s" or "4s"
      expect(result.uptimeFormatted).toMatch(
        /^(\d+d\s)?(\d+h\s)?(\d+m\s)?\d+s$/,
      );
    });

    it('should handle rapid consecutive calls', () => {
      // Act
      const results = [
        service.getSystemMetrics(),
        service.getSystemMetrics(),
        service.getSystemMetrics(),
      ];

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toHaveProperty('uptime');
        expect(result).toHaveProperty('memory');
        expect(result).toHaveProperty('cpu');
      });
    });
  });

  describe('formatUptime (private method)', () => {
    it('should format seconds only', () => {
      // Act
      const result = (service as any).formatUptime(45);

      // Assert
      expect(result).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      // Act
      const result = (service as any).formatUptime(125); // 2m 5s

      // Assert
      expect(result).toBe('2m 5s');
    });

    it('should format hours, minutes and seconds', () => {
      // Act
      const result = (service as any).formatUptime(3725); // 1h 2m 5s

      // Assert
      expect(result).toBe('1h 2m 5s');
    });

    it('should format days, hours, minutes and seconds', () => {
      // Act
      const result = (service as any).formatUptime(90125); // 1d 1h 2m 5s

      // Assert
      expect(result).toBe('1d 1h 2m 5s');
    });

    it('should handle zero uptime', () => {
      // Act
      const result = (service as any).formatUptime(0);

      // Assert
      expect(result).toBe('0s');
    });

    it('should handle large uptime values', () => {
      // Act
      const result = (service as any).formatUptime(864000); // 10 days

      // Assert
      expect(result).toBe('10d 0h 0m 0s');
    });
  });
});
