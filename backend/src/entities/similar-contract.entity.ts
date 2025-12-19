import {
 Entity,
 PrimaryGeneratedColumn,
 Column,
 CreateDateColumn,
 Index,
 ManyToOne,
 JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * SimilarContract entity for storing cached search results.
 * Used by SearchService to cache Exa API results for 30 days.
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - organizationId is nullable for backward compatibility with existing data
 * - New records must always include organizationId for proper tenant isolation
 * - SearchService will filter by organizationId to prevent cross-tenant data leakage
 *
 * @see SearchService for usage
 * @see Issue #650 for multi-tenancy implementation
 */
@Entity('similar_contracts')
@Index('IDX_similar_contracts_organization_createdAt', [
 'organizationId',
 'createdAt',
])
export class SimilarContract {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 /**
 * Organization ID for multi-tenancy isolation.
 * Nullable for backward compatibility with existing records.
 * New records MUST include organizationId via SearchService.
 *
 * Column-based isolation: Ensures search results are scoped to organization.
 */
 @Column({ type: 'uuid', nullable: true })
 @Index('IDX_similar_contracts_organizationId')
 organizationId: string | null;

 /**
 * Organization relation (Multi-Tenancy).
 * Loaded when needed for organization-specific queries.
 */
 @ManyToOne(() => Organization, { nullable: true })
 @JoinColumn({ name: 'organizationId' })
 organization: Organization | null;

 @Column()
 @Index()
 searchQuery: string;

 @Column()
 title: string;

 @Column({ type: 'text', nullable: true })
 description: string;

 @Column({ type: 'varchar', nullable: true })
 orgao: string;

 @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
 valor: number;

 @Column({ type: 'varchar', nullable: true })
 dataContratacao: string;

 @Column({ type: 'text', nullable: true })
 url: string;

 @Column({ type: 'text', nullable: true })
 fonte: string;

 @Column({ type: 'float', default: 0 })
 relevanceScore: number;

 @Column({ type: 'jsonb', nullable: true })
 metadata: {
 numeroProcesso?: string;
 modalidade?: string;
 vigencia?: string;
 fornecedor?: string;
 objeto?: string;
 [key: string]: unknown;
 };

 @CreateDateColumn()
 createdAt: Date;
}
