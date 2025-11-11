import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { AnalyticsEvent } from "../../entities/analytics-event.entity";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>,
  ) {}

  async trackEvent(
    eventType: string,
    eventName: string,
    properties?: any,
    userId?: string,
    etpId?: string,
    request?: any,
  ): Promise<void> {
    try {
      const event = this.analyticsRepository.create({
        eventType,
        eventName,
        properties: properties || {},
        userId,
        etpId,
        sessionId: request?.sessionID,
        ipAddress: request?.ip,
        userAgent: request?.get?.("user-agent"),
        referer: request?.get?.("referer"),
      });

      await this.analyticsRepository.save(event);
      this.logger.debug(`Event tracked: ${eventType}.${eventName}`);
    } catch (error) {
      this.logger.error("Error tracking event:", error);
      // Don't throw - analytics should not break the application
    }
  }

  async getEventsByUser(userId: string, limit: number = 100) {
    return this.analyticsRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async getEventsByEtp(etpId: string) {
    return this.analyticsRepository.find({
      where: { etpId },
      order: { createdAt: "DESC" },
    });
  }

  async getEventsByType(eventType: string, startDate?: Date, endDate?: Date) {
    const query: any = { eventType };

    if (startDate && endDate) {
      query.createdAt = Between(startDate, endDate);
    }

    return this.analyticsRepository.find({
      where: query,
      order: { createdAt: "DESC" },
    });
  }

  async getDashboardStats(userId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const queryBuilder = this.analyticsRepository
      .createQueryBuilder("event")
      .where("event.createdAt >= :startDate", { startDate });

    if (userId) {
      queryBuilder.andWhere("event.userId = :userId", { userId });
    }

    // Total events
    const totalEvents = await queryBuilder.getCount();

    // Events by type
    const eventsByType = await this.analyticsRepository
      .createQueryBuilder("event")
      .select("event.eventType", "type")
      .addSelect("COUNT(*)", "count")
      .where("event.createdAt >= :startDate", { startDate })
      .groupBy("event.eventType")
      .getRawMany();

    // Most active users (if admin)
    let mostActiveUsers = [];
    if (!userId) {
      mostActiveUsers = await this.analyticsRepository
        .createQueryBuilder("event")
        .select("event.userId", "userId")
        .addSelect("COUNT(*)", "count")
        .where("event.createdAt >= :startDate", { startDate })
        .andWhere("event.userId IS NOT NULL")
        .groupBy("event.userId")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany();
    }

    // Events by day
    const eventsByDay = await this.analyticsRepository
      .createQueryBuilder("event")
      .select("DATE(event.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("event.createdAt >= :startDate", { startDate })
      .groupBy("DATE(event.createdAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    // Average generation time
    const avgGenerationTime = await this.analyticsRepository
      .createQueryBuilder("event")
      .select(
        "AVG(CAST(event.properties->>'duration' AS INTEGER))",
        "avgDuration",
      )
      .where("event.eventType = :type", { type: "generation" })
      .andWhere("event.createdAt >= :startDate", { startDate })
      .getRawOne();

    return {
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      totalEvents,
      eventsByType: eventsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      mostActiveUsers,
      eventsByDay,
      averageGenerationTime: avgGenerationTime?.avgDuration
        ? parseFloat(avgGenerationTime.avgDuration).toFixed(2)
        : null,
    };
  }

  async getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalEvents = await this.analyticsRepository.count({
      where: {
        userId,
        createdAt: Between(startDate, new Date()),
      },
    });

    const eventsByType = await this.analyticsRepository
      .createQueryBuilder("event")
      .select("event.eventName", "name")
      .addSelect("COUNT(*)", "count")
      .where("event.userId = :userId", { userId })
      .andWhere("event.createdAt >= :startDate", { startDate })
      .groupBy("event.eventName")
      .orderBy("count", "DESC")
      .getRawMany();

    const recentActivity = await this.analyticsRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
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

  async getSystemHealth() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Error rate
    const totalEvents = await this.analyticsRepository.count({
      where: {
        createdAt: Between(oneDayAgo, new Date()),
      },
    });

    const errorEvents = await this.analyticsRepository.count({
      where: {
        eventType: "error",
        createdAt: Between(oneDayAgo, new Date()),
      },
    });

    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

    // Recent errors
    const recentErrors = await this.analyticsRepository.find({
      where: { eventType: "error" },
      order: { createdAt: "DESC" },
      take: 10,
    });

    // Success rate for generations
    const totalGenerations = await this.analyticsRepository.count({
      where: {
        eventType: "generation",
        createdAt: Between(oneDayAgo, new Date()),
      },
    });

    const successfulGenerations = await this.analyticsRepository
      .createQueryBuilder("event")
      .where("event.eventType = :type", { type: "generation" })
      .andWhere("event.createdAt >= :date", { date: oneDayAgo })
      .andWhere("event.properties->>'success' = 'true'")
      .getCount();

    const generationSuccessRate =
      totalGenerations > 0
        ? (successfulGenerations / totalGenerations) * 100
        : 0;

    return {
      period: "24h",
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
