import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PrometheusMetricsService } from './prometheus-metrics.service';

describe('PrometheusMetricsService', () => {
  let service: PrometheusMetricsService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrometheusMetricsService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrometheusMetricsService>(PrometheusMetricsService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a registry', () => {
      expect(service.getRegistry()).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus-formatted metrics', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });

    it('should include default Node.js metrics', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_');
      expect(metrics).toContain('process_cpu');
    });

    it('should include custom database metrics', async () => {
      // Arrange
      jest
        .spyOn(dataSource, 'query')
        .mockResolvedValueOnce([{ active: '5' }])
        .mockResolvedValueOnce([{ total: '10' }]);

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_database_connections_active');
      expect(metrics).toContain('etp_express_database_connections_max');
    });

    it('should include memory metrics', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_memory_heap_used_bytes');
      expect(metrics).toContain('etp_express_memory_rss_bytes');
    });

    it('should include uptime metric', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_uptime_seconds');
    });

    it('should handle database query errors gracefully', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockRejectedValue(new Error('DB error'));

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('etp_express_database_connections_active 0');
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus content type', () => {
      // Act
      const contentType = service.getContentType();

      // Assert
      expect(contentType).toContain('text/plain');
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordHttpRequest('GET', '/api/health', 200, 0.05);
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_http_requests_total');
      expect(metrics).toContain('etp_express_http_request_duration_seconds');
    });

    it('should normalize paths with UUIDs', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordHttpRequest(
        'GET',
        '/api/etps/123e4567-e89b-12d3-a456-426614174000',
        200,
        0.1,
      );
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('path="/api/etps/:id"');
    });

    it('should normalize paths with numeric IDs', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordHttpRequest('GET', '/api/users/12345', 200, 0.1);
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('path="/api/users/:id"');
    });
  });

  describe('incInProgressRequests / decInProgressRequests', () => {
    it('should track in-progress requests', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.incInProgressRequests('GET');
      service.incInProgressRequests('GET');
      service.decInProgressRequests('GET');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_http_requests_in_progress');
    });
  });

  describe('recordError', () => {
    it('should record error metrics', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordError('database', '500');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_errors_total');
    });
  });

  describe('integration', () => {
    it('should handle multiple metric types simultaneously', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordHttpRequest('GET', '/api/health', 200, 0.05);
      service.recordHttpRequest('POST', '/api/etps', 201, 0.15);
      service.recordError('validation', '400');
      service.incInProgressRequests('GET');

      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_http_requests_total');
      expect(metrics).toContain('etp_express_http_request_duration_seconds');
      expect(metrics).toContain('etp_express_errors_total');
      expect(metrics).toContain('etp_express_http_requests_in_progress');
    });

    it('should provide consistent metrics format across calls', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      const metrics1 = await service.getMetrics();
      const metrics2 = await service.getMetrics();

      // Assert
      // Both should have the same structure (same metric names)
      const metricNames1 = metrics1.match(/^etp_express_\w+/gm) || [];
      const metricNames2 = metrics2.match(/^etp_express_\w+/gm) || [];
      expect(metricNames1.length).toBeGreaterThan(0);
      expect(metricNames1).toEqual(metricNames2);
    });
  });
});
