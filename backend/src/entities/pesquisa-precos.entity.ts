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
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Metodologia de pesquisa de precos conforme IN SEGES/ME n 65/2021.
 *
 * Art. 5: A pesquisa de precos sera realizada mediante utilizacao de um
 * dos seguintes parametros, em ordem de preferencia.
 */
export enum MetodologiaPesquisa {
  /**
   * I - Painel de Precos ou sistema equivalente
   * Portal Gov.br com precos praticados pela Administracao
   */
  PAINEL_PRECOS = 'PAINEL_PRECOS',

  /**
   * II - Contratacoes similares de outros entes publicos
   * Via PNCP ou transparencia ativa
   */
  CONTRATACOES_SIMILARES = 'CONTRATACOES_SIMILARES',

  /**
   * III - Dados de pesquisa publicada em midia especializada
   * Tabelas SINAPI, SICRO, revistas tecnicas
   */
  MIDIA_ESPECIALIZADA = 'MIDIA_ESPECIALIZADA',

  /**
   * IV - Sitios eletronicos especializados ou de dominio amplo
   * Pesquisa em sites de e-commerce ou fornecedores
   */
  SITES_ELETRONICOS = 'SITES_ELETRONICOS',

  /**
   * V - Pesquisa direta com fornecedores
   * Cotacoes formais com no minimo 3 fornecedores
   */
  PESQUISA_FORNECEDORES = 'PESQUISA_FORNECEDORES',

  /**
   * VI - Pesquisa na base de notas fiscais eletronicas
   * Consulta em bases de NFe estaduais
   */
  NOTAS_FISCAIS = 'NOTAS_FISCAIS',
}

/**
 * Status do processo de pesquisa de precos.
 */
export enum PesquisaPrecosStatus {
  /** Pesquisa iniciada, coleta em andamento */
  DRAFT = 'draft',

  /** Pesquisa concluida, aguardando aprovacao */
  COMPLETED = 'completed',

  /** Pesquisa aprovada, pronta para uso no processo */
  APPROVED = 'approved',

  /** Pesquisa arquivada (substituida ou cancelada) */
  ARCHIVED = 'archived',
}

/**
 * Estrutura de um item pesquisado com precos.
 * Armazena os precos coletados de cada fonte para um item.
 */
export interface ItemPesquisado {
  /** Codigo do item (CATMAT, CATSER, ou interno) */
  codigo?: string;
  /** Descricao do item */
  descricao: string;
  /** Unidade de medida */
  unidade: string;
  /** Quantidade estimada */
  quantidade: number;
  /** Precos coletados de cada fonte */
  precos: {
    fonte: string;
    valor: number;
    data: string;
    observacao?: string;
  }[];
  /** Media dos precos coletados */
  media?: number;
  /** Mediana dos precos coletados */
  mediana?: number;
  /** Menor preco encontrado */
  menorPreco?: number;
  /** Preco adotado para a pesquisa */
  precoAdotado?: number;
  /** Justificativa da escolha do preco */
  justificativaPreco?: string;
}

/**
 * Estrutura de uma fonte consultada na pesquisa.
 */
export interface FonteConsultada {
  /** Tipo da fonte conforme IN 65/2021 */
  tipo: MetodologiaPesquisa;
  /** Nome ou identificador da fonte */
  nome: string;
  /** Data da consulta */
  dataConsulta: string;
  /** URL ou referencia da fonte */
  referencia?: string;
  /** Observacoes sobre a consulta */
  observacoes?: string;
}

/**
 * Entity PesquisaPrecos - Pesquisa de Precos para contratacoes publicas.
 *
 * Modulo de pesquisa de precos estruturado conforme IN SEGES/ME n 65/2021.
 * Permite coleta automatica multi-fonte, calculos estatisticos e geracao
 * de relatorio formal de pesquisa.
 *
 * @see IN SEGES/ME n 65/2021 - Pesquisa de precos para contratacoes
 * @see Lei 14.133/2021 - Nova Lei de Licitacoes
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos
 */
@Entity('pesquisas_precos')
export class PesquisaPrecos {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com ETP (opcional)
  // ============================================

  /**
   * ID do ETP vinculado a esta pesquisa.
   * Uma pesquisa pode ser vinculada a um ETP em elaboracao.
   */
  @Column({ type: 'uuid', nullable: true })
  etpId: string;

  @ManyToOne(() => Etp, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

  // ============================================
  // Relacionamento com Termo de Referencia (opcional)
  // ============================================

  /**
   * ID do TR vinculado a esta pesquisa.
   * Uma pesquisa pode ser vinculada a um TR para complementar
   * a estimativa de custos.
   */
  @Column({ type: 'uuid', nullable: true })
  termoReferenciaId: string;

  @ManyToOne(() => TermoReferencia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'termoReferenciaId' })
  termoReferencia: TermoReferencia;

