import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SecretAccessStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  UNAUTHORIZED = 'unauthorized',
}

@Entity('secret_access_logs')
@Index('idx_secret_access_logs_name_accessed', ['secretName', 'accessedAt'])
@Index('idx_secret_access_logs_status', ['status'])
export class SecretAccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  secretName: string; // Ex: JWT_SECRET, OPENAI_API_KEY

  @Column()
  accessedBy: string; // Service/context that accessed

  /**
   * IP address of the client.
   * LGPD Art. 12: Anonymized after retention period (default: 90 days)
   * for security investigation purposes.
   */
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  /**
   * Timestamp when IP was anonymized (null if still original).
   * Used for LGPD compliance tracking.
   */
  @Column({ type: 'timestamp', nullable: true })
  ipAnonymizedAt: Date | null;

  /**
   * Number of days to retain original IP before anonymization.
   * Default: 90 days for secret access logs (security requirement).
   */
  @Column({ type: 'int', default: 90 })
  ipRetentionDays: number;

  @CreateDateColumn()
  accessedAt: Date;

  @Column({
    type: 'enum',
    enum: SecretAccessStatus,
    default: SecretAccessStatus.SUCCESS,
  })
  status: SecretAccessStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}
