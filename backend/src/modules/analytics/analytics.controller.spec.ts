import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'jest-test',
    },
  } as unknown as Request;

  const mockDashboardStats = {
    totalEvents: 150,
    totalUsers: 10,
    totalETPs: 25,
    eventsLastWeek: 45,
    mostActiveUsers: [
      { userId: mockUserId, eventCount: 30 },
    ],
    eventsByType: {
      user_action: 80,
      system_event: 40,
      error: 30,
    },
  };

  const mockUserActivity = {
    userId: mockUserId,
    period: { days: 30, startDate: new Date(), endDate: new Date() },
    totalEvents: 30,
    eventsByType: [
      { name: 'etp_created', count: '15' },
      { name: 'section_generated', count: '10' },
    ],
    recentActivity: [
      {
        id: 'event-1',
        eventType: 'user_action',
        eventName: 'etp_created',
        createdAt: new Date(),
      },
    ],
  };

  const mockEventsList = [
    {
      id: 'event-1',
      eventType: 'user_action',
      eventName: 'etp_created',
      userId: mockUserId,
      timestamp: new Date(),
    },
  ];

  const mockSystemHealth = {
    period: '24h',
    errorRate: '2.50',
    totalEvents: 1000,
    errorEvents: 25,
    recentErrors: [
      {
        id: 'error-1',
        eventType: 'error',
        eventName: 'generation_failed',
        createdAt: new Date(),
      },
    ],
    generation: {
      total: 150,
      successful: 145,
      successRate: '96.67',
    },
  };

  const mockAnalyticsService = {
    trackEvent: jest.fn(),
    getDashboardStats: jest.fn(),
    getUserActivity: jest.fn(),
    getEventsByType: jest.fn(),
    getSystemHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('trackEvent', () => {
    const eventBody = {
      eventType: 'user_action',
      eventName: 'etp_created',
      properties: { status: 'draft' },
      etpId: mockEtpId,
    };

    it('should track an event', async () => {
      // Arrange
      mockAnalyticsService.trackEvent.mockResolvedValue(undefined);

      // Act
      const result = await controller.trackEvent(
        eventBody,
        mockUserId,
        mockRequest,
      );

      // Assert
      expect(service.trackEvent).toHaveBeenCalledWith(
        eventBody.eventType,
        eventBody.eventName,
        eventBody.properties,
        mockUserId,
        eventBody.etpId,
        mockRequest,
      );
      expect(service.trackEvent).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Evento registrado');
    });

    it('should track event without etpId', async () => {
      // Arrange
      const eventWithoutEtp = { ...eventBody, etpId: undefined };
      mockAnalyticsService.trackEvent.mockResolvedValue(undefined);

      // Act
      const result = await controller.trackEvent(
        eventWithoutEtp,
        mockUserId,
        mockRequest,
      );

      // Assert
      expect(service.trackEvent).toHaveBeenCalledWith(
        eventWithoutEtp.eventType,
        eventWithoutEtp.eventName,
        eventWithoutEtp.properties,
        mockUserId,
        undefined,
        mockRequest,
      );
      expect(result.success).toBe(true);
    });

    it('should include request object in trackEvent call', async () => {
      // Arrange
      mockAnalyticsService.trackEvent.mockResolvedValue(undefined);

      // Act
      await controller.trackEvent(eventBody, mockUserId, mockRequest);

      // Assert
      expect(service.trackEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        mockUserId,
        mockEtpId,
        mockRequest,
      );
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      // Arrange
      mockAnalyticsService.getDashboardStats.mockResolvedValue(
        mockDashboardStats,
      );

      // Act
      const result = await controller.getDashboard(30, mockUserId);

      // Assert
      expect(service.getDashboardStats).toHaveBeenCalledWith(mockUserId, 30);
      expect(service.getDashboardStats).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockDashboardStats);
      expect(result.data.totalEvents).toBe(150);
      expect(result.disclaimer).toBeDefined();
    });

    it('should use default days parameter', async () => {
      // Arrange
      mockAnalyticsService.getDashboardStats.mockResolvedValue(
        mockDashboardStats,
      );

      // Act
      await controller.getDashboard(undefined, mockUserId);

      // Assert
      expect(service.getDashboardStats).toHaveBeenCalledWith(mockUserId, 30);
    });

    it('should include disclaimer in dashboard response', async () => {
      // Arrange
      mockAnalyticsService.getDashboardStats.mockResolvedValue(
        mockDashboardStats,
      );

      // Act
      const result = await controller.getDashboard(30, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity', async () => {
      // Arrange
      mockAnalyticsService.getUserActivity.mockResolvedValue(mockUserActivity);

      // Act
      const result = await controller.getUserActivity(30, mockUserId);

      // Assert
      expect(service.getUserActivity).toHaveBeenCalledWith(mockUserId, 30);
      expect(service.getUserActivity).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockUserActivity);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should use default days parameter', async () => {
      // Arrange
      mockAnalyticsService.getUserActivity.mockResolvedValue(mockUserActivity);

      // Act
      await controller.getUserActivity(undefined, mockUserId);

      // Assert
      expect(service.getUserActivity).toHaveBeenCalledWith(mockUserId, 30);
    });

    it('should include recent activity in response', async () => {
      // Arrange
      mockAnalyticsService.getUserActivity.mockResolvedValue(mockUserActivity);

      // Act
      const result = await controller.getUserActivity(30, mockUserId);

      // Assert
      expect(result.data.recentActivity).toBeDefined();
      expect(Array.isArray(result.data.recentActivity)).toBe(true);
    });

    it('should include disclaimer in activity response', async () => {
      // Arrange
      mockAnalyticsService.getUserActivity.mockResolvedValue(mockUserActivity);

      // Act
      const result = await controller.getUserActivity(30, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getEventsByType', () => {
    const eventType = 'user_action';
    const startDate = '2025-01-01';
    const endDate = '2025-01-31';

    it('should return events by type', async () => {
      // Arrange
      mockAnalyticsService.getEventsByType.mockResolvedValue(mockEventsList);

      // Act
      const result = await controller.getEventsByType(
        eventType,
        startDate,
        endDate,
      );

      // Assert
      expect(service.getEventsByType).toHaveBeenCalledWith(
        eventType,
        new Date(startDate),
        new Date(endDate),
      );
      expect(service.getEventsByType).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockEventsList);
      expect(result.disclaimer).toBeDefined();
    });

    it('should work without date filters', async () => {
      // Arrange
      mockAnalyticsService.getEventsByType.mockResolvedValue(mockEventsList);

      // Act
      const result = await controller.getEventsByType(eventType, undefined, undefined);

      // Assert
      expect(service.getEventsByType).toHaveBeenCalledWith(
        eventType,
        undefined,
        undefined,
      );
      expect(result.data).toEqual(mockEventsList);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockAnalyticsService.getEventsByType.mockResolvedValue(mockEventsList);

      // Act
      const result = await controller.getEventsByType(eventType, startDate, endDate);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health metrics', async () => {
      // Arrange
      mockAnalyticsService.getSystemHealth.mockResolvedValue(mockSystemHealth);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(service.getSystemHealth).toHaveBeenCalled();
      expect(service.getSystemHealth).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockSystemHealth);
      expect(result.data.period).toBe('24h');
      expect(result.data.totalEvents).toBe(1000);
      expect(result.disclaimer).toBeDefined();
    });

    it('should include error rate in health', async () => {
      // Arrange
      mockAnalyticsService.getSystemHealth.mockResolvedValue(mockSystemHealth);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.data.errorRate).toBeDefined();
      expect(result.data.errorRate).toBe('2.50');
      expect(result.data.errorEvents).toBe(25);
    });

    it('should include generation metrics in health', async () => {
      // Arrange
      mockAnalyticsService.getSystemHealth.mockResolvedValue(mockSystemHealth);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.data.generation).toBeDefined();
      expect(result.data.generation.total).toBe(150);
      expect(result.data.generation.successful).toBe(145);
      expect(result.data.generation.successRate).toBe('96.67');
    });

    it('should include disclaimer in health response', async () => {
      // Arrange
      mockAnalyticsService.getSystemHealth.mockResolvedValue(mockSystemHealth);

      // Act
      const result = await controller.getSystemHealth();

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });
});
