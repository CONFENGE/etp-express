import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status with ok status', () => {
      const result = service.getHealth();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('message', 'ETP Express Backend is running');
      expect(result).toHaveProperty('warning');
    });

    it('should return ISO timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('getInfo', () => {
    it('should return system information', () => {
      const result = service.getInfo();
      expect(result).toHaveProperty('name', 'ETP Express');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('disclaimer');
    });

    it('should return array of features', () => {
      const result = service.getInfo();
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);
    });

    it('should return array of disclaimers', () => {
      const result = service.getInfo();
      expect(Array.isArray(result.disclaimer)).toBe(true);
      expect(result.disclaimer.length).toBeGreaterThan(0);
    });
  });
});
