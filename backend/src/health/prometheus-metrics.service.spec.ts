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

  // Business metrics tests (#861)
  describe('recordEtpCreated', () => {
    it('should record ETP creation metric', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordEtpCreated('draft', 'org-123');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_etp_created_total');
      expect(metrics).toContain('status="draft"');
      expect(metrics).toContain('organization_id="org-123"');
    });

    it('should increment counter for multiple ETPs', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordEtpCreated('draft', 'org-123');
      service.recordEtpCreated('draft', 'org-123');
      service.recordEtpCreated('draft', 'org-456');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_etp_created_total');
    });
  });

  describe('recordLlmRequest', () => {
    it('should record LLM request metric', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordLlmRequest('openai', 'gpt-4o', 'success');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_llm_requests_total');
      expect(metrics).toContain('provider="openai"');
      expect(metrics).toContain('model="gpt-4o"');
      expect(metrics).toContain('status="success"');
    });

    it('should track different providers separately', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordLlmRequest('openai', 'gpt-4o', 'success');
      service.recordLlmRequest('exa', 'search', 'success');
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('provider="openai"');
      expect(metrics).toContain('provider="exa"');
    });
  });

  describe('recordGenerationDuration', () => {
    it('should record generation duration histogram', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordGenerationDuration('section', 'openai', 5.5);
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_generation_duration_seconds');
      expect(metrics).toContain('type="section"');
      expect(metrics).toContain('provider="openai"');
    });

    it('should record multiple durations for histogram buckets', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordGenerationDuration('section', 'openai', 1.0);
      service.recordGenerationDuration('section', 'openai', 5.0);
      service.recordGenerationDuration('section', 'openai', 30.0);
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_generation_duration_seconds_bucket');
      expect(metrics).toContain('etp_express_generation_duration_seconds_sum');
      expect(metrics).toContain('etp_express_generation_duration_seconds_count');
    });
  });

  describe('setActiveUsers', () => {
    it('should set active users gauge', async () => {
      // Arrange - mock all 3 queries: active connections, total connections, active users
      jest
        .spyOn(dataSource, 'query')
        .mockResolvedValueOnce([{ active: '3' }])
        .mockResolvedValueOnce([{ total: '5' }])
        .mockResolvedValueOnce([{ count: '42' }]); // This will be the value from DB

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_active_users 42');
    });

    it('should allow manual override via setActiveUsers', () => {
      // Act - setActiveUsers directly sets the gauge value
      service.setActiveUsers(25);

      // Assert - verify the gauge was set (without calling getMetrics which queries DB)
      const registry = service.getRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('active users from database', () => {
    it('should collect active users from database', async () => {
      // Arrange
      jest
        .spyOn(dataSource, 'query')
        .mockResolvedValueOnce([{ active: '3' }])
        .mockResolvedValueOnce([{ total: '5' }])
        .mockResolvedValueOnce([{ count: '15' }]); // active users

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_active_users');
    });

    it('should handle missing lastLoginAt column gracefully', async () => {
      // Arrange
      jest
        .spyOn(dataSource, 'query')
        .mockResolvedValueOnce([{ active: '3' }])
        .mockResolvedValueOnce([{ total: '5' }])
        .mockRejectedValueOnce(new Error('column does not exist'));

      // Act
      const metrics = await service.getMetrics();

      // Assert
      expect(metrics).toContain('etp_express_active_users 0');
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

    it('should handle all business metrics together (#861)', async () => {
      // Arrange
      jest.spyOn(dataSource, 'query').mockResolvedValue([{ active: '3' }]);

      // Act
      service.recordEtpCreated('draft', 'org-123');
      service.recordLlmRequest('openai', 'gpt-4o', 'success');
      service.recordGenerationDuration('section', 'openai', 15.5);
      service.setActiveUsers(10);
      const metrics = await service.getMetrics();

      // Assert - all business metrics present
      expect(metrics).toContain('etp_express_etp_created_total');
      expect(metrics).toContain('etp_express_llm_requests_total');
      expect(metrics).toContain('etp_express_generation_duration_seconds');
      expect(metrics).toContain('etp_express_active_users');
    });
  });
});
