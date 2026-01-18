import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

/**
 * Item category type enum based on Brazilian government catalogs.
 * CATMAT = Catalog of Materials
 * CATSER = Catalog of Services
 */
export enum ItemCategoryType {
  CATMAT = 'CATMAT',
  CATSER = 'CATSER',
}

/**
 * ItemCategory entity for storing item taxonomy based on CATMAT/CATSER.
 *
 * This entity enables Market Intelligence features (#1270):
 * - Normalize item descriptions across different agencies
 * - Group similar items for price benchmarking
 * - Enable AI-powered item classification
 *
 * Data Sources:
 * - CATMAT (Catálogo de Materiais) - ComprasNet
 * - CATSER (Catálogo de Serviços) - ComprasNet
 *
 * Legal Basis:
 * - Decreto 7.892/2013 (Sistema de Registro de Preços)
 * - Portaria SEGES 938/2022 (Catálogos de materiais e serviços)
 *
 * @see ItemNormalizationService for item classification
 * @see Issue #1602 for implementation
 * @see Issue #1270 for parent epic (M13: Market Intelligence)
 */
@Entity('item_categories')
@Index('IDX_item_categories_code', ['code'], { unique: true })
@Index('IDX_item_categories_type', ['type'])
@Index('IDX_item_categories_parentCode', ['parentCode'])
@Index('IDX_item_categories_active', ['active'])
export class ItemCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Category code from CATMAT/CATSER.
   * Format: TYPE-XXXXX (e.g., CATMAT-44122, CATSER-10391)
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  /**
   * Category name/description.
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Category type: CATMAT (materials) or CATSER (services).
   */
  @Column({
    type: 'enum',
    enum: ItemCategoryType,
  })
  type: ItemCategoryType;

  /**
   * Parent category code for hierarchical structure.
   * Null for root categories.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  parentCode: string | null;

  /**
   * Parent category relation.
   */
  @ManyToOne(() => ItemCategory, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentCode', referencedColumnName: 'code' })
  parent: ItemCategory | null;

  /**
   * Child categories.
   */
  @OneToMany(() => ItemCategory, (category) => category.parent)
  children: ItemCategory[];

  /**
   * Detailed description of what items belong to this category.
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Hierarchy level (0 = root, 1 = first level, etc.).
   */
  @Column({ type: 'int', default: 0 })
  level: number;

  /**
   * Keywords for AI-based item matching.
   * Used by ItemNormalizationService for classification.
   */
  @Column({ type: 'simple-array', nullable: true })
  keywords: string[] | null;

  /**
   * Common units of measurement for items in this category.
   * E.g., ['UN', 'PCT', 'CX'] for office supplies.
   */
  @Column({ type: 'simple-array', nullable: true })
  commonUnits: string[] | null;

  /**
   * Whether this category is active for classification.
   */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Number of items classified in this category.
   * Updated by NormalizationPipelineService.
   */
  @Column({ type: 'int', default: 0 })
  itemCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
