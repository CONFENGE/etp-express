import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Etp } from './etp.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { TermoReferenciaVersion } from './termo-referencia-version.entity';

/**
 * Status do Termo de Referencia.
 * Segue ciclo de vida: draft -> review -> approved -> archived
 */
export enum TermoReferenciaStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
}

/**
 * Entity TermoReferencia - Termo de Referencia para contratacoes publicas.
 *
 * Documento que detalha as especificacoes tecnicas para contratacao,
 * gerado a partir de um ETP aprovado conforme Lei 14.133/2021.
 *
 * @see Lei 14.133/2021 - Nova Lei de Licitacoes
 * @see IN SEGES/ME n 40/2020 - Planejamento da contratacao
 */
@Entity('termos_referencia')
export class TermoReferencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com ETP (origem)
  // ============================================

  /**
   * ID do ETP que originou este Termo de Referencia.
   * Um TR sempre deriva de um ETP aprovado.
   */
  @Column({ type: 'uuid' })
  etpId: string;

  @ManyToOne(() => Etp, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

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
  // Campos obrigatorios do TR (Lei 14.133/2021)
  // ============================================

  /**
   * Definicao do objeto da contratacao.
   * Descricao precisa do que sera contratado.
   * Obrigatorio - Art. 6, inciso XXIII da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  objeto: string;

  /**
   * Fundamentacao legal da contratacao.
   * Referencias aos dispositivos legais que embasam a contratacao.
   * Ex: "Lei 14.133/2021, art. 75, inciso II"
   */
  @Column({ type: 'text', nullable: true })
  fundamentacaoLegal: string;

  /**
   * Descricao da solucao como um todo.
   * Visao geral de como a necessidade sera atendida.
   */
  @Column({ type: 'text', nullable: true })
  descricaoSolucao: string;

  /**
   * Requisitos da contratacao.
   * Especificacoes tecnicas, qualificacao minima, certificacoes.
   */
  @Column({ type: 'text', nullable: true })
  requisitosContratacao: string;

  /**
   * Modelo de execucao do objeto.
   * Como o objeto sera executado/entregue.
   * Ex: "Entrega unica", "Execucao continuada", "Por demanda"
   */
  @Column({ type: 'text', nullable: true })
  modeloExecucao: string;

  /**
   * Modelo de gestao do contrato.
   * Mecanismos de acompanhamento e fiscalizacao.
   */
  @Column({ type: 'text', nullable: true })
  modeloGestao: string;

  /**
   * Criterios de selecao do fornecedor.
   * Tipo de licitacao, criterios de julgamento.
   * Ex: "Menor preco", "Melhor tecnica", "Tecnica e preco"
   */
  @Column({ type: 'text', nullable: true })
  criteriosSelecao: string;

  /**
   * Valor estimado da contratacao.
   * Baseado na pesquisa de precos do ETP.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorEstimado: number;

  /**
   * Dotacao orcamentaria.
   * Codigo da dotacao no orcamento publico.
   * Ex: "02.031.0001.2001.339039"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dotacaoOrcamentaria: string;

  /**
   * Prazo de vigencia do contrato em dias.
   * Duracao prevista para a execucao do objeto.
   */
  @Column({ type: 'int', nullable: true })
  prazoVigencia: number;

  /**
   * Obrigacoes do contratante (orgao publico).
   * Deveres da Administracao Publica no contrato.
   */
  @Column({ type: 'text', nullable: true })
  obrigacoesContratante: string;

  /**
   * Obrigacoes da contratada (fornecedor).
   * Deveres do fornecedor/prestador de servico.
   */
  @Column({ type: 'text', nullable: true })
  obrigacoesContratada: string;

  /**
   * Sancoes e penalidades.
   * Multas, advertencias, suspensao, declaracao de inidoneidade.
   */
  @Column({ type: 'text', nullable: true })
  sancoesPenalidades: string;

  /**
   * Cronograma de execucao.
   * Estrutura JSON com etapas, datas e marcos.
   */
  @Column({ type: 'jsonb', nullable: true })
  cronograma: Record<string, unknown>;

  /**
   * Especificacoes tecnicas detalhadas.
   * Estrutura JSON com requisitos tecnicos especificos.
   */
  @Column({ type: 'jsonb', nullable: true })
  especificacoesTecnicas: Record<string, unknown>;

  // ============================================
  // Campos adicionais
  // ============================================

  /**
   * Local de entrega ou execucao.
   * Endereco ou descricao do local.
   */
  @Column({ type: 'text', nullable: true })
  localExecucao: string;

  /**
   * Garantia contratual exigida.
   * Percentual ou valor da garantia.
   */
  @Column({ type: 'text', nullable: true })
  garantiaContratual: string;

  /**
   * Condicoes de pagamento.
   * Forma e prazo de pagamento.
   */
  @Column({ type: 'text', nullable: true })
  condicoesPagamento: string;

  /**
   * Subcontratacao permitida.
   * Se e em que condicoes e permitida subcontratacao.
   */
  @Column({ type: 'text', nullable: true })
  subcontratacao: string;

  // ============================================
  // Metadados e controle
  // ============================================

  /**
   * Status atual do Termo de Referencia.
   */
  @Column({
    type: 'enum',
    enum: TermoReferenciaStatus,
    default: TermoReferenciaStatus.DRAFT,
  })
  status: TermoReferenciaStatus;

  /**
   * Numero da versao do documento.
   * Incrementado a cada revisao significativa.
   */
  @Column({ default: 1 })
  versao: number;

  /**
   * Versao atual do documento (para controle de versionamento).
   * Atualizado automaticamente quando uma nova versao e criada.
   */
  @Column({ default: 1 })
  currentVersion: number;

  // ============================================
  // Relacionamento com versoes
  // ============================================

  /**
   * Historico de versoes do TR.
   * Cada alteracao significativa cria um snapshot.
   *
   * Issue #1253 - [TR-f] Versionamento e historico de TR
   */
  @OneToMany(() => TermoReferenciaVersion, (version) => version.termoReferencia)
  versions: TermoReferenciaVersion[];

  /**
   * Usuario que criou o TR.
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
