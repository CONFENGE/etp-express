import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ComplianceChecklist } from './compliance-checklist.entity';

/**
 * Tipo do item do checklist (obrigatorio, recomendado, opcional).
 * Issue #1383 - Entity ComplianceChecklistItem
 */
export enum ChecklistItemType {
  MANDATORY = 'MANDATORY',
  RECOMMENDED = 'RECOMMENDED',
  OPTIONAL = 'OPTIONAL',
}

/**
 * Categoria do item para agrupamento e filtragem.
 */
export enum ChecklistItemCategory {
  IDENTIFICATION = 'IDENTIFICATION',
  JUSTIFICATION = 'JUSTIFICATION',
  REQUIREMENTS = 'REQUIREMENTS',
  PRICING = 'PRICING',
  RISKS = 'RISKS',
  CONCLUSION = 'CONCLUSION',
  DOCUMENTATION = 'DOCUMENTATION',
}

/**
 * Item individual de um checklist de conformidade.
 *
 * Cada item representa um requisito especifico que deve ser
 * verificado no ETP para garantir conformidade com TCU/TCE.
 *
 * Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 *
 * @see COMMON_REJECTIONS.md - Baseado nos motivos de rejeicao REJ-001 a REJ-010
 */
@Entity('compliance_checklist_items')
export class ComplianceChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referencia ao checklist pai.
   */
  @ManyToOne(() => ComplianceChecklist, (checklist) => checklist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'checklistId' })
  checklist: ComplianceChecklist;

  @Column({ type: 'uuid' })
  checklistId: string;

  /**
   * Nome/titulo curto do requisito.
   * Ex: "Justificativa de necessidade"
   */
  @Column({ length: 200 })
  requirement: string;

  /**
   * Descricao detalhada do que deve ser verificado.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Tipo do item: MANDATORY, RECOMMENDED, OPTIONAL.
   * MANDATORY: Obrigatorio por lei (ex: Art. 18 Lei 14.133)
   * RECOMMENDED: Recomendado por boas praticas TCU
   * OPTIONAL: Opcional, mas agrega valor
   */
  @Column({
    type: 'enum',
    enum: ChecklistItemType,
    default: ChecklistItemType.RECOMMENDED,
  })
  type: ChecklistItemType;

  /**
   * Categoria do item para agrupamento.
   */
  @Column({
    type: 'enum',
    enum: ChecklistItemCategory,
    default: ChecklistItemCategory.JUSTIFICATION,
  })
  category: ChecklistItemCategory;

  /**
   * Peso do item no calculo do score (1-100).
   * Itens MANDATORY geralmente tem peso maior.
   * Soma dos pesos de todos itens deve ser 100.
   */
  @Column({ type: 'int', default: 10 })
  weight: number;

  /**
   * Campo(s) do ETP onde este requisito deve estar presente.
   * Ex: "justificativaContratacao", "descricaoDetalhada"
   * Multiplos campos separados por virgula.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  etpFieldsRequired: string;

  /**
   * Secao do ETP onde o requisito deve ser verificado.
   * Ex: "1", "2.1", "Justificativa"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  sectionRequired: string;

  /**
   * Palavras-chave para validacao automatica.
   * O sistema verifica se o texto do ETP contem essas palavras.
   * Formato JSON array: ["necessidade", "demanda", "interesse publico"]
   */
  @Column({ type: 'jsonb', nullable: true })
  keywords: string[];

  /**
   * Expressao regular para validacao avancada (opcional).
   * Ex: "\\d{4}/\\d{2}" para validar formato de data
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  validationRegex: string;

  /**
   * Comprimento minimo de texto exigido (em caracteres).
   * Ex: 50 para justificativas que precisam de conteudo substancial
   */
  @Column({ type: 'int', nullable: true })
  minLength: number;

  /**
   * Sugestao de como corrigir quando o item falha.
   * Exibido ao usuario para orientar a correcao.
   */
  @Column({ type: 'text', nullable: true })
  fixSuggestion: string;

  /**
   * Referencia legal especifica do requisito.
   * Ex: "Art. 18, par. 1o, I - Lei 14.133/2021"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  legalReference: string;

  /**
   * Codigo de rejeicao associado (da documentacao).
   * Ex: "REJ-001" para justificativa generica
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  rejectionCode: string;

  /**
   * Ordem de exibicao do item no checklist.
   */
  @Column({ type: 'int', default: 0 })
  order: number;

  /**
   * Indica se o item esta ativo.
   */
  @Column({ default: true })
  isActive: boolean;
}
