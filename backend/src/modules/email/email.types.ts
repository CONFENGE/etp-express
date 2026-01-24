/**
 * Email Queue Types and Constants
 *
 * BullMQ job definitions for transactional email delivery with automatic retry.
 *
 * @module modules/email
 * @see https://github.com/CONFENGE/etp-express/issues/1072
 */

/**
 * Email queue name constant
 */
export const EMAIL_QUEUE = 'email';

/**
 * Job name for account deletion confirmation emails
 */
export const DELETION_CONFIRMATION_JOB = 'deletion-confirmation';

/**
 * Job name for password reset emails
 */
export const PASSWORD_RESET_JOB = 'password-reset';

/**
 * Job name for generic emails
 */
export const GENERIC_EMAIL_JOB = 'generic-email';

/**
 * Job data for deletion confirmation email
 */
export interface DeletionConfirmationJobData {
  userId: string;
  email: string;
  userName: string;
  deletedAt: Date;
}

/**
 * Job data for password reset email
 */
export interface PasswordResetJobData {
  email: string;
  userName: string;
  resetToken: string;
}

/**
 * Job data for generic email
 */
export interface GenericEmailJobData {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email job result
 */
export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
