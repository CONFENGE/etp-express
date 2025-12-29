import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Etp } from './etp.entity';

export enum SectionType {
  INTRODUCAO = 'introducao',
  JUSTIFICATIVA = 'justificativa',
  DESCRICAO_SOLUCAO = 'descricao_solucao',
  REQUISITOS = 'requisitos',
  ESTIMATIVA_VALOR = 'estimativa_valor',
  ANALISE_RISCOS = 'analise_riscos',
  CRITERIOS_SELECAO = 'criterios_selecao',
  CRITERIOS_MEDICAO = 'criterios_medicao',
  ADEQUACAO_ORCAMENTARIA = 'adequacao_orcamentaria',
  DECLARACAO_VIABILIDADE = 'declaracao_viabilidade',
  CUSTOM = 'custom',
}

export enum SectionStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  GENERATED = 'generated',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
}

@Entity('etp_sections')
@Unique('UQ_section_etp_type', ['etpId', 'type'])
export class EtpSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SectionType,
  })
  type: SectionType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'text', nullable: true })
  userInput: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  @Column({
    type: 'enum',
    enum: SectionStatus,
    default: SectionStatus.PENDING,
  })
  status: SectionStatus;

  @Column({ default: 1 })
  order: number;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    tokens?: number;
    model?: string;
    temperature?: number;
    generationTime?: number;
    agentsUsed?: string[];
    similarContracts?: unknown[];
    [key: string]: unknown;
  };

  @Column({ type: 'jsonb', nullable: true })
  validationResults: {
    legalCompliance?: boolean;
    clarityScore?: number;
    hallucinationCheck?: boolean;
    warnings?: string[];
    suggestions?: string[];
  };

  @ManyToOne(() => Etp, (etp) => etp.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etp_id' })
  etp: Etp;

  @Column({ name: 'etp_id' })
  etpId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
