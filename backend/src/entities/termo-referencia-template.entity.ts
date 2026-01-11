import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tipo de contratacao para templates de Termo de Referencia.
 * Alinhado com EtpTemplateType para consistencia.
 *
 * Issue #1250 - [TR-c] Criar templates de TR por categoria
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export enum TrTemplateType {
  OBRAS = 'OBRAS',
  TI = 'TI',
  SERVICOS = 'SERVICOS',
  MATERIAIS = 'MATERIAIS',
}

/**
 * Configuracao de prompt de IA para enriquecimento de secoes do TR.
 */
export interface TrTemplatePrompt {
  /** Tipo da secao (ex: objeto, requisitos, modelo_execucao) */
  sectionType: string;
  /** Prompt de sistema para contexto da IA */
  systemPrompt: string;
  /** Template de prompt do usuario com placeholders */
  userPromptTemplate: string;
}

/**
 * Configuracao de campo especifico por tipo de contratacao.
 */
export interface TrTemplateField {
  /** Nome do campo */
  name: string;
  /** Label para exibicao */
  label: string;
  /** Tipo do campo (text, textarea, number, date, select) */
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  /** Se o campo e obrigatorio */
  required: boolean;
  /** Placeholder ou dica de preenchimento */
  placeholder?: string;
  /** Opcoes para campos do tipo select */
  options?: string[];
  /** Valor padrao */
  defaultValue?: string | number;
}

/**
 * Template pre-configurado de Termo de Referencia por tipo de contratacao.
 *
 * Facilita a geracao automatica de TR com campos e textos especificos
 * por categoria de contratacao (Obras, TI, Servicos, Materiais).
 *
 * Issue #1250 - [TR-c] Criar templates de TR por categoria
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 *
 * @see Lei 14.133/2021 - Nova Lei de Licitacoes
 * @see IN SEGES/ME n 40/2020 - Planejamento da contratacao
 */
@Entity('tr_templates')
export class TermoReferenciaTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do template.
   * Ex: "Template de TR para Obras de Engenharia"
   */
  @Column({ length: 200 })
  name: string;

  /**
   * Tipo de contratacao do template.
   */
  @Column({
    type: 'enum',
    enum: TrTemplateType,
  })
  type: TrTemplateType;

  /**
   * Descricao detalhada do template e quando utiliza-lo.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Campos especificos para este tipo de contratacao.
   * Configuracao completa com labels, tipos e validacoes.
   */
  @Column({ type: 'jsonb' })
  specificFields: TrTemplateField[];

  /**
   * Secoes padrao que devem ser incluidas no TR.
   * Lista ordenada de secoes obrigatorias.
   */
  @Column({ type: 'jsonb' })
  defaultSections: string[];

  /**
   * Prompts de IA especificos para cada secao do TR.
   * Usados durante geracao automatica para enriquecer o conteudo.
   */
  @Column({ type: 'jsonb' })
  prompts: TrTemplatePrompt[];

  /**
   * Referencias legais relevantes para este tipo de contratacao.
   * Ex: ["Lei 14.133/2021", "IN SEGES/ME n 94/2022"]
   */
  @Column({ type: 'jsonb' })
  legalReferences: string[];

  /**
   * Texto padrao de fundamentacao legal para este tipo.
   * Sera usado como base na geracao do TR.
   */
  @Column({ type: 'text', nullable: true })
  defaultFundamentacaoLegal: string;

  /**
   * Texto padrao de modelo de execucao para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultModeloExecucao: string;

  /**
   * Texto padrao de modelo de gestao para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultModeloGestao: string;

  /**
   * Texto padrao de criterios de selecao para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultCriteriosSelecao: string;

  /**
   * Texto padrao de obrigacoes do contratante para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultObrigacoesContratante: string;

  /**
   * Texto padrao de obrigacoes da contratada para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultObrigacoesContratada: string;

  /**
   * Texto padrao de sancoes e penalidades para este tipo.
   */
  @Column({ type: 'text', nullable: true })
  defaultSancoesPenalidades: string;

  /**
   * Indica se o template esta ativo e disponivel para uso.
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
