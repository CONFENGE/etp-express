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
import { ContractPrice } from './contract-price.entity';
import { ItemCategory } from './item-category.entity';

/**
 * Classification method enum for NormalizedContractItem.
 * Tracks how the item was classified.
 */
export enum ClassificationMethod {
  SOURCE = 'source',
  LLM = 'llm',
  SIMILARITY = 'similarity',
  MANUAL = 'manual',
}

/**
 * NormalizedContractItem entity for storing normalized contract items.
 *
 * This entity is the output of the NormalizationPipelineService and stores:
 * - Normalized item descriptions
 * - Category assignments (CATMAT/CATSER)
 * - Confidence scores
 * - Manual review status
 *
 * Key features:
 * - Links original ContractPrice to normalized data
 * - Tracks classification method and confidence
 * - Supports manual review workflow
 * - Enables regional price benchmarking by category
 *
 * Part of M13: Market Intelligence milestone.
 *
 * @see NormalizationPipelineService for batch processing
 * @see ItemNormalizationService for classification logic
 * @see Issue #1605 for implementation
 * @see Issue #1270 for parent epic
 */
@Entity('normalized_contract_items')
@Index('IDX_normalized_contract_items_category', ['categoryId'])
@Index('IDX_normalized_contract_items_confidence', ['confidence'])
@Index('IDX_normalized_contract_items_requiresReview', ['requiresReview'])
@Index('IDX_normalized_contract_items_createdAt', ['createdAt'])
export class NormalizedContractItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Reference to the original ContractPrice record.
   */
  @Column({ type: 'uuid' })
  @Index('IDX_normalized_contract_items_originalItemId')
  originalItemId: string;

  @ManyToOne(() => ContractPrice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'originalItemId' })
  originalItem: ContractPrice;

  /**
   * Reference to the assigned ItemCategory.
   * Null if classification failed or requires manual review.
   */
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => ItemCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory | null;

  /**
   * Normalized item description (cleaned and standardized).
   */
  @Column({ type: 'text' })
  normalizedDescription: string;

  /**
   * Normalized unit of measurement (e.g., UN, KG, M2).
   */
  @Column({ type: 'varchar', length: 20 })
  normalizedUnit: string;

  /**
   * Original unit price from ContractPrice (copied for quick access).
   */
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  normalizedPrice: number;

  /**
   * Confidence score of the classification (0.0 to 1.0).
   * - 1.0: Exact match from source (CATMAT/CATSER code)
   * - 0.8-0.99: High confidence LLM classification
   * - 0.5-0.79: Medium confidence, may need review
   * - < 0.5: Low confidence, requires manual review
   */
  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number;

  /**
   * Classification method used.
   */
  @Column({
    type: 'enum',
    enum: ClassificationMethod,
    default: ClassificationMethod.LLM,
  })
  classificationMethod: ClassificationMethod;

  /**
   * Whether this item requires manual review.
   * True when confidence < 0.5 or category is null.
   */
  @Column({ type: 'boolean', default: false })
  requiresReview: boolean;

  /**
   * Whether this item has been manually reviewed.
   */
  @Column({ type: 'boolean', default: false })
  manuallyReviewed: boolean;

  /**
   * User ID who reviewed the item (if manually reviewed).
   */
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  /**
   * Timestamp of manual review.
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  /**
   * Notes from the classification or review process.
   */
  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  /**
   * Keywords extracted from the original description.
   * Stored for debugging and improving classification.
   */
  @Column({ type: 'simple-array', nullable: true })
  keywords: string[] | null;

  /**
   * Estimated category type from heuristics (material or servico).
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  estimatedType: 'material' | 'servico' | null;

  /**
   * Processing time in milliseconds.
   */
  @Column({ type: 'int', nullable: true })
  processingTimeMs: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
