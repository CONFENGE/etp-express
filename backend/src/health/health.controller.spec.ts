import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let openaiService: OpenAIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            getCircuitState: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
    openaiService = module.get<OpenAIService>(OpenAIService);
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
});
