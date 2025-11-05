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

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  etpId: string;

  @Column({ type: 'jsonb', nullable: true })
  properties: {
    duration?: number;
    success?: boolean;
    errorMessage?: string;
    sectionType?: string;
    exportFormat?: string;
    searchQuery?: string;
    [key: string]: any;
  };

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referer: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
