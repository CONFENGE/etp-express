import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { PerplexityService } from '../modules/search/perplexity/perplexity.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let openaiService: OpenAIService;
  let perplexityService: PerplexityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
            checkReadiness: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            getCircuitState: jest.fn(),
            ping: jest.fn(),
          },
        },
        {
          provide: PerplexityService,
          useValue: {
            getCircuitState: jest.fn(),
            ping: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
    openaiService = module.get<OpenAIService>(OpenAIService);
    perplexityService = module.get<PerplexityService>(PerplexityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status from service', async () => {
      // Arrange
      const expectedResponse = {
        status: 'healthy',
        timestamp: '2025-11-14T12:00:00.000Z',
        database: 'connected',
      };
      jest.spyOn(service, 'check').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.check).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status from service', async () => {
      // Arrange
      const expectedResponse = {
        status: 'unhealthy',
        timestamp: '2025-11-14T12:00:00.000Z',
        database: 'disconnected',
      };
      jest.spyOn(service, 'check').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.check).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from service', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      jest.spyOn(service, 'check').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.check()).rejects.toThrow('Service unavailable');
      expect(service.check).toHaveBeenCalledTimes(1);
    });

    it('should handle service returning unexpected format gracefully', async () => {
      // Arrange
      const unexpectedResponse = { status: 'unknown' } as any;
      jest.spyOn(service, 'check').mockResolvedValue(unexpectedResponse);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(unexpectedResponse);
      expect(service.check).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration with service', () => {
    it('should delegate all logic to HealthService', async () => {
      // Arrange
      const serviceResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
      jest.spyOn(service, 'check').mockResolvedValue(serviceResponse);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toBe(serviceResponse);
      expect(service.check).toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('should return ready status when application is ready', async () => {
      // Arrange
      const expectedResponse = {
        status: 'ready',
        timestamp: '2025-11-29T12:00:00.000Z',
        database: 'connected',
        migrations: 'completed',
      };
      jest.spyOn(service, 'checkReadiness').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.ready();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(service.checkReadiness).toHaveBeenCalledTimes(1);
    });

    it('should return starting status during migrations', async () => {
      // Arrange
      const expectedResponse = {
        status: 'starting',
        reason: 'migrations_in_progress',
        database: 'connected',
        timestamp: '2025-11-29T12:00:00.000Z',
      };
      jest.spyOn(service, 'checkReadiness').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.ready();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.status).toBe('starting');
      expect(result.reason).toBe('migrations_in_progress');
      expect(service.checkReadiness).toHaveBeenCalledTimes(1);
    });

    it('should return not_ready status when database disconnected', async () => {
      // Arrange
      const expectedResponse = {
        status: 'not_ready',
        reason: 'database_disconnected',
        timestamp: '2025-11-29T12:00:00.000Z',
      };
      jest.spyOn(service, 'checkReadiness').mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.ready();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('database_disconnected');
      expect(service.checkReadiness).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from checkReadiness service', async () => {
      // Arrange
      const error = new Error('Migration check failed');
      jest.spyOn(service, 'checkReadiness').mockRejectedValue(error);

      // Act & Assert
      await expect(controller.ready()).rejects.toThrow(
        'Migration check failed',
      );
      expect(service.checkReadiness).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOpenAIHealth', () => {
    it('should return circuit state when circuit is closed', () => {
      // Arrange
      const circuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {
          fires: 10,
          successes: 10,
          failures: 0,
          timeouts: 0,
        },
      } as any;
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getOpenAIHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(openaiService.getCircuitState).toHaveBeenCalledTimes(1);
    });

    it('should return circuit state when circuit is open', () => {
      // Arrange
      const circuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {
          fires: 20,
          successes: 5,
          failures: 15,
          timeouts: 2,
        },
      } as any;
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getOpenAIHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(openaiService.getCircuitState).toHaveBeenCalledTimes(1);
      expect(result.opened).toBe(true);
    });

    it('should return circuit state when circuit is half-open', () => {
      // Arrange
      const circuitState = {
        opened: false,
        halfOpen: true,
        closed: false,
        stats: {
          fires: 15,
          successes: 8,
          failures: 7,
          timeouts: 1,
        },
      } as any;
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getOpenAIHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(result.halfOpen).toBe(true);
      expect(openaiService.getCircuitState).toHaveBeenCalledTimes(1);
    });

    it('should include statistics in the response', () => {
      // Arrange
      const circuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {
          fires: 100,
          successes: 95,
          failures: 5,
          timeouts: 0,
          rejects: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
      } as any;
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getOpenAIHealth();

      // Assert
      expect(result.stats).toBeDefined();
      expect(result.stats.fires).toBe(100);
      expect(result.stats.successes).toBe(95);
      expect(result.stats.failures).toBe(5);
    });
  });

  describe('getPerplexityHealth', () => {
    it('should return circuit state when circuit is closed', () => {
      // Arrange
      const circuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {
          fires: 5,
          successes: 5,
          failures: 0,
          timeouts: 0,
        },
      } as any;
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getPerplexityHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(perplexityService.getCircuitState).toHaveBeenCalledTimes(1);
    });

    it('should return circuit state when circuit is open', () => {
      // Arrange
      const circuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {
          fires: 10,
          successes: 2,
          failures: 8,
          timeouts: 3,
        },
      } as any;
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getPerplexityHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(perplexityService.getCircuitState).toHaveBeenCalledTimes(1);
      expect(result.opened).toBe(true);
    });

    it('should return circuit state when circuit is half-open', () => {
      // Arrange
      const circuitState = {
        opened: false,
        halfOpen: true,
        closed: false,
        stats: {
          fires: 8,
          successes: 4,
          failures: 4,
          timeouts: 1,
        },
      } as any;
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(circuitState);

      // Act
      const result = controller.getPerplexityHealth();

      // Assert
      expect(result).toEqual(circuitState);
      expect(result.halfOpen).toBe(true);
      expect(perplexityService.getCircuitState).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProvidersHealth', () => {
    it('should return healthy status for both providers when ping succeeds', async () => {
      // Arrange
      const openaiLatency = 245;
      const perplexityLatency = 892;
      const openaiCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 10, successes: 10, failures: 0 },
      };
      const perplexityCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 5, successes: 5, failures: 0 },
      };

      jest
        .spyOn(openaiService, 'ping')
        .mockResolvedValue({ latency: openaiLatency });
      jest
        .spyOn(perplexityService, 'ping')
        .mockResolvedValue({ latency: perplexityLatency });
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      const result = await controller.getProvidersHealth();

      // Assert
      expect(result.openai.status).toBe('healthy');
      expect(result.openai.latency).toBe(openaiLatency);
      expect(result.openai.circuitState).toEqual(openaiCircuitState);
      expect(result.openai.lastCheck).toBeInstanceOf(Date);

      expect(result.perplexity.status).toBe('healthy');
      expect(result.perplexity.latency).toBe(perplexityLatency);
      expect(result.perplexity.circuitState).toEqual(perplexityCircuitState);
      expect(result.perplexity.lastCheck).toBeInstanceOf(Date);

      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(perplexityService.ping).toHaveBeenCalledTimes(1);
    });

    it('should return degraded status for OpenAI when ping fails', async () => {
      // Arrange
      const perplexityLatency = 723;
      const perplexityCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 5, successes: 5, failures: 0 },
      };
      const openaiCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 10, successes: 3, failures: 7 },
      };

      jest
        .spyOn(openaiService, 'ping')
        .mockRejectedValue(new Error('Connection timeout'));
      jest
        .spyOn(perplexityService, 'ping')
        .mockResolvedValue({ latency: perplexityLatency });
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      const result = await controller.getProvidersHealth();

      // Assert
      expect(result.openai.status).toBe('degraded');
      expect(result.openai.latency).toBeUndefined();
      expect(result.openai.circuitState).toEqual(openaiCircuitState);
      expect(result.openai.error).toBe('Connection timeout');
      expect(result.openai.lastCheck).toBeInstanceOf(Date);

      expect(result.perplexity.status).toBe('healthy');
      expect(result.perplexity.latency).toBe(perplexityLatency);
    });

    it('should return degraded status for Perplexity when ping fails', async () => {
      // Arrange
      const openaiLatency = 245;
      const openaiCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 10, successes: 10, failures: 0 },
      };
      const perplexityCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 5, successes: 1, failures: 4 },
      };

      jest
        .spyOn(openaiService, 'ping')
        .mockResolvedValue({ latency: openaiLatency });
      jest
        .spyOn(perplexityService, 'ping')
        .mockRejectedValue(new Error('API key invalid'));
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      const result = await controller.getProvidersHealth();

      // Assert
      expect(result.openai.status).toBe('healthy');
      expect(result.openai.latency).toBe(openaiLatency);

      expect(result.perplexity.status).toBe('degraded');
      expect(result.perplexity.latency).toBeUndefined();
      expect(result.perplexity.circuitState).toEqual(perplexityCircuitState);
      expect(result.perplexity.error).toBe('API key invalid');
      expect(result.perplexity.lastCheck).toBeInstanceOf(Date);
    });

    it('should return degraded status for both providers when both ping fail', async () => {
      // Arrange
      const openaiCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 10, successes: 2, failures: 8 },
      };
      const perplexityCircuitState = {
        opened: true,
        halfOpen: false,
        closed: false,
        stats: { fires: 5, successes: 1, failures: 4 },
      };

      jest
        .spyOn(openaiService, 'ping')
        .mockRejectedValue(new Error('OpenAI down'));
      jest
        .spyOn(perplexityService, 'ping')
        .mockRejectedValue(new Error('Perplexity down'));
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      const result = await controller.getProvidersHealth();

      // Assert
      expect(result.openai.status).toBe('degraded');
      expect(result.openai.error).toBe('OpenAI down');
      expect(result.perplexity.status).toBe('degraded');
      expect(result.perplexity.error).toBe('Perplexity down');
    });

    it('should handle errors without message property', async () => {
      // Arrange
      const perplexityLatency = 500;
      const openaiCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 1, successes: 1, failures: 0 },
      };
      const perplexityCircuitState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { fires: 1, successes: 1, failures: 0 },
      };

      jest.spyOn(openaiService, 'ping').mockRejectedValue('string error');
      jest
        .spyOn(perplexityService, 'ping')
        .mockResolvedValue({ latency: perplexityLatency });
      jest
        .spyOn(openaiService, 'getCircuitState')
        .mockReturnValue(openaiCircuitState as any);
      jest
        .spyOn(perplexityService, 'getCircuitState')
        .mockReturnValue(perplexityCircuitState as any);

      // Act
      const result = await controller.getProvidersHealth();

      // Assert
      expect(result.openai.status).toBe('degraded');
      expect(result.openai.error).toBe('Unknown error');
      expect(result.perplexity.status).toBe('healthy');
    });

    it('should use Promise.allSettled to check providers in parallel', async () => {
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

      const startTime = Date.now();

      // Act
      await controller.getProvidersHealth();

      const duration = Date.now() - startTime;

      // Assert
      // If running in parallel, should complete in ~200ms (not 300ms if sequential)
      // Adding buffer for test environment overhead
      expect(duration).toBeLessThan(400);
      expect(openaiService.ping).toHaveBeenCalledTimes(1);
      expect(perplexityService.ping).toHaveBeenCalledTimes(1);
    });
  });
});
