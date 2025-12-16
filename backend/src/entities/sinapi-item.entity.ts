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
import { Organization } from './organization.entity';

/**
 * SinapiItem entity for storing SINAPI price reference data.
 * SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil)
 * is the Brazilian national reference system for construction costs.
 *
 * Data Source: https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/
 * Legal Basis: Decreto 7.983/2013 (mandatory for federal public works)
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - organizationId is nullable for backward compatibility
 * - New records should always include organizationId
 *
 * @see SinapiService for data ingestion
 * @see Issue #693 for SINAPI implementation
 * @see Issue #697 for migrations
 */
@Entity('sinapi_items')
@Index('IDX_sinapi_items_organization_createdAt', [
  'organizationId',
  'createdAt',
])
export class SinapiItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Organization ID for multi-tenancy isolation.
   * Nullable for backward compatibility.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index('IDX_sinapi_items_organizationId')
  organizationId: string | null;

  /**
   * Organization relation (Multi-Tenancy).
   */
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  /**
   * SINAPI item code (e.g., "88267", "COMPOSICAO-12345")
   */
  @Column({ type: 'varchar', length: 50 })
  @Index('IDX_sinapi_items_codigo')
  codigo: string;

  /**
   * Item description (Portuguese full-text search enabled)
   */
  @Column({ type: 'text' })
  descricao: string;

  /**
   * Unit of measurement (e.g., "M3", "KG", "UN")
   */
  @Column({ type: 'varchar', length: 20 })
  unidade: string;

  /**
   * Unit price with taxes (onerado)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precoOnerado: number;

  /**
   * Unit price without taxes (desonerado)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  precoDesonerado: number;

  /**
   * Item type: INSUMO (input/material) or COMPOSICAO (composition/assembly)
   */
  @Column({
    type: 'enum',
    enum: ['INSUMO', 'COMPOSICAO'],
  })
  @Index('IDX_sinapi_items_tipo')
  tipo: 'INSUMO' | 'COMPOSICAO';

  /**
   * Brazilian state (UF) - 2-letter code
   */
  @Column({ type: 'char', length: 2 })
  @Index('IDX_sinapi_items_uf')
  uf: string;

  /**
   * Reference month (1-12)
   */
  @Column({ type: 'int' })
  mesReferencia: number;

  /**
   * Reference year (e.g., 2024)
   */
  @Column({ type: 'int' })
  @Index('IDX_sinapi_items_ano_mes', { synchronize: false })
  anoReferencia: number;

  /**
   * Class ID (optional, for categorization)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  classeId: string | null;

  /**
   * Class description (optional)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  classeDescricao: string | null;

  /**
   * Additional metadata (JSONB for flexibility)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    custoMaoDeObra?: number;
    custoMaterial?: number;
    custoEquipamento?: number;
    categoria?: string;
    [key: string]: unknown;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
