import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  FindOptionsWhere,
  IsNull,
  Or,
  Equal,
} from 'typeorm';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { Request } from 'express';

// Extend Express Request to include session
interface RequestWithSession extends Request {
  sessionID?: string;
}

/**
 * AnalyticsService - Multi-tenant analytics event tracking and reporting.
 *
 * Security Hardening (#648):
 * All query methods now require organizationId for multi-tenancy isolation.
 * This prevents cross-organization data leakage in analytics.
 *
 * Architecture:
 * - trackEvent: Stores organizationId with each event
 * - Query methods: Filter by organizationId to ensure tenant isolation
 * - Legacy events (null organizationId): Included for backward compatibility
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>,
  ) {}

  /**
   * Track an analytics event with multi-tenancy support.
   *
   * @param eventType - Event category (e.g., 'user_action', 'generation', 'error')
   * @param eventName - Specific event name (e.g., 'etp_created', 'section_generated')
   * @param properties - Optional event properties
   * @param userId - User ID who triggered the event
   * @param etpId - Related ETP ID (optional)
   * @param request - Express request for session/IP tracking
   * @param organizationId - Organization ID for multi-tenancy isolation
   */
  async trackEvent(
    eventType: string,
    eventName: string,
    properties?: Record<string, unknown>,
    userId?: string,
    etpId?: string,
    request?: Request,
    organizationId?: string,
  ): Promise<void> {
    try {
      const reqWithSession = request as RequestWithSession;
      const event = this.analyticsRepository.create({
        eventType,
        eventName,
        properties: properties || {},
        userId,
        etpId,
        organizationId: organizationId || null,
        sessionId: reqWithSession?.sessionID,
        ipAddress: request?.ip,
        userAgent: request?.get?.('user-agent'),
        referer: request?.get?.('referer'),
      });

      await this.analyticsRepository.save(event);
      this.logger.debug(
        `Event tracked: ${eventType}.${eventName} (org: ${organizationId || 'none'})`,
      );
    } catch (error) {
      this.logger.error('Error tracking event:', error);
      // Don't throw - analytics should not break the application
    }
  }

  /**
   * Get events by user with organization isolation.
   *
   * Security: Filters by organizationId to prevent cross-tenant data access.
   * Legacy events (null organizationId) are included for backward compatibility.
   *
   * @param userId - User ID to filter by
   * @param organizationId - Organization ID for multi-tenancy isolation
   * @param limit - Maximum number of events to return
   */
  async getEventsByUser(
    userId: string,
    organizationId: string,
    limit: number = 100,
  ) {
    return this.analyticsRepository.find({
      where: {
        userId,
        organizationId: Or(Equal(organizationId), IsNull()),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get events by ETP with organization isolation.
   *
   * Security: Filters by organizationId to prevent cross-tenant data access.
   *
   * @param etpId - ETP ID to filter by
   * @param organizationId - Organization ID for multi-tenancy isolation
   */
  async getEventsByEtp(etpId: string, organizationId: string) {
    return this.analyticsRepository.find({
      where: {
        etpId,
        organizationId: Or(Equal(organizationId), IsNull()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get events by type with organization isolation.
   *
   * Security: Filters by organizationId to prevent cross-tenant data access.
   *
   * @param eventType - Event type to filter by
   * @param organizationId - Organization ID for multi-tenancy isolation
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   */
  async getEventsByType(
    eventType: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const query: FindOptionsWhere<AnalyticsEvent> = {
      eventType,
      organizationId: Or(Equal(organizationId), IsNull()),
    };

    if (startDate && endDate) {
      query.createdAt = Between(startDate, endDate);
    }

    return this.analyticsRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get dashboard statistics with organization isolation.
   *
   * Security: All queries filter by organizationId to prevent cross-tenant data access.
   *
   * @param organizationId - Organization ID for multi-tenancy isolation (required)
   * @param userId - Optional user ID filter
   * @param days - Number of days to look back (default: 30)
   */
  async getDashboardStats(
    organizationId: string,
    userId?: string,
    days: number = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Base query builder with organization filter
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      );

    if (userId) {
      queryBuilder.andWhere('event.userId = :userId', { userId });
    }

    // Total events
    const totalEvents = await queryBuilder.getCount();

    // Events by type (with org filter)
    const eventsByType = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .groupBy('event.eventType')
      .getRawMany();

    // Most active users within organization (if no specific user filter)
    let mostActiveUsers = [];
    if (!userId) {
      mostActiveUsers = await this.analyticsRepository
        .createQueryBuilder('event')
        .select('event.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('event.createdAt >= :startDate', { startDate })
        .andWhere('event.userId IS NOT NULL')
        .andWhere(
          '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
          { organizationId },
        )
        .groupBy('event.userId')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();
    }

    // Events by day (with org filter)
    const eventsByDay = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('DATE(event.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .groupBy('DATE(event.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Average generation time (with org filter)
    const avgGenerationTime = await this.analyticsRepository
      .createQueryBuilder('event')
      .select(
        "AVG(CAST(event.properties->>'duration' AS INTEGER))",
        'avgDuration',
      )
      .where('event.eventType = :type', { type: 'generation' })
      .andWhere('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getRawOne();

    return {
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      totalEvents,
      eventsByType: eventsByType.reduce(
        (acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
      mostActiveUsers,
      eventsByDay,
      averageGenerationTime: avgGenerationTime?.avgDuration
        ? parseFloat(avgGenerationTime.avgDuration).toFixed(2)
        : null,
    };
  }

  /**
   * Get user activity with organization isolation.
   *
   * Security: Filters by organizationId to prevent cross-tenant data access.
   *
   * @param userId - User ID to get activity for
   * @param organizationId - Organization ID for multi-tenancy isolation
   * @param days - Number of days to look back (default: 30)
   */
  async getUserActivity(
    userId: string,
    organizationId: string,
    days: number = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.userId = :userId', { userId })
      .andWhere('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getCount();

    const eventsByType = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('event.eventName', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('event.userId = :userId', { userId })
      .andWhere('event.createdAt >= :startDate', { startDate })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .groupBy('event.eventName')
      .orderBy('count', 'DESC')
      .getRawMany();

    const recentActivity = await this.analyticsRepository.find({
      where: {
        userId,
        organizationId: Or(Equal(organizationId), IsNull()),
      },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      userId,
      period: { days, startDate, endDate: new Date() },
      totalEvents,
      eventsByType,
      recentActivity,
    };
  }

  /**
   * Get system health metrics with organization isolation.
   *
   * Security: Filters by organizationId to prevent cross-tenant data access.
   * Even system health metrics should be scoped to the user's organization.
   *
   * @param organizationId - Organization ID for multi-tenancy isolation
   */
  async getSystemHealth(organizationId: string) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Error rate (with org filter)
    const totalEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.createdAt >= :oneDayAgo', { oneDayAgo })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getCount();

    const errorEvents = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.eventType = :type', { type: 'error' })
      .andWhere('event.createdAt >= :oneDayAgo', { oneDayAgo })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getCount();

    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

    // Recent errors (with org filter)
    const recentErrors = await this.analyticsRepository.find({
      where: {
        eventType: 'error',
        organizationId: Or(Equal(organizationId), IsNull()),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Success rate for generations (with org filter)
    const totalGenerations = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.eventType = :type', { type: 'generation' })
      .andWhere('event.createdAt >= :oneDayAgo', { oneDayAgo })
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getCount();

    const successfulGenerations = await this.analyticsRepository
      .createQueryBuilder('event')
      .where('event.eventType = :type', { type: 'generation' })
      .andWhere('event.createdAt >= :date', { date: oneDayAgo })
      .andWhere("event.properties->>'success' = 'true'")
      .andWhere(
        '(event.organizationId = :organizationId OR event.organizationId IS NULL)',
        { organizationId },
      )
      .getCount();

    const generationSuccessRate =
      totalGenerations > 0
        ? (successfulGenerations / totalGenerations) * 100
        : 0;

    return {
      period: '24h',
      errorRate: errorRate.toFixed(2),
      totalEvents,
      errorEvents,
      recentErrors,
      generation: {
        total: totalGenerations,
        successful: successfulGenerations,
        successRate: generationSuccessRate.toFixed(2),
      },
    };
  }
}
