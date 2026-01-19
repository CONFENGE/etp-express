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
import { TermoReferencia } from './termo-referencia.entity';
import { PesquisaPrecos } from './pesquisa-precos.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Modalidade de licitacao conforme Lei 14.133/2021.
 */
export enum EditalModalidade {
  PREGAO = 'pregao',
  CONCORRENCIA = 'concorrencia',
  DISPENSA = 'dispensa',
  INEXIGIBILIDADE = 'inexigibilidade',
}

/**
 * Criterio de julgamento/tipo de licitacao conforme Lei 14.133/2021.
 */
export enum EditalCriterioJulgamento {
  MENOR_PRECO = 'menor_preco',
  MELHOR_TECNICA = 'melhor_tecnica',
  TECNICA_E_PRECO = 'tecnica_e_preco',
  MAIOR_LANCE = 'maior_lance', // Para alienacao de bens
  MAIOR_RETORNO_ECONOMICO = 'maior_retorno_economico', // Para concessao
}

/**
 * Status do Edital.
 * Segue ciclo de vida: draft -> published -> cancelled -> archived
 */
export enum EditalStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

/**
 * Entity Edital - Instrumento convocatorio para licitacoes publicas.
 *
 * Representa o edital de licitacao conforme Lei 14.133/2021 (Nova Lei de Licitacoes).
 * Gerado a partir de ETP aprovado, Termo de Referencia e Pesquisa de Precos.
 *
 * @see Lei 14.133/2021 Art. 25 - Requisitos obrigatorios do edital
 * @see Lei 14.133/2021 Art. 6, inciso XIII - Definicao de edital
 */
@Entity('editais')
export class Edital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamentos com documentos anteriores
  // ============================================

  /**
   * ID do ETP que originou este Edital.
   * Relacionamento obrigatorio - um Edital deriva de um ETP.
   */
  @Column({ type: 'uuid' })
  etpId: string;

  @ManyToOne(() => Etp, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

  /**
   * ID do Termo de Referencia.
   * Documento intermediario que detalha especificacoes tecnicas.
   */
  @Column({ type: 'uuid', nullable: true })
  termoReferenciaId: string;

  @ManyToOne(() => TermoReferencia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'termoReferenciaId' })
  termoReferencia: TermoReferencia;

  /**
   * ID da Pesquisa de Precos.
   * Fundamentacao de precos conforme IN SEGES/ME n 65/2021.
   */
  @Column({ type: 'uuid', nullable: true })
  pesquisaPrecosId: string;

  @ManyToOne(() => PesquisaPrecos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pesquisaPrecosId' })
  pesquisaPrecos: PesquisaPrecos;

  // ============================================
  // Multi-tenancy (B2G)
  // ============================================

  /**
   * Organization ID para isolamento multi-tenant.
   * Herdado do ETP de origem.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Campos obrigatorios do Edital (Lei 14.133/2021 Art. 25)
  // ============================================

  /**
   * Numero do edital.
   * Identificacao unica do edital no orgao.
   * Ex: "001/2024-PREGAO"
   */
  @Column({ type: 'varchar', length: 50 })
  numero: string;

  /**
   * Modalidade de licitacao.
   * Pregao, Concorrencia, Dispensa, Inexigibilidade.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({
    type: 'enum',
    enum: EditalModalidade,
  })
  modalidade: EditalModalidade;

  /**
   * Criterio de julgamento/tipo de licitacao.
   * Menor preco, melhor tecnica, tecnica e preco, etc.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({
    type: 'enum',
    enum: EditalCriterioJulgamento,
  })
  criterioJulgamento: EditalCriterioJulgamento;

  /**
   * Objeto da licitacao.
   * Descricao clara e precisa do que sera contratado.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  objeto: string;

  /**
   * Condicoes de participacao.
   * Requisitos para participar da licitacao (ex: porte da empresa, regularidade fiscal).
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  condicoesParticipacao: string;

  /**
   * Requisitos de habilitacao.
   * Documentacao exigida para comprovar capacidade tecnica, juridica e fiscal.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  requisitosHabilitacao: string;

  /**
   * Sancoes aplicaveis.
   * Penalidades por inadimplemento (multas, suspensao, declaracao de inidoneidade).
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  sancoesAplicaveis: string;

  /**
   * Prazo de vigencia do contrato em dias.
   * Duracao prevista para execucao do objeto.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'int' })
  prazoVigencia: number;

  /**
   * Dotacao orcamentaria.
   * Codigo da dotacao no orcamento publico.
   * Ex: "02.031.0001.2001.339039"
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'varchar', length: 100 })
  dotacaoOrcamentaria: string;

  /**
   * Data e hora de abertura das propostas.
   * Momento em que as propostas serao abertas/analisadas.
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'timestamp' })
  dataAbertura: Date;

  /**
   * Local de realizacao da licitacao.
   * Onde sera realizada a sessao publica (ou URL para sessao eletronica).
   * Obrigatorio - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  local: string;

  // ============================================
  // Campos adicionais relevantes
  // ============================================

  /**
   * Valor estimado da contratacao.
   * Fundamentado na pesquisa de precos.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorEstimado: number;

  /**
   * Criterios detalhados de julgamento.
   * Descricao dos criterios de avaliacao e pontuacao (se aplicavel).
   */
  @Column({ type: 'text', nullable: true })
  criteriosJulgamentoDetalhado: string;

  /**
   * Regras de recursos.
   * Prazos e procedimentos para interposicao de recursos administrativos.
   */
  @Column({ type: 'text', nullable: true })
  regrasRecursos: string;

  /**
   * Regras de fiscalizacao e gestao do contrato.
   * Como sera feita a fiscalizacao e gestao apos assinatura.
   */
  @Column({ type: 'text', nullable: true })
  regrasFiscalizacaoGestao: string;

  /**
   * Regras de entrega do objeto.
   * Condicoes, prazos e formas de entrega.
   */
  @Column({ type: 'text', nullable: true })
  regrasEntregaObjeto: string;

  /**
   * Condicoes de pagamento.
   * Forma, prazo e condicoes para pagamento.
   */
  @Column({ type: 'text', nullable: true })
  condicoesPagamento: string;

  /**
   * Programa de Integridade exigido.
   * Se aplicavel, exigencia de programa de integridade (§4º Art. 25).
   * Boolean indicando se e obrigatorio.
   */
  @Column({ type: 'boolean', default: false })
  exigeProgramaIntegridade: boolean;

  /**
   * Indice de reajuste de precos.
   * Indice a ser utilizado para reajuste (§7º Art. 25).
   * Ex: "IPCA", "INPC", "IGP-M"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  indiceReajuste: string;

  /**
   * Data base para reajuste.
   * Data de referencia para aplicacao do reajuste.
   */
  @Column({ type: 'timestamp', nullable: true })
  dataBaseReajuste: Date;

  /**
   * Anexos do edital.
   * Estrutura JSON com referencias a arquivos anexos
   * (termo de referencia, projetos, minuta de contrato, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  anexos: Record<string, unknown>;

  /**
   * Observacoes gerais.
   * Informacoes complementares nao categorizadas.
   */
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  // ============================================
  // Metadados e controle
  // ============================================

  /**
   * Status atual do Edital.
   */
  @Column({
    type: 'enum',
    enum: EditalStatus,
    default: EditalStatus.DRAFT,
  })
  status: EditalStatus;

  /**
   * Data de publicacao oficial do edital.
   * Quando o edital foi oficialmente publicado.
   */
  @Column({ type: 'timestamp', nullable: true })
  dataPublicacao: Date;

  /**
   * Usuario que criou o Edital.
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
