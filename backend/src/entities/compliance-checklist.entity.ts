import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ComplianceChecklistItem } from './compliance-checklist-item.entity';
import { EtpTemplateType } from './etp-template.entity';

/**
 * Padrao de conformidade (TCU, TCE estadual, etc).
 * Issue #1383 - Entity ComplianceChecklist
 */
export enum ComplianceStandard {
  TCU = 'TCU',
  TCE_SP = 'TCE_SP',
  TCE_RJ = 'TCE_RJ',
  TCE_MG = 'TCE_MG',
  TCE_RS = 'TCE_RS',
  GENERIC = 'GENERIC',
}

/**
 * Checklist de conformidade para validacao de ETPs.
 *
 * Armazena os requisitos de conformidade baseados em padroes do TCU/TCE,
 * permitindo validar se um ETP atende aos criterios necessarios antes
 * de prosseguir com o processo licitatorio.
 *
 * Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * @see TCU_REQUIREMENTS.md - Documentacao de requisitos TCU
 * @see COMMON_REJECTIONS.md - Motivos comuns de rejeicao
 */
@Entity('compliance_checklists')
export class ComplianceChecklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do checklist.
   * Ex: "TCU - Obras", "TCU - TI", "TCE-SP - Servicos"
   */
  @Column({ length: 200 })
  name: string;

  /**
   * Descricao do proposito do checklist.
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Padrao de conformidade (TCU, TCE estadual).
   */
  @Column({
    type: 'enum',
    enum: ComplianceStandard,
    default: ComplianceStandard.TCU,
  })
  standard: ComplianceStandard;

  /**
   * Tipo de ETP ao qual este checklist se aplica.
   * Ex: OBRAS, TI, SERVICOS, MATERIAIS
   */
  @Column({
    type: 'enum',
    enum: EtpTemplateType,
  })
  templateType: EtpTemplateType;

  /**
   * Fundamentacao legal do checklist.
   * Ex: "Art. 18, Lei 14.133/2021; IN SEGES 58/2022"
   */
  @Column({ type: 'text', nullable: true })
  legalBasis: string;

  /**
   * Versao do checklist (para rastreabilidade de atualizacoes).
   */
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  /**
   * Score minimo para aprovacao (0-100).
   * ETPs com score abaixo sao considerados nao conformes.
   * Default: 70 (padrao TCU)
   */
  @Column({ type: 'int', default: 70 })
  minimumScore: number;

  /**
   * Indica se o checklist esta ativo e disponivel para uso.
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Itens do checklist (requisitos individuais).
   */
  @OneToMany(() => ComplianceChecklistItem, (item) => item.checklist, {
    cascade: true,
    eager: true,
  })
  items: ComplianceChecklistItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
