import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Modalidade de licitação conforme Lei 14.133/2021 Art. 28.
 * Inclui também contratações diretas (Dispensa/Inexigibilidade) para template unificado.
 */
export enum EditalTemplateModalidade {
  PREGAO = 'PREGAO',
  CONCORRENCIA = 'CONCORRENCIA',
  DISPENSA = 'DISPENSA',
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
}

/**
 * Estrutura de seção do edital com texto configurável.
 */
export interface EditalTemplateSecao {
  /** Identificador único da seção (ex: objeto, condicoes_participacao) */
  id: string;
  /** Nome da seção para exibição */
  nome: string;
  /** Ordem de exibição */
  ordem: number;
  /** Texto padrão da seção */
  textoModelo: string;
  /** Se a seção é obrigatória por lei */
  obrigatoria: boolean;
  /** Referência legal específica (Art. X da Lei 14.133/2021) */
  referenciaLegal?: string;
}

/**
 * Cláusula padrão do edital com texto configurável.
 */
export interface EditalTemplateClausula {
  /** Identificador único da cláusula (ex: prazo_vigencia, sancoes) */
  id: string;
  /** Título da cláusula */
  titulo: string;
  /** Texto padrão da cláusula com placeholders {{variavel}} */
  textoModelo: string;
  /** Se a cláusula é obrigatória */
  obrigatoria: boolean;
  /** Referência legal específica */
  referenciaLegal?: string;
  /** Categoria da cláusula (ex: prazo, sancao, pagamento) */
  categoria?: string;
}

/**
 * Campo dinâmico específico por modalidade.
 */
export interface EditalTemplateField {
  /** Nome do campo */
  name: string;
  /** Label para exibição */
  label: string;
  /** Tipo do campo (text, textarea, number, date, select, boolean) */
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  /** Se o campo é obrigatório */
  required: boolean;
  /** Placeholder ou dica de preenchimento */
  placeholder?: string;
  /** Opções para campos do tipo select */
  options?: string[];
  /** Valor padrão */
  defaultValue?: string | number | boolean;
  /** Descrição ou help text */
  description?: string;
}

/**
 * Template pré-configurado de Edital por modalidade de licitação.
 *
 * Facilita a geração automatizada de editais com seções, cláusulas e textos
 * específicos por modalidade conforme Lei 14.133/2021 e IN SEGES/ME nº 65/2021.
 *
 * Issue #1278 - [Edital-b] Templates de edital por modalidade
 * Parent: #1276 - [Edital] Módulo de Geração de Edital - EPIC
 *
 * @see Lei 14.133/2021 Art. 25 - Requisitos obrigatórios do edital
 * @see Lei 14.133/2021 Art. 28 - Modalidades de licitação
 * @see IN SEGES/ME nº 65/2021 - Instruções para elaboração de editais
 */
@Entity('edital_templates')
export class EditalTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do template.
   * Ex: "Template de Pregão Eletrônico"
   */
  @Column({ length: 200 })
  name: string;

  /**
   * Modalidade do template.
   * Pregão, Concorrência, Dispensa ou Inexigibilidade.
   */
  @Column({
    type: 'enum',
    enum: EditalTemplateModalidade,
  })
  modalidade: EditalTemplateModalidade;

  /**
   * Descrição detalhada do template e quando utilizá-lo.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Seções padrão do edital estruturadas.
   * Cada seção contém texto modelo e metadados.
   * Ordenadas pela propriedade 'ordem'.
   */
  @Column({ type: 'jsonb' })
  secoes: EditalTemplateSecao[];

  /**
   * Cláusulas contratuais padrão configuráveis.
   * Textos modelo com placeholders para personalização.
   */
  @Column({ type: 'jsonb' })
  clausulas: EditalTemplateClausula[];

  /**
   * Campos específicos para esta modalidade.
   * Configuração completa com labels, tipos e validações.
   */
  @Column({ type: 'jsonb' })
  specificFields: EditalTemplateField[];

  /**
   * Referências legais aplicáveis.
   * Lista de artigos da Lei 14.133/2021 e outras normas.
   * Ex: ["Lei 14.133/2021 Art. 28, III", "IN SEGES/ME nº 65/2021 Art. 7"]
   */
  @Column({ type: 'jsonb' })
  legalReferences: string[];

  /**
   * Texto padrão do preâmbulo do edital.
   * Identificação do órgão, modalidade, número do processo, etc.
   */
  @Column({ type: 'text', nullable: true })
  defaultPreambulo: string | null;

  /**
   * Texto padrão da fundamentação legal.
   * Base legal completa para a modalidade.
   */
  @Column({ type: 'text', nullable: true })
  defaultFundamentacaoLegal: string | null;

  /**
   * Texto padrão de condições de participação.
   */
  @Column({ type: 'text', nullable: true })
  defaultCondicoesParticipacao: string | null;

  /**
   * Texto padrão de requisitos de habilitação.
   */
  @Column({ type: 'text', nullable: true })
  defaultRequisitosHabilitacao: string | null;

  /**
   * Texto padrão de sanções administrativas.
   */
  @Column({ type: 'text', nullable: true })
  defaultSancoesAdministrativas: string | null;

  /**
   * Texto padrão de condições de pagamento.
   */
  @Column({ type: 'text', nullable: true })
  defaultCondicoesPagamento: string | null;

  /**
   * Texto padrão de garantia contratual.
   */
  @Column({ type: 'text', nullable: true })
  defaultGarantiaContratual: string | null;

  /**
   * Texto padrão de reajuste contratual.
   */
  @Column({ type: 'text', nullable: true })
  defaultReajusteContratual: string | null;

  /**
   * Observações e instruções para uso do template.
   * Orientações para o agente público.
   */
  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  /**
   * Indica se o template está ativo e disponível para uso.
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Versão do template.
   * Incrementado a cada atualização para controle de mudanças.
   */
  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
