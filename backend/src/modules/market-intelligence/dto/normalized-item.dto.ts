import { ItemCategoryType } from '../../../entities/item-category.entity';

/**
 * Features extracted from an item description for classification.
 * Used by ItemNormalizationService to assist LLM classification.
 *
 * @see ItemNormalizationService
 * @see Issue #1603 - ItemNormalizationService with LLM classification
 */
export interface ItemFeatures {
  /**
   * Original item description (cleaned and normalized).
   */
  description: string;

  /**
   * Keywords extracted from description.
   * Used for category matching and similarity calculations.
   */
  keywords: string[];

  /**
   * Original unit of measurement from source.
   */
  unit: string;

  /**
   * Estimated category type based on keywords heuristics.
   * Used as a hint for LLM classification.
   */
  estimatedCategory: 'material' | 'servico';

  /**
   * Quantity extracted from source (if available).
   */
  quantity?: number;

  /**
   * Price extracted from source (if available).
   */
  price?: number;
}

/**
 * Input item structure for normalization.
 * Represents a contract item from PNCP, Compras.gov, or other sources.
 *
 * @see Issue #1269 - Contract Price Collector
 * @see Issue #1603 - ItemNormalizationService
 */
export interface ContractItem {
  /**
   * Unique identifier from source (e.g., PNCP item ID).
   */
  id: string;

  /**
   * Item description (raw from source).
   */
  description: string;

  /**
   * Unit of measurement (UN, KG, M², etc.).
   */
  unit: string;

  /**
   * Quantity (if available).
   */
  quantity?: number;

  /**
   * Unit price (if available).
   */
  unitPrice?: number;

  /**
   * Total value (quantity * unitPrice, if available).
   */
  totalValue?: number;

  /**
   * Source system identifier.
   */
  source: 'pncp' | 'comprasgov' | 'atas' | 'manual';

  /**
   * Source contract/process number.
   */
  sourceReference?: string;

  /**
   * Date when price was captured.
   */
  priceDate?: Date;

  /**
   * State (UF) for regional pricing.
   */
  uf?: string;

  /**
   * CATMAT code if already classified at source.
   */
  catmatCode?: string;

  /**
   * CATSER code if already classified at source.
   */
  catserCode?: string;
}

/**
 * Normalized item result from ItemNormalizationService.
 * Contains the original item data plus classification and normalization results.
 *
 * @see ItemNormalizationService
 * @see Issue #1603 - ItemNormalizationService with LLM classification
 */
export interface NormalizedItem extends ContractItem {
  /**
   * Assigned category from ItemCategory entity.
   */
  category: {
    /**
     * Category ID (UUID).
     */
    id: string;

    /**
     * Category code (e.g., CATMAT-44122, CATSER-10391).
     */
    code: string;

    /**
     * Category name/description.
     */
    name: string;

    /**
     * Category type (CATMAT or CATSER).
     */
    type: ItemCategoryType;
  } | null;

  /**
   * Normalized unit of measurement.
   * Standardized from various input formats (e.g., "UNIDADE" -> "UN").
   */
  normalizedUnit: string;

  /**
   * Extracted features used for classification.
   */
  features: ItemFeatures;

  /**
   * Confidence score of the classification (0.0 to 1.0).
   * - 1.0: Exact CATMAT/CATSER code match from source
   * - 0.8-0.99: High confidence LLM classification
   * - 0.5-0.79: Medium confidence, may need review
   * - < 0.5: Low confidence, requires manual review
   */
  confidence: number;

  /**
   * Classification method used.
   * - 'source': Category came from source system (CATMAT/CATSER code)
   * - 'llm': Category assigned by LLM classification
   * - 'similarity': Category assigned by text similarity algorithm
   * - 'manual': Category assigned manually by user
   */
  classificationMethod: 'source' | 'llm' | 'similarity' | 'manual';

  /**
   * Timestamp when normalization was performed.
   */
  normalizedAt: Date;

