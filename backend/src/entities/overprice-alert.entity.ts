import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Etp } from './etp.entity';
import { ItemCategory } from './item-category.entity';

/**
 * Alert level enum for overprice detection.
 * Based on deviation percentage from median benchmark.
 *
 * Thresholds (configurable via environment):
 * - OK: 0-20% above median
 * - ATTENTION: 20-40% above median
 * - WARNING: 40-60% above median
 * - CRITICAL: >60% above median
 */
export enum AlertLevel {
  /** Price is within acceptable range (0-20% above median) */
  OK = 'OK',
  /** Attention: Price is 20-40% above median */
  ATTENTION = 'ATTENTION',
  /** Warning: Price is 40-60% above median - TCE may notice */
  WARNING = 'WARNING',
  /** Critical: Price is >60% above median - High risk of TCE questioning */
  CRITICAL = 'CRITICAL',
}

/**
 * OverpriceAlert entity for tracking price alerts during ETP creation.
 *
 * This entity enables overprice detection features (#1272):
 * - Real-time price alerts during ETP editing
 * - Audit trail of price checks performed
 * - Acknowledgment tracking for user accountability
 *
 * Use Cases:
 * - User enters a price in ETP form
 * - System checks against regional benchmark
 * - Alert is generated if price exceeds thresholds
 * - Alert is persisted for audit purposes
 * - User can acknowledge the alert
 *
 * Legal Basis:
 * - Lei 14.133/2021 Art. 23 (Price Research requirement)
 * - TCU Acórdão 2.083/2014 (Overprice detection)
 *
 * @see OverpriceAlertService for business logic
 * @see Issue #1272 for implementation
 * @see Issue #1268 for parent epic (M13: Market Intelligence)
 */
@Entity('overprice_alerts')
@Index('IDX_overprice_alerts_etpId', ['etpId'])
@Index('IDX_overprice_alerts_alertLevel', ['alertLevel'])
@Index('IDX_overprice_alerts_createdAt', ['createdAt'])
@Index('IDX_overprice_alerts_categoryId', ['categoryId'])
export class OverpriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the ETP where this alert was generated.
   * Optional - alerts can be generated before ETP association.
   */
  @Column({ type: 'uuid', nullable: true })
  etpId: string | null;

  @ManyToOne(() => Etp, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'etpId' })
  etp: Etp | null;

  /**
   * Reference to the ItemCategory (CATMAT/CATSER).
   * Optional if using item description matching.
   */
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => ItemCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory | null;

  /**
   * Item code (e.g., CATMAT code, custom code).
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  itemCode: string | null;

  /**
   * Item description as entered by the user.
   */
  @Column({ type: 'text' })
  itemDescription: string;

  /**
   * Price informed by the user.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  informedPrice: number;

  /**
   * Median price from the benchmark.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  medianPrice: number;

  /**
   * Percentage above the median (can be negative if below).
   */
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  percentageAbove: number;

  /**
   * Alert classification level.
   */
  @Column({
    type: 'enum',
    enum: AlertLevel,
    default: AlertLevel.OK,
  })
  alertLevel: AlertLevel;

  /**
   * Human-readable suggestion message.
   */
  @Column({ type: 'text' })
  suggestion: string;

  /**
   * Brazilian state (UF) used for benchmark lookup.
   */
  @Column({ type: 'char', length: 2 })
  uf: string;

  /**
   * Price range suggested (lower bound).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  suggestedPriceLow: number;

  /**
   * Price range suggested (upper bound).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  suggestedPriceHigh: number;

  /**
   * Number of samples used in the benchmark.
   */
  @Column({ type: 'int', default: 0 })
  benchmarkSampleCount: number;

  /**
   * When the user acknowledged the alert.
   * Null if not acknowledged yet.
   */
  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  /**
   * ID of user who acknowledged the alert.
   */
  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy: string | null;

  /**
   * Optional note from user when acknowledging.
   * E.g., justification for why they're proceeding with the price.
   */
  @Column({ type: 'text', nullable: true })
  acknowledgeNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
