import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

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

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', nullable: true })
  referer: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
