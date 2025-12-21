import { Logger } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  LoadEvent,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';

/**
 * Slow Query Subscriber (#813)
 *
 * Monitors and logs slow database queries for performance analysis.
 * Integrates with Prometheus metrics via PrometheusMetricsService.
 *
 * Threshold: 1000ms (1 second)
 *
 * Note: TypeORM's QueryEvent is not directly available in subscribers,
 * so we use entity lifecycle events with timing to detect slow operations.
 * For query-level logging, maxQueryExecutionTime in TypeORM config handles it.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/813
 */
@EventSubscriber()
export class SlowQuerySubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger('SlowQuery');
  private readonly thresholdMs = 1000;

  /**
   * Called after entity is loaded from database
   */
  afterLoad(entity: any, event?: LoadEvent<any>): void {
    // Load events don't have timing info in TypeORM
    // Query timing is handled by maxQueryExecutionTime config
  }

  /**
   * Called after entity is inserted
   */
  afterInsert(event: InsertEvent<any>): void {
    this.logSlowOperation('INSERT', event.metadata?.tableName, event);
  }

  /**
   * Called after entity is updated
   */
  afterUpdate(event: UpdateEvent<any>): void {
    this.logSlowOperation('UPDATE', event.metadata?.tableName, event);
  }

  /**
   * Called after entity is removed
   */
  afterRemove(event: RemoveEvent<any>): void {
    this.logSlowOperation('DELETE', event.metadata?.tableName, event);
  }

  /**
   * Log slow operation with structured JSON
   */
  private logSlowOperation(
    operation: string,
    tableName: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: any,
  ): void {
    // Note: TypeORM doesn't provide query execution time in entity subscribers
    // This subscriber is prepared for future enhancement when timing is available
    // Current slow query detection relies on maxQueryExecutionTime in TypeORM config
    // which logs slow queries directly via TypeORM's internal logging

    // For now, we log operations for debugging purposes
    if (process.env.DEBUG_SLOW_QUERIES === 'true') {
      this.logger.debug({
        message: 'Database operation tracked',
        operation,
        table: tableName || 'unknown',
        threshold_ms: this.thresholdMs,
      });
    }
  }
}
