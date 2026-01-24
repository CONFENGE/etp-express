import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { addDays, format } from 'date-fns';
import { User } from '../../entities/user.entity';
import {
  EMAIL_QUEUE,
  DELETION_CONFIRMATION_JOB,
  PASSWORD_RESET_JOB,
  GENERIC_EMAIL_JOB,
  DeletionConfirmationJobData,
  PasswordResetJobData,
  GenericEmailJobData,
} from './email.types';

/**
 * Service for sending transactional emails.
 *
 * @remarks
 * Uses nodemailer with SMTP configuration from environment variables.
 * Supports Handlebars templates for email content.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue,
  ) {
    this.initializeTransporter();
  }

  /**
   * Initializes nodemailer transporter with SMTP configuration.
   * Falls back to console logging if SMTP is not configured (dev/test environments).
   */
  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      this.logger.warn(
        'SMTP configuration not found. Emails will be logged to console only.',
      );
      // Create test transporter for development
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    this.logger.log(`SMTP transporter initialized: ${smtpHost}:${smtpPort}`);
  }

  /**
   * Enqueues account deletion confirmation email with automatic retry.
   *
   * @remarks
   * Email includes:
   * - Scheduled deletion date (30 days from now)
   * - List of data to be deleted
   * - Cancellation link (valid for 30 days)
   * - Support contact information
   *
   * This method fulfills LGPD transparency requirements for data deletion.
   *
   * **Retry Strategy:**
   * - Attempt 1: Immediate
   * - Attempt 2: After 1 minute
   * - Attempt 3: After 5 minutes
   * - Attempt 4: After 30 minutes
   *
   * @param user - User entity with deletedAt timestamp
   * @returns Promise resolving when job is enqueued (not when email is sent)
   */
  async sendDeletionConfirmation(user: User): Promise<void> {
    if (!user.deletedAt) {
      throw new Error('User is not marked for deletion');
    }

    const jobData: DeletionConfirmationJobData = {
      userId: user.id,
      email: user.email,
      userName: user.name,
      deletedAt: user.deletedAt,
    };

    await this.emailQueue.add(DELETION_CONFIRMATION_JOB, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    this.logger.log(`Deletion confirmation email enqueued for ${user.email}`);
  }

  /**
   * Sends account deletion confirmation email directly (used by processor only).
   *
   * @internal
   * @param user - User entity with deletedAt timestamp
   * @returns Promise resolving to messageId when email is sent
   */
  async sendDeletionConfirmationDirect(user: User): Promise<string> {
    if (!user.deletedAt) {
      throw new Error('User is not marked for deletion');
    }

    const deletionDate = addDays(user.deletedAt, 30);
    const cancelToken = await this.generateCancelToken(user.id);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'suporte@confenge.com.br',
    );

    const templatePath = path.join(
      __dirname,
      'templates',
      'account-deletion-confirmation.hbs',
    );
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    const html = template({
      userName: user.name,
      deletionScheduledFor: format(deletionDate, 'dd/MM/yyyy'),
      cancelUrl: `${frontendUrl}/account/cancel-deletion?token=${cancelToken}`,
      supportEmail,
    });

    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        '"ETP Express" <noreply@confenge.com.br>',
      ),
      to: user.email,
      subject: 'Confirmação de exclusão de conta - ETP Express',
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(
      `Deletion confirmation email sent to ${user.email}: ${info.messageId}`,
    );

    // Log email content in development if using test transporter
    if (info.message) {
      this.logger.debug(`Email content:\n${info.message.toString('utf8')}`);
    }

    return info.messageId;
  }

  /**
   * Generates JWT token for account deletion cancellation.
   *
   * @remarks
   * Token is valid for 30 days and contains:
   * - sub: User ID
   * - type: 'CANCEL_DELETION' (prevents token reuse for other purposes)
   *
   * @param userId - User unique identifier (UUID)
   * @returns JWT token string
   */
  private async generateCancelToken(userId: string): Promise<string> {
    return this.jwtService.sign(
      { sub: userId, type: 'CANCEL_DELETION' },
      { expiresIn: '30d' },
    );
  }

  /**
   * Enqueues password reset email with automatic retry.
   *
   * @remarks
   * Email includes:
   * - Reset link with secure token (valid for 1 hour)
   * - Instructions for password reset
   * - Warning about link expiration
   * - Support contact information
   *
   * This method is used by the "Forgot Password" feature.
   * For security, the same response is returned whether or not the email exists.
   *
   * **Retry Strategy:**
   * - Attempt 1: Immediate
   * - Attempt 2: After 1 minute
   * - Attempt 3: After 5 minutes
   * - Attempt 4: After 30 minutes
   *
   * @param email - User email address
   * @param userName - User display name
   * @param resetToken - Secure reset token
   * @returns Promise resolving when job is enqueued (not when email is sent)
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetToken: string,
  ): Promise<void> {
    const jobData: PasswordResetJobData = {
      email,
      userName,
      resetToken,
    };

    await this.emailQueue.add(PASSWORD_RESET_JOB, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    this.logger.log(`Password reset email enqueued for ${email}`);
  }

  /**
   * Sends password reset email directly (used by processor only).
   *
   * @internal
   * @param email - User email address
   * @param userName - User display name
   * @param resetToken - Secure reset token
   * @returns Promise resolving to messageId when email is sent
   */
  async sendPasswordResetEmailDirect(
    email: string,
    userName: string,
    resetToken: string,
  ): Promise<string> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'suporte@confenge.com.br',
    );

    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const templatePath = path.join(
      __dirname,
      'templates',
      'password-reset.hbs',
    );
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    const html = template({
      userName,
      resetUrl,
      supportEmail,
    });

    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        '"ETP Express" <noreply@confenge.com.br>',
      ),
      to: email,
      subject: 'Redefinir senha - ETP Express',
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Password reset email sent to ${email}: ${info.messageId}`);

    // Log email content in development if using test transporter
    if (info.message) {
      this.logger.debug(`Email content:\n${info.message.toString('utf8')}`);
    }

    return info.messageId;
  }

  /**
   * Enqueues generic email with automatic retry.
   *
   * @remarks
   * Generic method for sending custom emails with automatic retry.
   * Use specific methods (sendPasswordResetEmail, sendDeletionConfirmation) when available.
   *
   * This method is used by modules that need to send emails with custom content.
   *
   * **Retry Strategy:**
   * - Attempt 1: Immediate
   * - Attempt 2: After 1 minute
   * - Attempt 3: After 5 minutes
   * - Attempt 4: After 30 minutes
   *
   * @param options - Email options (to, subject, html)
   * @returns Promise resolving when job is enqueued (not when email is sent)
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const jobData: GenericEmailJobData = {
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    await this.emailQueue.add(GENERIC_EMAIL_JOB, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    });

    this.logger.log(`Generic email enqueued for ${options.to}`);
  }

  /**
   * Sends generic email directly (used by processor only).
   *
   * @internal
   * @param options - Email options (to, subject, html)
   * @returns Promise resolving to messageId when email is sent
   */
  async sendMailDirect(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<string> {
    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        '"ETP Express" <noreply@confenge.com.br>',
      ),
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);

    // Log email content in development if using test transporter
    if (info.message) {
      this.logger.debug(`Email content:\n${info.message.toString('utf8')}`);
    }

    return info.messageId;
  }
}
