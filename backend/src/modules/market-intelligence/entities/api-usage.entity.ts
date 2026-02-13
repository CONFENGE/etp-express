import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../entities/user.entity';

/**
 * ApiUsage Entity
 *
 * Tracks usage of the public Market Intelligence API for metrics and billing.
 * Records every API request with performance metrics and quota consumption.
 *
 * LGPD Compliance (TD-008):
 * - IP addresses are anonymized after retention period (default: 30 days)
 * - Art. 12 para. 2: IP + userId = linked personal data
 * - Anonymization uses SHA-256 hash via PostgreSQL function
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1688 - Criar ApiUsage entity e tracking de métricas
 * - Issue: #1723 - TD-008: Database schema improvements & LGPD compliance
 */
@Entity('api_usage')
@Index(['user', 'createdAt'])
@Index(['endpoint'])
@Index(['createdAt', 'ipAnonymizedAt'], { where: '"ipAddress" IS NOT NULL' })
export class ApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @Index()
  user: User;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column()
  statusCode: number;

  @Column()
  responseTime: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @Column()
  quota: number;

  /**
   * IP address of the client.
   * LGPD Art. 12: Anonymized after retention period (default: 30 days)
   */
  @Column({ type: 'varchar', length: '64', nullable: true })
  ipAddress: string | null;

  /**
   * Timestamp when IP was anonymized (null if still original).
   * Used for LGPD compliance tracking.
   */
  @Column({ type: 'timestamp', nullable: true })
  ipAnonymizedAt: Date | null;

  /**
   * Number of days to retain original IP before anonymization.
   * Default: 30 days for API analytics.
   */
  @Column({ type: 'int', default: 30 })
  ipRetentionDays: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
