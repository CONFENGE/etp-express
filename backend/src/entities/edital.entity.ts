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
 * Modalidade de licitacao conforme Lei 14.133/2021 Art. 28.
 * Não inclui Dispensa e Inexigibilidade (são contratações diretas, não licitações).
 */
export enum EditalModalidade {
  PREGAO = 'PREGAO',
  CONCORRENCIA = 'CONCORRENCIA',
  CONCURSO = 'CONCURSO',
  LEILAO = 'LEILAO',
  DIALOGO_COMPETITIVO = 'DIALOGO_COMPETITIVO',
}

/**
 * Tipo de contratacao direta conforme Lei 14.133/2021 Arts. 74-75.
 * Separado de modalidade pois não são licitações.
 */
export enum EditalTipoContratacaoDireta {
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
  DISPENSA = 'DISPENSA',
}

/**
 * Criterio de julgamento conforme Lei 14.133/2021 Art. 33.
 */
export enum EditalCriterioJulgamento {
  MENOR_PRECO = 'MENOR_PRECO',
  MAIOR_DESCONTO = 'MAIOR_DESCONTO',
  MELHOR_TECNICA = 'MELHOR_TECNICA',
  TECNICA_PRECO = 'TECNICA_PRECO',
  MAIOR_LANCE = 'MAIOR_LANCE',
  MAIOR_RETORNO_ECONOMICO = 'MAIOR_RETORNO_ECONOMICO',
}

/**
 * Modo de disputa conforme Lei 14.133/2021 Art. 56.
 */
export enum EditalModoDisputa {
  ABERTO = 'ABERTO',
  FECHADO = 'FECHADO',
  ABERTO_FECHADO = 'ABERTO_FECHADO',
}

/**
 * Status do Edital com workflow de aprovação.
 * Ciclo: draft → review → approved → published → suspended/revoked → closed → archived
 */
export enum EditalStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/**
 * Entity Edital - Instrumento convocatório para licitações públicas.
 *
 * Representa o edital de licitação conforme Lei 14.133/2021 (Nova Lei de Licitações).
 * Gerado a partir de ETP aprovado, Termo de Referência e Pesquisa de Preços.
 *
 * @see Lei 14.133/2021 Art. 25 - Requisitos obrigatórios do edital
 * @see Lei 14.133/2021 Art. 6, inciso XIII - Definição de edital
 */