  // ============================================
  // Multi-tenancy (B2G)
  // ============================================

  /**
   * Organization ID para isolamento multi-tenant.
   * Obrigatorio para todas as pesquisas.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Identificacao da Pesquisa
  // ============================================

  /**
   * Titulo da pesquisa de precos.
   * Descricao curta do objeto pesquisado.
   */
  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  /**
   * Descricao do objeto da pesquisa.
   * Detalhamento do que esta sendo pesquisado.
   */
  @Column({ type: 'text', nullable: true })
  descricao: string;

  /**
   * Numero do processo administrativo.
   * Referencia ao processo de contratacao.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroProcesso: string;

  // ============================================
  // Metodologia (IN 65/2021)
  // ============================================

  /**
   * Metodologia principal utilizada na pesquisa.
   * Conforme ordem de preferencia do Art. 5 da IN 65/2021.
   */
  @Column({
    type: 'enum',
    enum: MetodologiaPesquisa,
    default: MetodologiaPesquisa.PAINEL_PRECOS,
  })
  metodologia: MetodologiaPesquisa;

  /**
   * Metodologias complementares utilizadas.
   * Quando ha combinacao de fontes (Art. 6 da IN 65/2021).
   */
  @Column({ type: 'jsonb', nullable: true })
  metodologiasComplementares: MetodologiaPesquisa[];

  /**
   * Justificativa da metodologia escolhida.
   * Obrigatorio quando nao usar Painel de Precos (Art. 7).
   */
  @Column({ type: 'text', nullable: true })
  justificativaMetodologia: string;

  // ============================================
  // Fontes Consultadas
  // ============================================

  /**
   * Lista de fontes consultadas na pesquisa.
   * Registro detalhado de cada fonte com data e referencia.
   */
  @Column({ type: 'jsonb', nullable: true })
  fontesConsultadas: FonteConsultada[];

  // ============================================
  // Itens Pesquisados
  // ============================================

  /**
   * Lista de itens pesquisados com precos.
   * Cada item contem os precos coletados e calculos.
   */
  @Column({ type: 'jsonb', nullable: true })
  itens: ItemPesquisado[];

  // ============================================
  // Calculos Estatisticos (Consolidados)
  // ============================================

  /**
   * Valor total estimado da contratacao.
   * Soma dos valores adotados de todos os itens.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorTotalEstimado: number;

  /**
   * Media geral dos precos pesquisados.
   * Calculado automaticamente a partir dos itens.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  mediaGeral: number;

  /**
   * Mediana geral dos precos pesquisados.
   * Calculado automaticamente a partir dos itens.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  medianaGeral: number;

  /**
   * Menor preco total encontrado.
   * Calculado automaticamente a partir dos itens.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  menorPrecoTotal: number;

  /**
   * Coeficiente de variacao dos precos (%).
   * Indica dispersao dos precos coletados.
   * CV = (desvio padrao / media) * 100
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  coeficienteVariacao: number;

  // ============================================
  // Criterio de Aceitabilidade (Art. 14)
  // ============================================

  /**
   * Criterio de aceitabilidade de precos.
   * Parametro para julgamento das propostas.
   * Ex: "menor preco", "media", "mediana"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  criterioAceitabilidade: string;

  /**
   * Justificativa do criterio de aceitabilidade.
   * Motivo da escolha do parametro.
   */
  @Column({ type: 'text', nullable: true })
  justificativaCriterio: string;

  // ============================================
  // Mapa Comparativo de Precos
  // ============================================

  /**
   * Mapa comparativo de precos em formato estruturado.
   * Tabela consolidada para relatorio.
   */
  @Column({ type: 'jsonb', nullable: true })
  mapaComparativo: Record<string, unknown>;

  // ============================================
  // Metadados e Controle
  // ============================================

  /**
   * Status atual da pesquisa de precos.
   */
  @Column({
    type: 'enum',
    enum: PesquisaPrecosStatus,
    default: PesquisaPrecosStatus.DRAFT,
  })
  status: PesquisaPrecosStatus;

  /**
   * Numero da versao do documento.
   * Incrementado a cada revisao significativa.
   */
  @Column({ default: 1 })
  versao: number;

  /**
   * Data de validade dos precos pesquisados.
   * Art. 9: Prazo de validade da pesquisa.
   */
  @Column({ type: 'date', nullable: true })
  dataValidade: Date;

  /**
   * Usuario que criou a pesquisa.
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
