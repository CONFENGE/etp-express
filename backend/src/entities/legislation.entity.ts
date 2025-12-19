import {
 Entity,
 PrimaryGeneratedColumn,
 Column,
 CreateDateColumn,
 UpdateDateColumn,
 Index,
} from 'typeorm';

export enum LegislationType {
 LEI = 'lei',
 DECRETO = 'decreto',
 PORTARIA = 'portaria',
 INSTRUCAO_NORMATIVA = 'in',
 RESOLUCAO = 'resolucao',
 MEDIDA_PROVISORIA = 'mp',
}

export interface LegislationArticle {
 number: string;
 content: string;
 /** Optional for inciso, paragraph, etc. */
 subsection?: string;
}

/**
 * Legislation entity for RAG (Retrieval-Augmented Generation).
 * Stores Brazilian legal documents with vector embeddings for semantic search.
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */
@Entity('legislation')
export class Legislation {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 /**
 * Type of legislation (lei, decreto, portaria, etc.)
 */
 @Column({
 type: 'enum',
 enum: LegislationType,
 })
 @Index()
 type: LegislationType;

 /**
 * Legislation number (e.g., "14.133" for Lei 14.133)
 */
 @Column()
 @Index()
 number: string;

 /**
 * Year of publication (e.g., 2021 for Lei 14.133/2021)
 */
 @Column({ type: 'int' })
 @Index()
 year: number;

 /**
 * Official title of the legislation
 */
 @Column({ type: 'text' })
 title: string;

 /**
 * Full content of the legislation
 */
 @Column({ type: 'text' })
 content: string;

 /**
 * OpenAI embedding vector (1536 dimensions for text-embedding-3-small)
 * Stored as pgvector type for semantic similarity search
 *
 * Generated from: `${type} ${number}/${year}: ${title}`
 */
 @Column({
 type: 'vector',
 length: 1536,
 nullable: true,
 })
 embedding: string; // TypeORM represents vector as string

 /**
 * Structured articles for granular retrieval
 * Stored as JSONB for efficient querying
 */
 @Column({ type: 'jsonb', nullable: true })
 articles: LegislationArticle[];

 /**
 * Source URL for verification
 */
 @Column({ type: 'text', nullable: true })
 sourceUrl: string | null;

 /**
 * Whether this legislation is currently in force
 */
 @Column({ default: true })
 isActive: boolean;

 @CreateDateColumn()
 createdAt: Date;

 @UpdateDateColumn()
 updatedAt: Date;

 /**
 * Helper to get formatted reference (e.g., "Lei 14.133/2021")
 */
 getFormattedReference(): string {
 const typeMap: Record<LegislationType, string> = {
 [LegislationType.LEI]: 'Lei',
 [LegislationType.DECRETO]: 'Decreto',
 [LegislationType.PORTARIA]: 'Portaria',
 [LegislationType.INSTRUCAO_NORMATIVA]: 'IN',
 [LegislationType.RESOLUCAO]: 'Resolução',
 [LegislationType.MEDIDA_PROVISORIA]: 'MP',
 };

 return `${typeMap[this.type]} ${this.number}/${this.year}`;
 }
}