@Entity('editais')
export class Edital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamentos com documentos anteriores
  // ============================================

  /**
   * ID do ETP que originou este Edital (opcional).
   * Um Edital pode ser criado independentemente ou derivar de um ETP.
   */
  @Column({ type: 'uuid', nullable: true })
  etpId: string | null;

  @ManyToOne(() => Etp, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etpId' })
  etp?: Etp;

  /**
   * ID do Termo de Referência (opcional).
   * Documento intermediário que detalha especificações técnicas.
   */
  @Column({ type: 'uuid', nullable: true })
  termoReferenciaId: string | null;

  @ManyToOne(() => TermoReferencia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'termoReferenciaId' })
  termoReferencia?: TermoReferencia;

  /**
   * ID da Pesquisa de Preços (opcional).
   * Fundamentação de preços conforme IN SEGES/ME nº 65/2021.
   */
  @Column({ type: 'uuid', nullable: true })
  pesquisaPrecosId: string | null;

  @ManyToOne(() => PesquisaPrecos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pesquisaPrecosId' })
  pesquisaPrecos?: PesquisaPrecos;

  // ============================================
  // Multi-tenancy (B2G)
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
  // Identificação do Edital (Art. 25, caput)
  // ============================================

  /**
   * Número do edital.
   * Identificação única do edital no órgão.
   * Ex: "001/2024-PREGAO"
   */
  @Column({ type: 'varchar', length: 50 })
  numero: string;

  /**
   * Número do processo administrativo.
   * Ex: "12345.678910/2024-11"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroProcesso: string | null;

  /**
   * UASG - Unidade Administrativa de Serviços Gerais.
   * Código de 6 dígitos do SISG (Sistema de Serviços Gerais).
   */
  @Column({ type: 'varchar', length: 6, nullable: true })
  uasg: string | null;

  // ============================================
  // Objeto (Art. 25, I)
  // ============================================

  /**
   * Objeto da licitação.
   * Descrição clara e precisa do que será contratado.
   * Obrigatório - Art. 25 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  objeto: string;

  /**
   * Descrição detalhada do objeto.
   * Complemento opcional com mais detalhes técnicos.
   */
  @Column({ type: 'text', nullable: true })
  descricaoObjeto: string | null;

  // ============================================
  // Modalidade e Tipo (Art. 25, II e III)
  // ============================================

  /**
   * Modalidade de licitação (Art. 28).
   * Pregão, Concorrência, Concurso, Leilão, Diálogo Competitivo.
   * Nullable porque pode ser uma contratação direta (Dispensa/Inexigibilidade).
   */
  @Column({
    type: 'enum',
    enum: EditalModalidade,
    nullable: true,
  })
  modalidade: EditalModalidade | null;

  /**
   * Tipo de contratação direta (Arts. 74-75).
   * Dispensa ou Inexigibilidade (quando não é licitação).
   * Nullable porque pode ser uma modalidade de licitação.
   */
  @Column({
    type: 'enum',
    enum: EditalTipoContratacaoDireta,
    nullable: true,
  })
  tipoContratacaoDireta: EditalTipoContratacaoDireta | null;

  /**
   * Critério de julgamento (Art. 33).
   * Menor preço, melhor técnica, técnica e preço, etc.
   * Obrigatório.
   */
  @Column({
    type: 'enum',
    enum: EditalCriterioJulgamento,
    default: EditalCriterioJulgamento.MENOR_PRECO,
  })
  criterioJulgamento: EditalCriterioJulgamento;

  /**
   * Modo de disputa (Art. 56).
   * Aberto, fechado ou aberto-fechado.
   * Obrigatório.
   */
  @Column({
    type: 'enum',
    enum: EditalModoDisputa,
    default: EditalModoDisputa.ABERTO,
  })
  modoDisputa: EditalModoDisputa;

  // ============================================
  // Condições de participação (Art. 25, IV)
  // ============================================

  /**
   * Condições de participação.
   * Requisitos para participar da licitação (ex: porte da empresa, regularidade fiscal).
   */
  @Column({ type: 'text', nullable: true })
  condicoesParticipacao: string | null;

  /**
   * Exclusividade para ME/EPP.
   * Se a licitação é exclusiva para Micro e Pequenas Empresas (LC 123/2006).
   */
  @Column({ type: 'boolean', default: false })
  exclusividadeMeEpp: boolean;

  /**
   * Valor limite para ME/EPP.
   * Limite de valor para aplicação dos benefícios da LC 123/2006.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorLimiteMeEpp: string | null;

  /**
   * Cota reservada para ME/EPP (percentual).
   * Percentual da contratação reservado para ME/EPP.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cotaReservadaMeEpp: string | null;

  /**
   * Exigência de consórcio.
   * Se há exigência ou permissão para participação em consórcio.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  exigenciaConsorcio: string | null;

  // ============================================
  // Requisitos de habilitação (Art. 25, V)
  // ============================================

  /**
   * Requisitos de habilitação (estruturado).
   * Documentação exigida para comprovar capacidade técnica, jurídica e fiscal.
   * Estrutura JSON para permitir múltiplos requisitos categorizados.
   */
  @Column({ type: 'jsonb', nullable: true })
  requisitosHabilitacao: Record<string, unknown> | null;

  // ============================================
  // Sanções (Art. 25, VI)
  // ============================================

  /**
   * Sanções administrativas aplicáveis.
   * Penalidades por inadimplemento (multas, suspensão, declaração de inidoneidade).
   */
  @Column({ type: 'text', nullable: true })
  sancoesAdministrativas: string | null;

  // ============================================
  // Prazo de vigência (Art. 25, VII)
  // ============================================

  /**
   * Prazo de vigência do contrato em dias.
   * Duração prevista para execução do objeto.
   */
  @Column({ type: 'int', nullable: true })
  prazoVigencia: number | null;

  /**
   * Possibilidade de prorrogação.
   * Condições para prorrogação do contrato.
   */
  @Column({ type: 'text', nullable: true })
  possibilidadeProrrogacao: string | null;

  // ============================================
  // Dotação orçamentária (Art. 25, VIII)
  // ============================================

  /**
   * Dotação orçamentária.
   * Código da dotação no orçamento público.
   * Ex: "02.031.0001.2001.339039"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dotacaoOrcamentaria: string | null;

  /**
   * Fonte de recursos.
   * Origem dos recursos para pagamento (ex: "Tesouro", "Próprios").
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  fonteRecursos: string | null;

  // ============================================
  // Valores (Art. 25, IX)
  // ============================================

  /**
   * Valor estimado da contratação.
   * Fundamentado na pesquisa de preços.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorEstimado: string | null;

  /**
   * Sigilo do orçamento.
   * Se o orçamento é sigiloso (Art. 34).
   */
  @Column({ type: 'boolean', default: false })
  sigiloOrcamento: boolean;

  // ============================================
  // Prazos do processo
  // ============================================

  /**
   * Prazos do processo licitatório (estruturado).
   * Estrutura JSON com múltiplos prazos (proposta, impugnação, recursos, etc.).
   */
  @Column({ type: 'jsonb', nullable: true })
  prazos: Record<string, unknown> | null;

  /**
   * Data e hora da sessão pública.
   * Momento em que as propostas serão abertas/analisadas.
   */
  @Column({ type: 'timestamp', nullable: true })
  dataSessaoPublica: Date | null;

  /**
   * Local da sessão pública.
   * Onde será realizada a sessão pública (ou URL para sessão eletrônica).
   */
  @Column({ type: 'text', nullable: true })
  localSessaoPublica: string | null;

  // ============================================
  // Cláusulas e anexos
  // ============================================

  /**
   * Cláusulas contratuais (estruturado).
   * Estrutura JSON com cláusulas do contrato.
   */
  @Column({ type: 'jsonb', nullable: true })
  clausulas: Record<string, unknown> | null;

  /**
   * Anexos do edital (estruturado).
   * Estrutura JSON com referências a arquivos anexos
   * (termo de referência, projetos, minuta de contrato, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  anexos: Record<string, unknown> | null;

  // ============================================
  // Informações adicionais
  // ============================================

  /**
   * Fundamentação legal.
   * Artigos da Lei 14.133/2021 e outras normas aplicáveis.
   */
  @Column({ type: 'text', nullable: true })
  fundamentacaoLegal: string | null;

  /**
   * Condições de pagamento.
   * Forma, prazo e condições para pagamento.
   */
  @Column({ type: 'text', nullable: true })
  condicoesPagamento: string | null;

  /**
   * Garantia contratual.
   * Exigência e tipo de garantia (caução, seguro-garantia, etc.).
   */
  @Column({ type: 'text', nullable: true })
  garantiaContratual: string | null;

  /**
   * Reajuste contratual.
   * Índice e condições para reajuste de preços.
   */
  @Column({ type: 'text', nullable: true })
  reajusteContratual: string | null;

  /**
   * Local de entrega.
   * Onde o objeto será entregue/executado.
   */
  @Column({ type: 'text', nullable: true })
  localEntrega: string | null;

  /**
   * Sistema eletrônico.
   * Nome do sistema eletrônico utilizado (ex: "Comprasnet", "Licitações-e").
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sistemaEletronico: string | null;

  /**
   * Link do sistema eletrônico.
   * URL do sistema onde a licitação será realizada.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  linkSistemaEletronico: string | null;

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
   * Versão do edital.
   * Incrementado a cada alteração significativa.
   */
  @Column({ type: 'int', default: 1 })
  versao: number;

  /**
   * Observações internas.
   * Anotações internas não publicadas no edital.
   */
  @Column({ type: 'text', nullable: true })
  observacoesInternas: string | null;

  /**
   * Data de publicação oficial do edital.
   * Quando o edital foi oficialmente publicado.
   */
  @Column({ type: 'date', nullable: true })
  dataPublicacao: Date | null;

  /**
   * Referência da publicação.
   * Onde foi publicado (Diário Oficial, jornal, portal).
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  referenciaPublicacao: string | null;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Usuário que criou o Edital.
   */
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  /**
   * Usuário que aprovou o Edital.
   */
  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedById' })
  approvedBy?: User;

  /**
   * Data de aprovação do Edital.
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