  /**
   * Whether this item requires manual review.
   * True when confidence < 0.5 or classification conflicts with source.
   */
  requiresReview: boolean;

  /**
   * Review notes (if requires review or after manual review).
   */
  reviewNotes?: string;
}

/**
 * Batch normalization request.
 */
export interface NormalizationBatchRequest {
  /**
   * Items to normalize.
   */
  items: ContractItem[];

  /**
   * Processing options.
   */
  options?: {
    /**
     * Skip items already classified at source.
     * @default false
     */
    skipClassified?: boolean;

    /**
     * Confidence threshold for automatic acceptance.
     * Items below this threshold are marked for review.
     * @default 0.7
     */
    confidenceThreshold?: number;

    /**
     * Maximum items to process in parallel.
     * @default 10
     */
    batchSize?: number;
  };
}

/**
 * Batch normalization result.
 */
export interface NormalizationBatchResult {
  /**
   * Successfully normalized items.
   */
  items: NormalizedItem[];

  /**
   * Processing statistics.
   */
  stats: {
    /**
     * Total items processed.
     */
    total: number;

    /**
     * Items successfully classified.
     */
    classified: number;

    /**
     * Items requiring manual review.
     */
    requiresReview: number;

    /**
     * Items that failed classification.
     */
    failed: number;

    /**
     * Average confidence score.
     */
    averageConfidence: number;

    /**
     * Processing time in milliseconds.
     */
    processingTimeMs: number;
  };

  /**
   * Errors encountered during processing.
   */
  errors: Array<{
    itemId: string;
    error: string;
  }>;
}

/**
 * Unit normalization mapping.
 * Maps common variations to standard units.
 */
export const UNIT_NORMALIZATION_MAP: Record<string, string> = {
  // Unidade
  UNIDADE: 'UN',
  UNID: 'UN',
  'UNID.': 'UN',
  UND: 'UN',
  'UND.': 'UN',
  UNIT: 'UN',
  PÇ: 'UN',
  PC: 'UN',
  PECA: 'UN',
  PEÇA: 'UN',

  // Pacote
  PACOTE: 'PCT',
  PCTE: 'PCT',
  PAC: 'PCT',
  'PAC.': 'PCT',
  PK: 'PCT',
  PACK: 'PCT',

  // Caixa
  CAIXA: 'CX',
  CX: 'CX',
  'CX.': 'CX',

  // Quilograma
  QUILOGRAMA: 'KG',
  QUILO: 'KG',
  'KG.': 'KG',

  // Litro
  LITRO: 'L',
  LT: 'L',
  'L.': 'L',
  LTR: 'L',

  // Metro
  METRO: 'M',
  'M.': 'M',
  MT: 'M',

  // Metro quadrado
  'METRO QUADRADO': 'M2',
  'M²': 'M2',
  M2: 'M2',
  'M2.': 'M2',
  MQ: 'M2',

  // Metro cúbico
  'METRO CUBICO': 'M3',
  'METRO CÚBICO': 'M3',
  'M³': 'M3',
  M3: 'M3',
  'M3.': 'M3',
  MC: 'M3',

  // Hora
  HORA: 'H',
  HR: 'H',
  'H.': 'H',
  HRS: 'H',

  // Dia
  DIA: 'DIA',
  'DIA.': 'DIA',
  DIARIA: 'DIA',
  DIÁRIA: 'DIA',

  // Mês
  MES: 'MES',
  MÊS: 'MES',
  MENSAL: 'MES',

  // Resma
  RESMA: 'RM',
  RM: 'RM',

  // Milheiro
  MILHEIRO: 'MIL',
  MIL: 'MIL',

  // Serviço
  SERVICO: 'SV',
  SERVIÇO: 'SV',
  SV: 'SV',

  // Global/Verba
  GLOBAL: 'GB',
  GB: 'GB',
  VERBA: 'VB',
  VB: 'VB',
};
