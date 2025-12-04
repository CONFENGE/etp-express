import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('similar_contracts')
export class SimilarContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
