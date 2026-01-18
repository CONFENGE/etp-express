/**
 * Tribunal de origem da jurisprudencia.
 */
export type Tribunal = 'TCE-SP' | 'TCU';

/**
 * Tipo de decisao/pronunciamento.
 */
export type TipoJurisprudencia =
  | 'SUMULA'
  | 'ACORDAO'
  | 'DECISAO_NORMATIVA'
  | 'PARECER';

/**
 * Status atual da jurisprudencia.
 */
export type StatusJurisprudencia = 'VIGENTE' | 'CANCELADA' | 'SUPERADA';

/**
 * Data structure for jurisprudence (sumulas, acordaos, pareceres).
 *
 * Used to represent TCE-SP and TCU jurisprudence in the PageIndex
 * hierarchical tree structure.
 *
 * @see Issue #1578 - [JURIS-1540b] Criar JurisprudenciaSeeder com estrutura base
 * @see docs/jurisprudencia-sources.md
 */
export interface JurisprudenciaData {
  /** Unique identifier (e.g., 'tcesp-sumula-1', 'tcu-acordao-247') */
  id: string;

  /** Tribunal de origem */
  tribunal: Tribunal;

  /** Tipo de decisao */
  tipo: TipoJurisprudencia;

  /** Numero da decisao/sumula */
  numero: number;

  /** Ano da decisao */
  ano: number;

  /** Ementa/Enunciado completo */
  ementa: string;

  /** Temas relacionados para organizacao na tree structure */
  temas: string[];

  /** Status atual */
  status: StatusJurisprudencia;

  /** Fundamentacao legal ou precedentes */
  fundamentacao?: string;

  /** URL da fonte original */
  sourceUrl: string;

  /** Data de aprovacao (formato ISO: YYYY-MM-DD) */
  dataAprovacao?: string;

  /** Relator ou ministro relator (quando aplicavel) */
  relator?: string;
}

/**
 * Theme categories for organizing jurisprudence in the tree structure.
 *
 * These categories are used to group related decisions under
 * a common parent node for efficient tree traversal.
 */
export const TEMAS_JURISPRUDENCIA = {
  // TCE-SP categories
  TCESP: {
    LICITACAO: 'Licitacao',
    LICITACAO_MODALIDADES: 'Licitacao > Modalidades',
    LICITACAO_HABILITACAO: 'Licitacao > Habilitacao',
    LICITACAO_DISPENSAS: 'Licitacao > Dispensas e Inexigibilidades',
    LICITACAO_REGISTRO_PRECOS: 'Licitacao > Registro de Precos',
    CONTRATOS: 'Contratos',
    CONTRATOS_FORMALIZACAO: 'Contratos > Formalizacao',
    CONTRATOS_ALTERACOES: 'Contratos > Alteracoes',
    TERCEIRO_SETOR: 'Terceiro Setor',
    AUXILIOS_SUBVENCOES: 'Auxilios e Subvencoes',
    REMUNERACAO: 'Remuneracao e Pessoal',
    SANCOES: 'Sancoes Administrativas',
  },
  // TCU categories
  TCU: {
    LEI_14133: 'Lei 14.133/2021',
    LEI_14133_ETP: 'Lei 14.133/2021 > ETP',
    LEI_14133_PESQUISA_PRECOS: 'Lei 14.133/2021 > Pesquisa de Precos',
    LEI_14133_MODALIDADES: 'Lei 14.133/2021 > Modalidades',
    LICITACAO: 'Licitacao',
    LICITACAO_ADJUDICACAO: 'Licitacao > Adjudicacao',
    LICITACAO_HABILITACAO: 'Licitacao > Habilitacao',
    LICITACAO_BDI: 'Licitacao > BDI e Composicao',
    LICITACAO_PREGAO: 'Licitacao > Pregao',
    CONTRATOS: 'Contratos',
    CONTRATOS_FISCALIZACAO: 'Contratos > Fiscalizacao',
    CONTRATOS_ALTERACOES: 'Contratos > Alteracoes',
    TI: 'Tecnologia da Informacao',
  },
} as const;

/**
 * Result of seeding jurisprudence into the PageIndex.
 */
export interface JurisprudenciaSeedResult {
  /** Total number of items seeded */
  total: number;

  /** Number of TCE-SP items seeded */
  tcespCount: number;

  /** Number of TCU items seeded */
  tcuCount: number;

  /** Document tree ID created */
  documentTreeId: string;

  /** Processing time in milliseconds */
  processingTimeMs: number;
}
