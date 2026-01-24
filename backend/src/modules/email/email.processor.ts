/**
 * Email Processor
 *
 * BullMQ processor for asynchronous email delivery with automatic retry.
 * Implements exponential backoff retry strategy to handle transient SMTP failures.
 *
 * Retry Strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: After 1 minute
 * - Attempt 3: After 5 minutes (cumulative: 6 min)
 * - Attempt 4: After 30 minutes (cumulative: 36 min)
 *
 * If all attempts fail, the job is moved to failed queue and error is logged.
 *
 * @module modules/email
 * @see https://github.com/CONFENGE/etp-express/issues/1072
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { EmailService } from './email.service';
import {
  EMAIL_QUEUE,
  DELETION_CONFIRMATION_JOB,
  PASSWORD_RESET_JOB,
  GENERIC_EMAIL_JOB,
  DeletionConfirmationJobData,
  PasswordResetJobData,
  GenericEmailJobData,
  EmailJobResult,
} from './email.types';

/**
 * BullMQ processor for email delivery jobs
 *
 * Handles three types of email jobs:
 * 1. Deletion confirmation - Account deletion notifications with cancellation link
 * 2. Password reset - Password recovery emails with reset token
 * 3. Generic email - Custom emails for other use cases
 *
 * @remarks
 * - Jobs run with exponential backoff retry (3 attempts: 1min, 5min, 30min)
 * - Errors are logged to Sentry for alerting
 * - Failed jobs are retained for 7 days for debugging
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
    this.logger.log('EmailProcessor initialized');
  }

  /**
   * Graceful shutdown handler for BullMQ worker
   *
   * Ensures currently processing jobs complete before the worker terminates.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `EmailProcessor shutting down (${signal || 'unknown signal'})...`,
    );

    try {
      const worker = this.worker;
      if (worker) {
        await worker.close(false);
        this.logger.log('EmailProcessor worker closed gracefully');
      }
    } catch (error) {
      this.logger.error(
        `Error closing EmailProcessor worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Main job processor - routes to specific handlers based on job name
   *
   * @param job - BullMQ job instance
   * @returns {Promise<EmailJobResult>} Job result with success status and message ID
   */
  async process(job: Job): Promise<EmailJobResult> {
    this.logger.log(
      `Processing email job: ${job.name} (ID: ${job.id}, Attempt: ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );

    try {
      let result: EmailJobResult;

      switch (job.name) {
        case DELETION_CONFIRMATION_JOB:
          result = await this.processDeletionConfirmation(job);
          break;
        case PASSWORD_RESET_JOB:
          result = await this.processPasswordReset(job);
          break;
        case GENERIC_EMAIL_JOB:
          result = await this.processGenericEmail(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      this.logger.log(
        `Email job completed successfully: ${job.name} (ID: ${job.id}, MessageID: ${result.messageId})`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Email job failed: ${job.name} (ID: ${job.id}, Attempt: ${job.attemptsMade + 1}/${job.opts.attempts})`,
        error instanceof Error ? error.stack : undefined,
      );

      // Send to Sentry only on final failure
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
        Sentry.captureException(error, {
          tags: {
            jobName: job.name,
            jobId: job.id,
          },
          extra: {
            jobData: job.data,
            attemptsMade: job.attemptsMade + 1,
          },
        });
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process deletion confirmation email job
   *
   * @param job - BullMQ job with deletion confirmation data
   * @returns {Promise<EmailJobResult>} Result with messageId
   */
  private async processDeletionConfirmation(
    job: Job<DeletionConfirmationJobData>,
  ): Promise<EmailJobResult> {
    const { userId, email, userName, deletedAt } = job.data;

    this.logger.debug(
      `Sending deletion confirmation email to: ${email} (User ID: ${userId})`,
    );

    const messageId = await this.emailService.sendDeletionConfirmationDirect(
      userId,
      email,
      userName,
      new Date(deletedAt),
    );

    return {
      success: true,
      messageId,
    };
  }

  /**
   * Process password reset email job
   *
   * @param job - BullMQ job with password reset data
   * @returns {Promise<EmailJobResult>} Result with messageId
   */
  private async processPasswordReset(
    job: Job<PasswordResetJobData>,
  ): Promise<EmailJobResult> {
    const { email, userName, resetToken } = job.data;

    this.logger.debug(`Sending password reset email to: ${email}`);

    const messageId = await this.emailService.sendPasswordResetEmailDirect(
      email,
      userName,
      resetToken,
    );

    return {
      success: true,
      messageId,
    };
  }

  /**
   * Process generic email job
   *
   * @param job - BullMQ job with generic email data
   * @returns {Promise<EmailJobResult>} Result with messageId
   */
  private async processGenericEmail(
    job: Job<GenericEmailJobData>,
  ): Promise<EmailJobResult> {
    const { to, subject, html } = job.data;

    this.logger.debug(`Sending generic email to: ${to} (Subject: ${subject})`);

    const messageId = await this.emailService.sendMailDirect({
      to,
      subject,
      html,
    });

    return {
      success: true,
      messageId,
    };
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: EmailJobResult) {
    this.logger.log(
      `Email job completed: ${job.name} (ID: ${job.id}, MessageID: ${result.messageId})`,
    );
  }

  /**
   * Event handler: Job failed after all retries
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (!job) {
      this.logger.error(
        `Job failed but job object is undefined: ${error.message}`,
      );
      return;
    }

    this.logger.error(
      `Email job FAILED after ${job.attemptsMade} attempts: ${job.name} (ID: ${job.id})`,
      error.stack,
    );

    // Alert for critical email failures
    Sentry.captureMessage(
      `Critical: Email delivery failed after all retries - ${job.name}`,
      {
        level: 'error',
        tags: {
          jobName: job.name,
          jobId: job.id,
        },
        extra: {
          jobData: job.data,
          error: error.message,
          attemptsMade: job.attemptsMade,
        },
      },
    );
  }

  /**
   * Event handler: Job is being retried
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    if (job.attemptsMade > 0) {
      this.logger.warn(
        `Retrying email job: ${job.name} (ID: ${job.id}, Attempt: ${job.attemptsMade + 1}/${job.opts.attempts})`,
      );
    }
  }
}
