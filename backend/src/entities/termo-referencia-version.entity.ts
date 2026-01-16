import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TermoReferencia } from './termo-referencia.entity';

/**
 * Snapshot de um Termo de Referencia em um momento especifico.
 * Usado para versionamento e historico de alteracoes.
 */
export interface TrVersionSnapshot {
  /** Objeto da contratacao */
  objeto: string;
  /** Fundamentacao legal */
  fundamentacaoLegal: string | null;
  /** Descricao da solucao */
  descricaoSolucao: string | null;
  /** Requisitos da contratacao */
  requisitosContratacao: string | null;
  /** Modelo de execucao */
  modeloExecucao: string | null;
  /** Modelo de gestao */
  modeloGestao: string | null;
  /** Criterios de selecao */
  criteriosSelecao: string | null;
  /** Valor estimado */
  valorEstimado: number | null;
  /** Dotacao orcamentaria */
  dotacaoOrcamentaria: string | null;
  /** Prazo de vigencia em dias */
  prazoVigencia: number | null;
  /** Obrigacoes do contratante */
  obrigacoesContratante: string | null;
  /** Obrigacoes da contratada */
  obrigacoesContratada: string | null;
  /** Sancoes e penalidades */
  sancoesPenalidades: string | null;
  /** Cronograma */
  cronograma: Record<string, unknown> | null;
  /** Especificacoes tecnicas */
  especificacoesTecnicas: Record<string, unknown> | null;
  /** Local de execucao */
  localExecucao: string | null;
  /** Garantia contratual */
  garantiaContratual: string | null;
  /** Condicoes de pagamento */
  condicoesPagamento: string | null;
  /** Subcontratacao */
  subcontratacao: string | null;
  /** Status atual */
  status: string;
}

/**
 * Entity TermoReferenciaVersion - Versao historica de um Termo de Referencia.
 *
 * Cada versao representa um snapshot completo do TR em um momento especifico,
 * permitindo rastreabilidade e restauracao de estados anteriores.
 *
 * Funcionalidades:
 * - Criacao automatica de versao em cada save significativo
 * - Comparacao entre versoes (diff)
 * - Restauracao de versao anterior
 * - Audit trail de alteracoes
 *
 * Issue #1253 - [TR-f] Versionamento e historico de TR
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Entity('termo_referencia_versions')
export class TermoReferenciaVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Numero sequencial da versao.
   * Incrementado automaticamente a cada nova versao.
   */
  @Column()
  versionNumber: number;

  /**
   * Snapshot completo do TR no momento da criacao da versao.
   * Armazena todos os campos do TR em formato JSON.
   */
  @Column({ type: 'jsonb' })
  snapshot: TrVersionSnapshot;

  /**
   * Descricao das alteracoes realizadas nesta versao.
   * Preenchido manualmente ou automaticamente.
   */
  @Column({ type: 'text', nullable: true })
  changeLog: string;

  /**
   * Nome do usuario que criou esta versao.
   * Armazenado para historico mesmo se usuario for removido.
   */
  @Column({ type: 'varchar', nullable: true })
  createdByName: string;

  /**
   * Relacionamento com o Termo de Referencia pai.
   * CASCADE: Ao deletar o TR, todas as versoes sao removidas.
   */
  @ManyToOne(() => TermoReferencia, (tr) => tr.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'termo_referencia_id' })
  termoReferencia: TermoReferencia;

  /**
   * ID do Termo de Referencia pai.
   * Usado para queries e indexacao.
   */
  @Column({ name: 'termo_referencia_id' })
  termoReferenciaId: string;

  /**
   * Data de criacao da versao.
   */
  @CreateDateColumn()
  createdAt: Date;
}
