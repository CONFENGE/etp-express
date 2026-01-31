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
 * Modalidade de Contratação enum for ContractPrice
 * Based on Lei 14.133/2021 procurement modalities
 */
export enum ContractPriceModalidade {
  PREGAO_ELETRONICO = 'PREGAO_ELETRONICO',
  PREGAO_PRESENCIAL = 'PREGAO_PRESENCIAL',
  CONCORRENCIA = 'CONCORRENCIA',
  DISPENSA = 'DISPENSA',
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
  LEILAO = 'LEILAO',
  DIALOGO_COMPETITIVO = 'DIALOGO_COMPETITIVO',
  CONCURSO = 'CONCURSO',
  CREDENCIAMENTO = 'CREDENCIAMENTO',
  OUTROS = 'OUTROS',
}

/**
 * Data source for ContractPrice
 */
export enum ContractPriceFonte {
  PNCP = 'PNCP',
  COMPRASGOV = 'COMPRASGOV',
}

/**
 * ContractPrice entity for storing homologated (real) prices from public procurements.
 *
 * This entity stores price data from completed procurements (not estimates),
 * enabling market intelligence features like:
 * - Regional price benchmarks
 * - Overprice alerts
 * - Historical price analysis
 *
 * Data Sources:
 * - PNCP (Portal Nacional de Contratações Públicas) - Lei 14.133/2021
 * - Compras.gov.br (SIASG) - Federal procurement system
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - organizationId is nullable for backward compatibility
 * - New records should always include organizationId
 *
 * Legal Basis:
 * - Lei 14.133/2021 Art. 23 (Price Research)
 * - IN SEGES/ME nº 65/2021 (Price Research Methodology)
 *
 * @see ContractPriceCollectorService for data collection
 * @see Issue #1269 for M13: Market Intelligence implementation
 */
@Entity('contract_prices')
@Index('IDX_contract_prices_organization_createdAt', [
  'organizationId',
  'createdAt',
])
@Index('IDX_contract_prices_uf_dataHomologacao', ['uf', 'dataHomologacao'])
export class ContractPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Organization ID for multi-tenancy isolation.
   * Nullable for backward compatibility.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index('IDX_contract_prices_organizationId')
  organizationId: string | null;

  /**
   * Organization relation (Multi-Tenancy).
   */
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  // ============ Item Information ============

  /**
   * Item code from source system (e.g., CATMAT, CATSER, item number)
   */
  @Column({ type: 'varchar', length: 100 })
  @Index('IDX_contract_prices_codigoItem')
  codigoItem: string;

  /**
   * Item description
   */
  @Column({ type: 'text' })
  descricao: string;

  /**
   * Unit of measurement (e.g., UN, KG, M2, HORA, LITRO)
   */
  @Column({ type: 'varchar', length: 50 })
  unidade: string;

  /**
   * Unit price (homologated/real price)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  precoUnitario: number;

  /**
   * Quantity purchased
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantidade: number;

  /**
   * Total value (precoUnitario * quantidade)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valorTotal: number;

  /**
   * Homologation date (when the price was officially approved)
   */
  @Column({ type: 'date' })
  @Index('IDX_contract_prices_dataHomologacao')
  dataHomologacao: Date;

  // ============ Procurement Information ============

  /**
   * Procurement modality
   */
  @Column({
    type: 'enum',
    enum: ContractPriceModalidade,
    default: ContractPriceModalidade.OUTROS,
  })
  @Index('IDX_contract_prices_modalidade')
  modalidade: ContractPriceModalidade;

  /**
   * Data source
   */
  @Column({
    type: 'enum',
    enum: ContractPriceFonte,
    default: ContractPriceFonte.PNCP,
  })
  @Index('IDX_contract_prices_fonte')
  fonte: ContractPriceFonte;

  /**
   * External ID from source system (numeroControlePNCP or similar)
   */
  @Column({ type: 'varchar', length: 100 })
  @Index('IDX_contract_prices_externalId')
  externalId: string;

  // ============ Contracting Agency ============

  /**
   * UASG code (Unidade Administrativa de Serviços Gerais)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  uasgCodigo: string | null;

  /**
   * Contracting agency name
   */
  @Column({ type: 'varchar', length: 500 })
  uasgNome: string;

  /**
   * Brazilian state (UF) - 2-letter code
   */
  @Column({ type: 'char', length: 2 })
  @Index('IDX_contract_prices_uf')
  uf: string;

  /**
   * Municipality name
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  municipio: string | null;

  // ============ Supplier Information ============

  /**
   * Supplier CNPJ (14 digits, no formatting)
   */
  @Column({ type: 'varchar', length: 14, nullable: true })
  @Index('IDX_contract_prices_cnpjFornecedor')
  cnpjFornecedor: string | null;

  /**
   * Supplier company name
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  razaoSocial: string | null;

  // ============ Process Information ============

  /**
   * Process number (número do processo licitatório)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('IDX_contract_prices_numeroProcesso')
  numeroProcesso: string | null;

  /**
   * URL to original source
   */
  @Column({ type: 'text', nullable: true })
  urlOrigem: string | null;

  /**
   * Additional metadata (JSONB for flexibility)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    marca?: string;
    modelo?: string;
    tipoContrato?: string;
    codigoCatmat?: string;
    codigoCatser?: string;
    situacaoItem?: string;
    objetoContrato?: string;
    [key: string]: unknown;
  } | null;

  /**
   * Timestamp when the record was fetched from the source
   */
  @Column({ type: 'timestamp' })
  fetchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
