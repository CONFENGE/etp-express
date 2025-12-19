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
 * SicroItem entity for storing SICRO price reference data.
 * SICRO (Sistema de Custos Referenciais de Obras) is the Brazilian
 * national reference system for transportation infrastructure costs.
 *
 * Data Source: https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/
 * Managed by: DNIT (Departamento Nacional de Infraestrutura de Transportes)
 * Mandatory for: Works bid by DNIT
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - organizationId is nullable for backward compatibility
 * - New records should always include organizationId
 *
 * @see SicroService for data ingestion
 * @see Issue #694 for SICRO implementation
 * @see Issue #697 for migrations
 */
@Entity('sicro_items')
@Index('IDX_sicro_items_organization_createdAt', [
  'organizationId',
  'createdAt',
])
export class SicroItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Organization ID for multi-tenancy isolation.
   * Nullable for backward compatibility.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index('IDX_sicro_items_organizationId')
  organizationId: string | null;

  /**
   * Organization relation (Multi-Tenancy).
   */
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  /**
   * SICRO item code (e.g., "01.001.001")
   */
  @Column({ type: 'varchar', length: 50 })
  @Index('IDX_sicro_items_codigo')
  codigo: string;

  /**
   * Item description (Portuguese full-text search enabled)
   */
  @Column({ type: 'text' })
  descricao: string;

  /**
   * Unit of measurement (e.g., "M3", "KG", "KM")
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
   * Item type: INSUMO (input) or COMPOSICAO (composition/service)
   */
  @Column({
    type: 'enum',
    enum: ['INSUMO', 'COMPOSICAO'],
  })
  @Index('IDX_sicro_items_tipo')
  tipo: 'INSUMO' | 'COMPOSICAO';

  /**
   * Brazilian state (UF) - 2-letter code
   */
  @Column({ type: 'char', length: 2 })
  @Index('IDX_sicro_items_uf')
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
  @Index('IDX_sicro_items_ano_mes', { synchronize: false })
  anoReferencia: number;

  /**
   * Category ID (optional, for SICRO categorization)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  categoriaId: string | null;

  /**
   * Category description (e.g., "TERRAPLANAGEM", "PAVIMENTACAO")
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  categoriaDescricao: string | null;

  /**
   * Transport mode: RODOVIARIO, AQUAVIARIO, or FERROVIARIO
   */
  @Column({
    type: 'enum',
    enum: ['RODOVIARIO', 'AQUAVIARIO', 'FERROVIARIO'],
    nullable: true,
  })
  @Index('IDX_sicro_items_modo_transporte')
  modoTransporte: 'RODOVIARIO' | 'AQUAVIARIO' | 'FERROVIARIO' | null;

  /**
   * Additional metadata (JSONB for flexibility)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    custoMaoDeObra?: number;
    custoMaterial?: number;
    custoEquipamento?: number;
    custoTransporte?: number;
    categoria?: string;
    [key: string]: unknown;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
