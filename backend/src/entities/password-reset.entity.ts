import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Entity for password reset tokens.
 * Used by the "Forgot Password" feature to securely reset user passwords.
 *
 * Security features:
 * - Token is a cryptographically secure random string (32 bytes hex)
 * - Token expires after 1 hour (configurable)
 * - Token is deleted after successful password reset
 * - One active token per user (old tokens are invalidated)
 *
 * @see AuthService.forgotPassword
 * @see AuthService.resetPassword
 */
@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User ID for whom this reset token was generated.
   */
  @Column({ type: 'uuid' })
  @Index('IDX_password_resets_userId')
  userId: string;

  /**
   * Relation to the User entity.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Cryptographically secure reset token.
   * Generated using crypto.randomBytes(32).toString('hex').
   * Stored as hash for additional security.
   */
  @Column({ type: 'varchar', length: 255 })
  @Index('IDX_password_resets_token')
  token: string;

  /**
   * Token expiration timestamp.
   * Default: 1 hour from creation.
   */
  @Column({ type: 'timestamp' })
  @Index('IDX_password_resets_expiresAt')
  expiresAt: Date;

  /**
   * Whether this token has been used.
   * Prevents token reuse after password reset.
   */
  @Column({ type: 'boolean', default: false })
  used: boolean;

  /**
   * Timestamp when the reset was requested.
   */
  @CreateDateColumn()
  createdAt: Date;
}
