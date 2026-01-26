import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { ApiUsage } from '../entities/api-usage.entity';
import { User } from '../../../entities/user.entity';

/**
 * Interface for aggregated usage metrics
 */
export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  quotaConsumed: number;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
}

/**
 * Interface for quota status
 */
export interface QuotaStatus {
  totalQuota: number;
  consumedQuota: number;
  remainingQuota: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * ApiUsageService
 *
 * Service for tracking and analyzing Market Intelligence API usage.
 * Provides metrics for billing, monitoring, and quota management.
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1688 - Criar ApiUsage entity e tracking de métricas
 *
 * @author ETP Express Team
 * @since 2026-01-25
 */
@Injectable()
export class ApiUsageService {
  private readonly logger = new Logger(ApiUsageService.name);

  constructor(
    @InjectRepository(ApiUsage)
    private readonly apiUsageRepository: Repository<ApiUsage>,
  ) {}

  /**
   * Track an API request
   *
   * Records request details for metrics and billing purposes.
   * Should be called by interceptor/middleware after each API response.
   *
   * @param user - User who made the request
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param statusCode - HTTP status code
   * @param responseTime - Response time in milliseconds
   * @param quota - Quota consumed by this request (default: 1)
   */
  async trackRequest(
    user: User,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    quota = 1,
  ): Promise<void> {
    try {
      const usage = this.apiUsageRepository.create({
        user,
        endpoint,
        method,
        statusCode,
        responseTime,
        quota,
      });

      await this.apiUsageRepository.save(usage);

      this.logger.debug(
        `Tracked API usage: ${method} ${endpoint} for user ${user.id} (${responseTime}ms, quota: ${quota})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track API usage for user ${user.id}: ${error.message}`,
        error.stack,
      );
      // Don't throw - tracking failures shouldn't break API requests
    }
  }

  /**
   * Get aggregated usage metrics for a user
   *
   * Returns comprehensive metrics including request counts, performance,
   * and quota consumption for the specified time period.
   *
   * @param userId - User ID
   * @param startDate - Start of period
   * @param endDate - End of period
   * @returns Aggregated usage metrics
   */
  async getUserUsage(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageMetrics> {
    const usageRecords = await this.apiUsageRepository.find({
      where: {
        user: { id: userId },
        createdAt: Between(startDate, endDate),
      },
    });

    const totalRequests = usageRecords.length;
    const successfulRequests = usageRecords.filter(
      (r) => r.statusCode >= 200 && r.statusCode < 300,
    ).length;
    const failedRequests = totalRequests - successfulRequests;

    const averageResponseTime =
      totalRequests > 0
        ? usageRecords.reduce((sum, r) => sum + r.responseTime, 0) /
          totalRequests
        : 0;

    const quotaConsumed = usageRecords.reduce((sum, r) => sum + r.quota, 0);

    // Calculate top endpoints
    const endpointCounts = usageRecords.reduce(
      (acc, r) => {
        acc[r.endpoint] = (acc[r.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      quotaConsumed,
      topEndpoints,
    };
  }

  /**
   * Check quota status for a user
   *
   * Returns current quota consumption and remaining quota for the current billing period.
   * Billing period is monthly, starting from the 1st of each month.
   *
   * @param userId - User ID
   * @param totalQuota - Total monthly quota for the user (default: 1000 requests/month)
   * @returns Quota status with consumption details
   */
  async checkQuota(userId: string, totalQuota = 1000): Promise<QuotaStatus> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const usageRecords = await this.apiUsageRepository.find({
      where: {
        user: { id: userId },
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const consumedQuota = usageRecords.reduce((sum, r) => sum + r.quota, 0);
    const remainingQuota = Math.max(0, totalQuota - consumedQuota);

    return {
      totalQuota,
      consumedQuota,
      remainingQuota,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Get recent API usage for a user
   *
   * Returns the most recent API requests for debugging and monitoring.
   *
   * @param userId - User ID
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Recent usage records
   */
  async getRecentUsage(userId: string, limit = 100): Promise<ApiUsage[]> {
    return this.apiUsageRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
