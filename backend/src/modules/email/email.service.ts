import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { addDays, format } from 'date-fns';
import { User } from '../../entities/user.entity';

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
   * Sends account deletion confirmation email with cancellation link.
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
   * @param user - User entity with deletedAt timestamp
   * @returns Promise resolving when email is sent
   */
  async sendDeletionConfirmation(user: User): Promise<void> {
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
      'suporte@etpexpress.com',
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
        '"ETP Express" <noreply@etpexpress.com>',
      ),
      to: user.email,
      subject: 'Confirmação de exclusão de conta - ETP Express',
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Deletion confirmation email sent to ${user.email}: ${info.messageId}`,
      );

      // Log email content in development if using test transporter
      if (info.message) {
        this.logger.debug(`Email content:\n${info.message.toString('utf8')}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send deletion confirmation email to ${user.email}`,
        error.stack,
      );
      throw error;
    }
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
}
