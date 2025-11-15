import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

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
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
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
});
