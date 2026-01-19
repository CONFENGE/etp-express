import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ItemCategory } from './item-category.entity';

/**
 * Organization size enum based on annual budget.
 * Used for segmenting price benchmarks by purchasing power.
 */
export enum OrgaoPorte {
  /** Small: Annual budget < R$ 10M */
  PEQUENO = 'PEQUENO',
  /** Medium: Annual budget R$ 10M - R$ 100M */
  MEDIO = 'MEDIO',
  /** Large: Annual budget > R$ 100M */
  GRANDE = 'GRANDE',
  /** All sizes combined */
  TODOS = 'TODOS',
}

/**
 * PriceBenchmark entity for storing aggregated regional price statistics.
 *
 * This entity enables Market Intelligence features (#1271):
 * - Regional price benchmarks by category and UF
 * - Overprice detection (compare input vs benchmark)
 * - Historical price trends analysis
 *
 * Key Statistics:
 * - Mean (avgPrice), Median (medianPrice)
 * - Percentiles (P25, P75) for range detection
 * - Standard deviation for variability analysis
 *
 * Segmentation:
 * - By ItemCategory (CATMAT/CATSER)
 * - By UF (27 states + 'BR' for national)
 * - By OrgaoPorte (small/medium/large)
 *
 * Legal Basis:
 * - Lei 14.133/2021 Art. 23 (Price Research)
 * - IN SEGES/ME nº 65/2021 (Methodology)
 *
 * @see RegionalBenchmarkService for calculation logic
 * @see Issue #1271 for implementation
 * @see Issue #1268 for parent epic (M13: Market Intelligence)
 */
@Entity('price_benchmarks')
@Unique('UQ_price_benchmarks_category_uf_porte', [
  'categoryId',
  'uf',
  'orgaoPorte',
])
@Index('IDX_price_benchmarks_categoryId', ['categoryId'])
@Index('IDX_price_benchmarks_uf', ['uf'])
@Index('IDX_price_benchmarks_calculatedAt', ['calculatedAt'])
export class PriceBenchmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the ItemCategory.
   */
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => ItemCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  /**
   * Brazilian state (UF) - 2-letter code.
   * Use 'BR' for national benchmark (all states combined).
   */
  @Column({ type: 'char', length: 2 })
  uf: string;

  /**
   * Organization size segment.
   * Use 'TODOS' for combined benchmark.
   */
  @Column({
    type: 'enum',
    enum: OrgaoPorte,
    default: OrgaoPorte.TODOS,
  })
  orgaoPorte: OrgaoPorte;

  // ============ Statistical Measures ============

  /**
   * Average (mean) price.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  avgPrice: number;

  /**
   * Median price (50th percentile).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  medianPrice: number;

  /**
   * Minimum price in the sample.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  minPrice: number;

  /**
   * Maximum price in the sample.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  maxPrice: number;

  /**
   * 25th percentile (Q1).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  p25: number;

  /**
   * 75th percentile (Q3).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  p75: number;

  /**
   * Standard deviation.
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  stdDev: number;

  /**
   * Number of price samples used in calculation.
   */
  @Column({ type: 'int' })
  sampleCount: number;

  /**
   * Normalized unit of measurement.
   */
  @Column({ type: 'varchar', length: 20 })
  unit: string;

  // ============ Period Information ============

  /**
   * Start of the analysis period.
   */
  @Column({ type: 'date' })
  periodStart: Date;

  /**
   * End of the analysis period.
   */
  @Column({ type: 'date' })
  periodEnd: Date;

  /**
   * When the benchmark was last calculated.
   */
  @Column({ type: 'timestamp' })
  calculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
