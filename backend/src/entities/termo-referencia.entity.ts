import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Etp } from './etp.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Status do Termo de Referência no fluxo de trabalho.
 * Issue #1248 - [TR-a] Criar entity TermoReferencia
 */
export enum TermoReferenciaStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
}

/**
 * Modalidade de licitação conforme Lei 14.133/2021.
 */
export enum ModalidadeLicitacao {
  PREGAO = 'PREGAO',
  CONCORRENCIA = 'CONCORRENCIA',
  CONCURSO = 'CONCURSO',
  LEILAO = 'LEILAO',
  DIALOGO_COMPETITIVO = 'DIALOGO_COMPETITIVO',
  DISPENSA = 'DISPENSA',
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
}

/**
 * Critério de julgamento conforme Lei 14.133/2021, Art. 33.
 */
export enum CriterioJulgamento {
  MENOR_PRECO = 'MENOR_PRECO',
  MAIOR_DESCONTO = 'MAIOR_DESCONTO',
  MELHOR_TECNICA = 'MELHOR_TECNICA',
  TECNICA_PRECO = 'TECNICA_PRECO',
  MAIOR_LANCE = 'MAIOR_LANCE',
  MAIOR_RETORNO_ECONOMICO = 'MAIOR_RETORNO_ECONOMICO',
}

/**
 * Regime de execução contratual conforme Lei 14.133/2021.
 */
export enum RegimeExecucao {
  EMPREITADA_PRECO_GLOBAL = 'EMPREITADA_PRECO_GLOBAL',
  EMPREITADA_PRECO_UNITARIO = 'EMPREITADA_PRECO_UNITARIO',
  TAREFA = 'TAREFA',
  EMPREITADA_INTEGRAL = 'EMPREITADA_INTEGRAL',
  CONTRATACAO_INTEGRADA = 'CONTRATACAO_INTEGRADA',
  CONTRATACAO_SEMI_INTEGRADA = 'CONTRATACAO_SEMI_INTEGRADA',
  FORNECIMENTO_INSTALACAO = 'FORNECIMENTO_INSTALACAO',
}

/**
 * Estrutura para especificações técnicas detalhadas.
 */
export interface EspecificacaoTecnica {
  item: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitarioEstimado?: number;
  observacoes?: string;
}

/**
 * Estrutura para cronograma de execução.
 */
export interface EtapaCronograma {
  etapa: number;
  descricao: string;
  prazoInicio: number; // dias a partir da assinatura
  prazoFim: number;
  percentualPagamento?: number;
  entregaveis?: string[];
}

/**
 * Estrutura para obrigações contratuais.
 */
export interface ObrigacaoContratual {
  tipo: 'CONTRATANTE' | 'CONTRATADA';
  descricao: string;
  referenciaNormativa?: string;
}

/**
 * Estrutura para penalidades contratuais.
 */
export interface Penalidade {
  tipo: 'ADVERTENCIA' | 'MULTA' | 'SUSPENSAO' | 'DECLARACAO_INIDONEIDADE';
  descricao: string;
  percentual?: number;
  prazo?: number;
  fundamentacaoLegal: string;
}

/**
 * Termo de Referência - Documento técnico que define o objeto da contratação.
 *
 * Conforme Lei 14.133/2021, Art. 6º, XXIII:
 * "documento necessário para a contratação de bens e serviços, que deve conter
 * os parâmetros e elementos descritivos estabelecidos no art. 6º, inciso XXIII"
 *
 * Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * Milestone: M10 - Termo de Referência
 */
