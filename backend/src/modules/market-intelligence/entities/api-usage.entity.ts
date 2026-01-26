import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../entities/user.entity';

/**
 * ApiUsage Entity
 *
 * Tracks usage of the public Market Intelligence API for metrics and billing.
 * Records every API request with performance metrics and quota consumption.
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1688 - Criar ApiUsage entity e tracking de métricas
 */
@Entity()
@Index(['user', 'createdAt'])
@Index(['endpoint'])
export class ApiUsage {
  @PrimaryGeneratedColumn()
  id: number;

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
}
