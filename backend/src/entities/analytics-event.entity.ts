import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  eventType: string;

  @Column()
  @Index()
  eventName: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  userId: string;

  /**
   * Organization ID for multi-tenancy isolation (Security Hardening - #648).
   * Ensures analytics events are filtered per organization.
   * Nullable for backward compatibility with existing records.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'varchar', nullable: true })
  etpId: string;

  @Column({ type: 'jsonb', nullable: true })
  properties: {
    duration?: number;
    success?: boolean;
    errorMessage?: string;
    sectionType?: string;
    exportFormat?: string;
    searchQuery?: string;
    [key: string]: unknown;
  };

  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  /**
   * IP address of the client.
   * LGPD Art. 12: Anonymized after retention period (default: 30 days)
   * via SHA-256 hash to protect privacy while preserving geographic analytics.
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
   * Default: 30 days for analytics events.
   */
  @Column({ type: 'int', default: 30 })
  ipRetentionDays: number;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', nullable: true })
  referer: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