@Entity('termos_referencia')
export class TermoReferencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com ETP (obrigatório)
  // ============================================

  /**
   * ETP de origem que fundamenta este Termo de Referência.
   * Relacionamento obrigatório - todo TR deve derivar de um ETP aprovado.
   */
  @Column({ type: 'uuid' })
  etpId: string;

  @ManyToOne(() => Etp, { nullable: false })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

  // ============================================
  // Identificação do Documento
  // ============================================

  /**
   * Número sequencial do TR no órgão.
   * Ex: "TR-2024/001"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroTR: string;

  /**
   * Número do processo administrativo.
   * Ex: "23000.123456/2024-00"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroProcesso: string;

  /**
   * Título descritivo do Termo de Referência.
   */
  @Column({ type: 'varchar', length: 500 })
  titulo: string;

  // ============================================
  // Definição do Objeto (Art. 6º, XXIII, Lei 14.133)
  // ============================================

  /**
   * Descrição detalhada do objeto da contratação.
   * Deve ser clara, precisa e suficiente para definir o escopo.
   */
  @Column({ type: 'text' })
  objeto: string;

  /**
   * Natureza do objeto (Bem, Serviço Comum, Serviço Especial, Obra).
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  naturezaObjeto: string;

  /**
   * Justificativa da contratação vinculada ao planejamento.
   * Deve demonstrar o nexo entre necessidade e solução proposta.
   */
  @Column({ type: 'text', nullable: true })
  justificativa: string;

  // ============================================
  // Especificações Técnicas
  // ============================================

  /**
   * Lista detalhada de especificações técnicas dos itens/serviços.
   */
  @Column({ type: 'jsonb', nullable: true })
  especificacoes: EspecificacaoTecnica[];

  /**
   * Requisitos técnicos obrigatórios para execução.
   */
  @Column({ type: 'text', nullable: true })
  requisitosTecnicos: string;

  /**
   * Requisitos de qualificação técnica do fornecedor.
   * Ex: Atestados de capacidade técnica, certificações.
   */
  @Column({ type: 'text', nullable: true })
  requisitosQualificacao: string;

  /**
   * Padrões e normas técnicas aplicáveis (ABNT, ISO, etc.).
   */
  @Column({ type: 'jsonb', nullable: true })
  normasAplicaveis: string[];

  // ============================================
  // Valores e Quantitativos
  // ============================================

  /**
   * Valor total estimado da contratação.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorEstimado: number;

  /**
   * Quantidade total a ser contratada.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quantidade: number;

  /**
   * Unidade de medida padrão.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unidadeMedida: string;

  /**
   * Metodologia utilizada para estimativa de preços.
   * Ex: "Painel de Preços PNCP", "Cotações de mercado", "SINAPI".
   */
  @Column({ type: 'text', nullable: true })
  metodologiaPrecos: string;

  // ============================================
  // Parâmetros da Licitação
  // ============================================

  /**
   * Modalidade de licitação sugerida.
   */
  @Column({
    type: 'enum',
    enum: ModalidadeLicitacao,
    nullable: true,
  })
  modalidade: ModalidadeLicitacao;

  /**
   * Critério de julgamento das propostas.
   */
  @Column({
    type: 'enum',
    enum: CriterioJulgamento,
    nullable: true,
  })
  criterioJulgamento: CriterioJulgamento;

  /**
   * Regime de execução contratual.
   */
  @Column({
    type: 'enum',
    enum: RegimeExecucao,
    nullable: true,
  })
  regimeExecucao: RegimeExecucao;

  /**
   * Justificativa para a modalidade escolhida.
   */
  @Column({ type: 'text', nullable: true })
  justificativaModalidade: string;

  // ============================================
  // Prazos e Cronograma
  // ============================================

  /**
   * Prazo de vigência contratual em meses.
   */
  @Column({ type: 'int', nullable: true })
  prazoVigencia: number;

  /**
   * Prazo de execução em dias.
   */
  @Column({ type: 'int', nullable: true })
  prazoExecucao: number;

  /**
   * Possibilidade de prorrogação (true/false).
   */
  @Column({ type: 'boolean', default: true })
  permiteProrrogacao: boolean;

  /**
   * Cronograma físico-financeiro de execução.
   */
  @Column({ type: 'jsonb', nullable: true })
  cronograma: EtapaCronograma[];

  // ============================================
  // Condições Contratuais
  // ============================================

  /**
   * Forma de pagamento detalhada.
   * Ex: "Pagamento em até 30 dias após ateste da nota fiscal".
   */
  @Column({ type: 'text', nullable: true })
  formaPagamento: string;

  /**
   * Dotação orçamentária vinculada.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dotacaoOrcamentaria: string;

  /**
   * Local(is) de entrega ou execução dos serviços.
   */
  @Column({ type: 'text', nullable: true })
  localEntrega: string;

  /**
   * Garantia contratual exigida (percentual e tipo).
   */
  @Column({ type: 'jsonb', nullable: true })
  garantiaContratual: {
    percentual: number;
    tipo: string[];
    prazo?: number;
  };

  // ============================================
  // Obrigações e Responsabilidades
  // ============================================

  /**
   * Lista de obrigações da contratante e contratada.
   */
  @Column({ type: 'jsonb', nullable: true })
  obrigacoes: ObrigacaoContratual[];

  /**
   * Modelo de gestão e fiscalização do contrato.
   */
  @Column({ type: 'text', nullable: true })
  modeloGestao: string;

  /**
   * Indicadores de desempenho e métricas de SLA.
   */
  @Column({ type: 'jsonb', nullable: true })
  indicadoresDesempenho: {
    indicador: string;
    meta: string;
    periodicidade: string;
    penalidade?: string;
  }[];

  // ============================================
  // Sanções e Penalidades
  // ============================================

  /**
   * Tabela de sanções e penalidades aplicáveis.
   */
  @Column({ type: 'jsonb', nullable: true })
  penalidades: Penalidade[];

  // ============================================
  // Sustentabilidade (IN SLTI/MP nº 01/2010)
  // ============================================

  /**
   * Critérios de sustentabilidade ambiental aplicáveis.
   */
  @Column({ type: 'text', nullable: true })
  criteriosSustentabilidade: string;

  // ============================================
  // Fundamentação Legal
  // ============================================

  /**
   * Referências legais que fundamentam a contratação.
   * Ex: ["Lei 14.133/2021, Art. 75", "IN SEGES/ME nº 65/2021"]
   */
  @Column({ type: 'jsonb', nullable: true })
  fundamentacaoLegal: string[];

  // ============================================
  // Metadados e Controle
  // ============================================

  /**
   * Status do TR no fluxo de trabalho.
   */
  @Column({
    type: 'enum',
    enum: TermoReferenciaStatus,
    default: TermoReferenciaStatus.DRAFT,
  })
  status: TermoReferenciaStatus;

  /**
   * Versão atual do documento.
   */
  @Column({ type: 'int', default: 1 })
  versao: number;

  /**
   * Percentual de completude do TR.
   */
  @Column({ type: 'float', default: 0 })
  completionPercentage: number;

  /**
   * Metadados adicionais flexíveis.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    tags?: string[];
    observacoesInternas?: string;
    [key: string]: unknown;
  };

  // ============================================
  // Multi-Tenancy (Isolation)
  // ============================================

  /**
   * Organization ID para isolamento multi-tenant.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Usuário que criou o TR.
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
