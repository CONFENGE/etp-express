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
 * GovContract entity for caching government contract search results.
 * Used by government API services (Compras.gov.br, PNCP) to cache
 * contract data for 30 days to reduce API calls.
 *
 * Data Sources:
 * - Compras.gov.br (SIASG) - Federal procurement system
 * - PNCP (Portal Nacional de Contratações Públicas) - Lei 14.133/2021
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - organizationId is nullable for backward compatibility
 * - New records should always include organizationId
 * - Cache is scoped per organization to prevent data leakage
 *
 * @see ComprasGovService for Compras.gov.br integration
 * @see PncpService for PNCP integration
 * @see Issue #691, #692 for API implementations
 * @see Issue #697 for migrations
 */
@Entity('gov_contracts')
@Index('IDX_gov_contracts_organization_createdAt', [
 'organizationId',
 'createdAt',
])
export class GovContract {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 /**
 * Organization ID for multi-tenancy isolation.
 * Nullable for backward compatibility.
 */
 @Column({ type: 'uuid', nullable: true })
 @Index('IDX_gov_contracts_organizationId')
 organizationId: string | null;

 /**
 * Organization relation (Multi-Tenancy).
 */
 @ManyToOne(() => Organization, { nullable: true })
 @JoinColumn({ name: 'organizationId' })
 organization: Organization | null;

 /**
 * Search query that generated this result (for cache key)
 */
 @Column({ type: 'text' })
 @Index('IDX_gov_contracts_searchQuery')
 searchQuery: string;

 /**
 * Data source: 'compras-gov', 'pncp', etc.
 */
 @Column({ type: 'varchar', length: 50 })
 @Index('IDX_gov_contracts_source')
 source: string;

 /**
 * External ID from the source system (if available)
 */
 @Column({ type: 'varchar', length: 100, nullable: true })
 @Index('IDX_gov_contracts_externalId')
 externalId: string | null;

 /**
 * Contract/Procurement title
 */
 @Column({ type: 'text' })
 title: string;

 /**
 * Contract description or object
 */
 @Column({ type: 'text', nullable: true })
 description: string | null;

 /**
 * Contracting agency/organ name
 */
 @Column({ type: 'varchar', length: 500, nullable: true })
 orgao: string | null;

 /**
 * CNPJ of the contracting agency
 */
 @Column({ type: 'varchar', length: 18, nullable: true })
 @Index('IDX_gov_contracts_cnpj')
 cnpj: string | null;

 /**
 * Contract value (total)
 */
 @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
 valor: number | null;

 /**
 * Contract date (data de contratação)
 */
 @Column({ type: 'varchar', length: 50, nullable: true })
 dataContratacao: string | null;

 /**
 * Procurement modality (e.g., "Pregão Eletrônico", "Dispensa")
 */
 @Column({ type: 'varchar', length: 100, nullable: true })
 modalidade: string | null;

 /**
 * Process number (número do processo licitatório)
 */
 @Column({ type: 'varchar', length: 100, nullable: true })
 @Index('IDX_gov_contracts_numeroProcesso')
 numeroProcesso: string | null;

 /**
 * Source URL (link to original contract/procurement)
 */
 @Column({ type: 'text', nullable: true })
 url: string | null;

 /**
 * Relevance score (0.0 - 1.0) from search ranking
 */
 @Column({ type: 'float', default: 0 })
 relevanceScore: number;

 /**
 * Additional metadata (JSONB for flexibility)
 */
 @Column({ type: 'jsonb', nullable: true })
 metadata: {
 vigencia?: string;
 fornecedor?: string;
 situacao?: string;
 objeto?: string;
 uf?: string;
 municipio?: string;
 [key: string]: unknown;
 } | null;

 @CreateDateColumn()
 createdAt: Date;

 @UpdateDateColumn()
 updatedAt: Date;
}
