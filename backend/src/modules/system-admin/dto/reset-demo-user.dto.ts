import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO for resetting a demo user account.
 * Part of Demo User Management System (Issue #1440).
 */
export class ResetDemoUserDto {
  /**
   * If true, generates a new password for the user.
   * Defaults to false (keeps existing password).
   */
  @IsOptional()
  @IsBoolean({ message: 'regeneratePassword deve ser um booleano' })
  regeneratePassword?: boolean;
}
