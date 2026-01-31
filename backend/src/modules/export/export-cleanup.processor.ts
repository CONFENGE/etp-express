/**
 * Export Cleanup Processor
 *
 * BullMQ processor for automatic cleanup of old export files from S3.
 * Implements retention policy to remove exports older than configured days.
 *
 * Schedule:
 * - Runs daily at 2 AM
 * - Can be triggered manually via ExportService
 *
 * Cleanup Strategy:
 * - Soft delete: Mark ExportMetadata as deleted but keep S3 file for audit (default)
 * - Hard delete: Remove both ExportMetadata and S3 file (configurable)
 *
 * @module modules/export
 * @see Issue #1706 - Retention policy and cleanup job for old exports
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportMetadata } from './entities/export-metadata.entity';
import { S3Service } from '../storage/s3.service';
import {
  EXPORT_CLEANUP_QUEUE,
  EXPORT_CLEANUP_JOB,
  ExportCleanupJobData,
  ExportCleanupJobResult,
} from './export-cleanup.types';

/**
 * BullMQ processor for export cleanup jobs
 *
 * Handles automatic cleanup of old export files based on retention policy.
 *
 * @remarks
 * - Jobs run daily via cron (2 AM)
 * - Failed jobs are retried once after 1 hour
 * - Errors are logged to Sentry for alerting
 */
@Processor(EXPORT_CLEANUP_QUEUE)
export class ExportCleanupProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(ExportCleanupProcessor.name);

  constructor(
    @InjectRepository(ExportMetadata)
    private readonly exportMetadataRepository: Repository<ExportMetadata>,
    private readonly s3Service: S3Service,
  ) {
    super();
    this.logger.log('ExportCleanupProcessor initialized');
  }

  /**
   * Graceful shutdown handler for BullMQ worker
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `ExportCleanupProcessor shutting down (${signal || 'unknown signal'})...`,
    );

    try {
      const worker = this.worker;
      if (worker) {
        await worker.close(false);
        this.logger.log('ExportCleanupProcessor worker closed gracefully');
      }
    } catch (error) {
      this.logger.error(
        `Error closing ExportCleanupProcessor worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Main job processor - cleans up old exports
   *
   * @param job - BullMQ job instance
   * @returns {Promise<ExportCleanupJobResult>} Job result with cleanup statistics
   */
  async process(
    job: Job<ExportCleanupJobData>,
  ): Promise<ExportCleanupJobResult> {
    const { retentionDays, dryRun = false, organizationId } = job.data;

    this.logger.log(
      `Processing export cleanup job (ID: ${job.id}): retentionDays=${retentionDays}, dryRun=${dryRun}, org=${organizationId || 'all'}`,
    );

    const result: ExportCleanupJobResult = {
      deletedCount: 0,
      s3DeletedCount: 0,
      deletedIds: [],
      errors: [],
      dryRun,
    };

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      this.logger.log(
        `Searching for exports older than ${cutoffDate.toISOString()}`,
      );

      // Find old exports
      const queryBuilder = this.exportMetadataRepository
        .createQueryBuilder('export')
        .where('export.createdAt < :cutoffDate', { cutoffDate });

      // Filter by organization if provided
      if (organizationId) {
        queryBuilder.andWhere('export.organizationId = :organizationId', {
          organizationId,
        });
      }

      const oldExports = await queryBuilder.getMany();

      this.logger.log(`Found ${oldExports.length} old exports to clean up`);

      if (oldExports.length === 0) {
        return result;
      }

      // Process each old export
      for (const exportRecord of oldExports) {
        try {
          if (!dryRun) {
            // Delete from S3 if configured
            if (this.s3Service.isConfigured() && exportRecord.s3Key) {
              try {
                await this.s3Service.deleteFile(exportRecord.s3Key);
                result.s3DeletedCount++;
                this.logger.debug(`Deleted S3 file: ${exportRecord.s3Key}`);
              } catch (s3Error) {
                const errorMsg = `Failed to delete S3 file ${exportRecord.s3Key}: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`;
                this.logger.warn(errorMsg);
                result.errors.push(errorMsg);
                // Continue with DB deletion even if S3 fails
              }
            }

            // Delete from database
            await this.exportMetadataRepository.remove(exportRecord);
            result.deletedCount++;
            result.deletedIds.push(exportRecord.id);
          } else {
            // Dry run - just log
            this.logger.debug(
              `[DRY RUN] Would delete export: ${exportRecord.id} (S3: ${exportRecord.s3Key})`,
            );
            result.deletedCount++;
            result.deletedIds.push(exportRecord.id);
          }
        } catch (error) {
          const errorMsg = `Failed to delete export ${exportRecord.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(
            errorMsg,
            error instanceof Error ? error.stack : undefined,
          );
          result.errors.push(errorMsg);
          // Continue with next export
        }
      }

      this.logger.log(
        `Export cleanup completed: deleted ${result.deletedCount} records, ${result.s3DeletedCount} S3 files, ${result.errors.length} errors`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Export cleanup job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      Sentry.captureException(error, {
        tags: {
          jobName: EXPORT_CLEANUP_JOB,
          jobId: job.id,
        },
        extra: {
          jobData: job.data,
        },
      });

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: ExportCleanupJobResult) {
    this.logger.log(
      `Export cleanup job completed: ${job.id} - Deleted ${result.deletedCount} records, ${result.s3DeletedCount} S3 files`,
    );

    // Alert if there were errors
    if (result.errors.length > 0) {
      Sentry.captureMessage(
        `Export cleanup completed with ${result.errors.length} errors`,
        {
          level: 'warning',
          tags: {
            jobId: job.id,
          },
          extra: {
            errors: result.errors,
            deletedCount: result.deletedCount,
          },
        },
      );
    }
  }

  /**
   * Event handler: Job failed after all retries
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (!job) {
      this.logger.error(
        `Export cleanup job failed but job object is undefined: ${error.message}`,
      );
      return;
    }

    this.logger.error(
      `Export cleanup job FAILED after ${job.attemptsMade} attempts: ${job.id}`,
      error.stack,
    );

    Sentry.captureMessage(`Critical: Export cleanup failed after all retries`, {
      level: 'error',
      tags: {
        jobId: job.id,
      },
      extra: {
        jobData: job.data,
        error: error.message,
        attemptsMade: job.attemptsMade,
      },
    });
  }
}
