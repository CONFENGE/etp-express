import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';

/**
 * Unit tests for AnalyticsService
 *
 * Tests all service methods for analytics event tracking and metrics:
 * - trackEvent() - Event registration and logging
 * - getEventsByUser() - User activity queries with multi-tenancy
 * - getEventsByEtp() - ETP-specific events with multi-tenancy
 * - getEventsByType() - Event filtering by type with multi-tenancy
 * - getDashboardStats() - Complex aggregation queries with multi-tenancy
 * - getUserActivity() - User-specific activity tracking with multi-tenancy
 * - getSystemHealth() - System health metrics with multi-tenancy
 *
 * Security Hardening (#648):
 * All query methods now require organizationId for multi-tenancy isolation.
 *
 * Coverage objectives: ≥60% service coverage with proper mocking
 */
describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analyticsRepository: Repository<AnalyticsEvent>;

  // Mock data
  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockEventId = 'event-789';
  const mockOrganizationId = 'org-abc-123';
  const mockOtherOrgId = 'org-xyz-789';

  const mockEvent: AnalyticsEvent = {
    id: mockEventId,
    eventType: 'generation',
    eventName: 'section_generated',
    userId: mockUserId,
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    organization: null as any,
    properties: {
      duration: 2500,
      success: true,
      sectionType: 'JUSTIFICATIVA',
    },
    sessionId: 'session-abc',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    referer: 'https://example.com',
    createdAt: new Date('2025-11-12T10:00:00Z'),
  };

  const mockErrorEvent: AnalyticsEvent = {
    id: 'error-123',
    eventType: 'error',
    eventName: 'generation_failed',
    userId: mockUserId,
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    organization: null as any,
    properties: {
      errorMessage: 'LLM timeout',
    },
    sessionId: 'session-abc',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    referer: '',
    createdAt: new Date('2025-11-12T11:00:00Z'),
  };

  const mockRequest = {
    sessionID: 'session-abc',
    ip: '192.168.1.1',
    get: jest.fn((header: string) => {
      const headers: Record<string, string> = {
        'user-agent': 'Mozilla/5.0',
        referer: 'https://example.com',
      };
      return headers[header.toLowerCase()];
    }),
  } as any;

  /**
   * Mock repository factory with common query builder methods
   */
  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
  });

  const mockAnalyticsRepository = createMockRepository();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: mockAnalyticsRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsRepository = module.get<Repository<AnalyticsEvent>>(
      getRepositoryToken(AnalyticsEvent),
    );

    // Reset mocks before each test
    jest.clearAllMocks();

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Tests for trackEvent()
   * Validates event registration and error handling
   */
  describe('trackEvent', () => {
    it('should track event successfully with all parameters including organizationId', async () => {
      // Arrange
      mockAnalyticsRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsRepository.save.mockResolvedValue(mockEvent);

      // Act
      await service.trackEvent(
        'generation',
        'section_generated',
        { duration: 2500, success: true, sectionType: 'JUSTIFICATIVA' },
        mockUserId,
        mockEtpId,
        mockRequest,
        mockOrganizationId,
      );

      // Assert
      expect(mockAnalyticsRepository.create).toHaveBeenCalledWith({
        eventType: 'generation',
        eventName: 'section_generated',
        properties: {
          duration: 2500,
          success: true,
          sectionType: 'JUSTIFICATIVA',
        },
        userId: mockUserId,
        etpId: mockEtpId,
        organizationId: mockOrganizationId,
        sessionId: 'session-abc',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://example.com',
      });
      expect(mockAnalyticsRepository.save).toHaveBeenCalledWith(mockEvent);
    });

    it('should track event with minimal parameters (no properties, userId, etpId, request, organizationId)', async () => {
      // Arrange
      const minimalEvent = {
        ...mockEvent,
        properties: {},
        userId: undefined,
        etpId: undefined,
        organizationId: null,
        sessionId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        referer: undefined,
      };
      mockAnalyticsRepository.create.mockReturnValue(minimalEvent);
      mockAnalyticsRepository.save.mockResolvedValue(minimalEvent);

      // Act
      await service.trackEvent('navigation', 'page_view');

      // Assert
      expect(mockAnalyticsRepository.create).toHaveBeenCalledWith({
        eventType: 'navigation',
        eventName: 'page_view',
        properties: {},
        userId: undefined,
        etpId: undefined,
        organizationId: null,
        sessionId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        referer: undefined,
      });
      expect(mockAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should use empty object when properties is undefined', async () => {
      // Arrange
      mockAnalyticsRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsRepository.save.mockResolvedValue(mockEvent);

      // Act
      await service.trackEvent('test', 'test_event', undefined);

      // Assert
      expect(mockAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: {},
        }),
      );
    });

    it('should handle save errors gracefully without throwing', async () => {
      // Arrange
      mockAnalyticsRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      await service.trackEvent('error', 'save_failed');

      // Assert - Should not throw
      expect(mockAnalyticsRepository.save).toHaveBeenCalled();
    });

    it('should log error when event tracking fails', async () => {
      // Arrange
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockAnalyticsRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsRepository.save.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      await service.trackEvent('test', 'test_event');

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Error tracking event:',
        expect.any(Error),
      );
    });

    it('should log debug message on successful tracking with organizationId', async () => {
      // Arrange
      const debugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();
      mockAnalyticsRepository.create.mockReturnValue(mockEvent);
      mockAnalyticsRepository.save.mockResolvedValue(mockEvent);

      // Act - Now includes organizationId
      await service.trackEvent(
        'generation',
        'section_generated',
        undefined,
        undefined,
        undefined,
        undefined,
        mockOrganizationId,
      );

      // Assert - Log now includes organization info
      expect(debugSpy).toHaveBeenCalledWith(
        `Event tracked: generation.section_generated (org: ${mockOrganizationId})`,
      );
    });
  });

  /**
   * Tests for getEventsByUser()
   * Validates user-specific event queries with multi-tenancy
   */
  describe('getEventsByUser', () => {
    it('should return user events filtered by organizationId with default limit', async () => {
      // Arrange
      const events = [mockEvent, mockErrorEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByUser(
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          organizationId: expect.anything(), // Or(Equal(mockOrganizationId), IsNull())
        },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(events);
      expect(result).toHaveLength(2);
    });

    it('should return user events with custom limit', async () => {
      // Arrange
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByUser(
        mockUserId,
        mockOrganizationId,
        50,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          organizationId: expect.anything(),
        },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(events);
    });

    it('should return empty array when user has no events in organization', async () => {
      // Arrange
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getEventsByUser(
        'no-events-user',
        mockOrganizationId,
      );

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter events by organizationId for multi-tenancy isolation', async () => {
      // Arrange - Only return events from same organization
      const orgEvents = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(orgEvents);

      // Act
      const result = await service.getEventsByUser(
        mockUserId,
        mockOrganizationId,
      );

      // Assert - Verifies multi-tenancy filter is applied
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: expect.anything(),
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  /**
   * Tests for getEventsByEtp()
   * Validates ETP-specific event queries with multi-tenancy
   */
  describe('getEventsByEtp', () => {
    it('should return all events for an ETP filtered by organizationId', async () => {
      // Arrange
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByEtp(
        mockEtpId,
        mockOrganizationId,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          etpId: mockEtpId,
          organizationId: expect.anything(), // Or(Equal(mockOrganizationId), IsNull())
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(events);
    });

    it('should return empty array when ETP has no events in organization', async () => {
      // Arrange
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getEventsByEtp(
        'no-events-etp',
        mockOrganizationId,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter ETP events by organizationId for multi-tenancy isolation', async () => {
      // Arrange
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByEtp(
        mockEtpId,
        mockOrganizationId,
      );

      // Assert - Verifies multi-tenancy filter is applied
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: expect.anything(),
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  /**
   * Tests for getEventsByType()
   * Validates event filtering by type and date range with multi-tenancy
   */
  describe('getEventsByType', () => {
    it('should return events by type filtered by organizationId without date range', async () => {
      // Arrange
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByType(
        'generation',
        mockOrganizationId,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          eventType: 'generation',
          organizationId: expect.anything(),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(events);
    });

    it('should return events by type with date range and organizationId', async () => {
      // Arrange
      const startDate = new Date('2025-11-01T00:00:00Z');
      const endDate = new Date('2025-11-12T23:59:59Z');
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByType(
        'generation',
        mockOrganizationId,
        startDate,
        endDate,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          eventType: 'generation',
          organizationId: expect.anything(),
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(events);
    });

    it('should ignore date range if only startDate is provided', async () => {
      // Arrange
      const startDate = new Date('2025-11-01T00:00:00Z');
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByType(
        'generation',
        mockOrganizationId,
        startDate,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith({
        where: {
          eventType: 'generation',
          organizationId: expect.anything(),
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(events);
    });

    it('should filter events by organizationId for multi-tenancy isolation', async () => {
      // Arrange
      const events = [mockEvent];
      mockAnalyticsRepository.find.mockResolvedValue(events);

      // Act
      const result = await service.getEventsByType(
        'generation',
        mockOrganizationId,
      );

      // Assert
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: expect.anything(),
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  /**
   * Tests for getDashboardStats()
   * Validates complex aggregation queries with multi-tenancy
   */
  describe('getDashboardStats', () => {
    it('should return dashboard statistics filtered by organizationId (admin view)', async () => {
      // Arrange
      // Create separate mock query builders for each query
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(150),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'generation', count: '100' },
          { type: 'error', count: '50' },
        ]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user-1', count: '50' },
          { userId: 'user-2', count: '30' },
        ]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2025-11-10', count: '20' },
          { date: '2025-11-11', count: '30' },
          { date: '2025-11-12', count: '40' },
        ]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder5 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: '2500.50' }),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4)
        .mockReturnValueOnce(mockQueryBuilder5);

      // Act - organizationId is now required as first parameter
      const result = await service.getDashboardStats(mockOrganizationId);

      // Assert
      expect(result).toHaveProperty('period');
      expect(result.period.days).toBe(30);
      expect(result.totalEvents).toBe(150);
      expect(result.eventsByType).toEqual({
        generation: 100,
        error: 50,
      });
      expect(result.mostActiveUsers).toHaveLength(2);
      expect(result.eventsByDay).toHaveLength(3);
      expect(result.averageGenerationTime).toBe('2500.50');
    });

    it('should return dashboard statistics for specific user within organization', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ type: 'generation', count: '40' }]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ date: '2025-11-12', count: '10' }]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: '2000' }),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4);

      // Act - organizationId first, then userId, then days
      const result = await service.getDashboardStats(
        mockOrganizationId,
        mockUserId,
        7,
      );

      // Assert
      expect(result.period.days).toBe(7);
      expect(result.totalEvents).toBe(50);
      expect(result.mostActiveUsers).toEqual([]); // Empty for user-specific view
    });

    it('should handle zero events gracefully', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder5 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: null }),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4)
        .mockReturnValueOnce(mockQueryBuilder5);

      // Act
      const result = await service.getDashboardStats(mockOrganizationId);

      // Assert
      expect(result.totalEvents).toBe(0);
      expect(result.eventsByType).toEqual({});
      expect(result.mostActiveUsers).toEqual([]);
      expect(result.eventsByDay).toEqual([]);
      expect(result.averageGenerationTime).toBeNull();
    });

    it('should calculate correct date range for custom days parameter', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder5 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: null }),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4)
        .mockReturnValueOnce(mockQueryBuilder5);

      // Act - organizationId required, undefined for userId, 90 days
      const result = await service.getDashboardStats(
        mockOrganizationId,
        undefined,
        90,
      );

      // Assert
      expect(result.period.days).toBe(90);
      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedStartDate.getDate() - 90);
      // Check date is approximately correct (within 1 second)
      expect(
        Math.abs(
          result.period.startDate.getTime() - expectedStartDate.getTime(),
        ),
      ).toBeLessThan(1000);
    });

    it('should parse avgDuration as float and format to 2 decimals', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder5 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn(),
        getRawOne: jest.fn().mockResolvedValue({ avgDuration: '3567.8912' }),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4)
        .mockReturnValueOnce(mockQueryBuilder5);

      // Act
      const result = await service.getDashboardStats(mockOrganizationId);

      // Assert
      expect(result.averageGenerationTime).toBe('3567.89');
    });
  });

  /**
   * Tests for getUserActivity()
   * Validates user-specific activity tracking with multi-tenancy
   */
  describe('getUserActivity', () => {
    it('should return user activity filtered by organizationId with default 30 days', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(75),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([
          { name: 'section_generated', count: '50' },
          { name: 'section_exported', count: '25' },
        ]),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);
      mockAnalyticsRepository.find.mockResolvedValue([
        mockEvent,
        mockErrorEvent,
      ]);

      // Act - userId then organizationId
      const result = await service.getUserActivity(
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result.userId).toBe(mockUserId);
      expect(result.period.days).toBe(30);
      expect(result.totalEvents).toBe(75);
      expect(result.eventsByType).toHaveLength(2);
      expect(result.recentActivity).toHaveLength(2);
    });

    it('should return user activity with custom days parameter and organizationId', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(20),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getUserActivity(
        mockUserId,
        mockOrganizationId,
        7,
      );

      // Assert
      expect(result.period.days).toBe(7);
      expect(result.totalEvents).toBe(20);
    });

    it('should handle users with no activity in organization', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getUserActivity(
        'inactive-user',
        mockOrganizationId,
      );

      // Assert
      expect(result.totalEvents).toBe(0);
      expect(result.eventsByType).toEqual([]);
      expect(result.recentActivity).toEqual([]);
    });

    it('should limit recent activity to 20 items', async () => {
      // Arrange
      const manyEvents = Array(25).fill(mockEvent);
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(25),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);
      mockAnalyticsRepository.find.mockResolvedValue(manyEvents.slice(0, 20));

      // Act
      const result = await service.getUserActivity(
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result.recentActivity).toHaveLength(20);
      expect(mockAnalyticsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  /**
   * Tests for getSystemHealth()
   * Validates system health metrics with multi-tenancy
   */
  describe('getSystemHealth', () => {
    it('should return system health metrics filtered by organizationId with error rate', async () => {
      // Arrange - All using query builders for org filtering
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1000), // totalEvents
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50), // errorEvents
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(200), // totalGenerations
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(180), // successfulGenerations
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4);
      mockAnalyticsRepository.find.mockResolvedValue([mockErrorEvent]);

      // Act
      const result = await service.getSystemHealth(mockOrganizationId);

      // Assert
      expect(result.period).toBe('24h');
      expect(result.totalEvents).toBe(1000);
      expect(result.errorEvents).toBe(50);
      expect(result.errorRate).toBe('5.00'); // 50/1000 * 100 = 5%
      expect(result.recentErrors).toHaveLength(1);
      expect(result.generation.total).toBe(200);
      expect(result.generation.successful).toBe(180);
      expect(result.generation.successRate).toBe('90.00'); // 180/200 * 100 = 90%
    });

    it('should handle zero events without division by zero', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder1,
      );
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSystemHealth(mockOrganizationId);

      // Assert
      expect(result.errorRate).toBe('0.00');
      expect(result.generation.successRate).toBe('0.00');
    });

    it('should return recent errors (max 10) filtered by organization', async () => {
      // Arrange
      const manyErrors = Array(15).fill(mockErrorEvent);
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(15),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(45),
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4);
      mockAnalyticsRepository.find.mockResolvedValue(manyErrors.slice(0, 10));

      // Act
      const result = await service.getSystemHealth(mockOrganizationId);

      // Assert
      expect(result.recentErrors).toHaveLength(10);
    });

    it('should format rates to 2 decimal places', async () => {
      // Arrange
      const mockQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(777), // totalEvents
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder2 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(123), // errorEvents
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder3 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(333), // totalGenerations
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      const mockQueryBuilder4 = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(234), // successfulGenerations
        getRawMany: jest.fn(),
        getRawOne: jest.fn(),
      };

      mockAnalyticsRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2)
        .mockReturnValueOnce(mockQueryBuilder3)
        .mockReturnValueOnce(mockQueryBuilder4);
      mockAnalyticsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSystemHealth(mockOrganizationId);

      // Assert
      expect(result.errorRate).toBe('15.83');
      expect(result.generation.successRate).toBe('70.27');
    });
  });
});
