/**
 * Price Aggregation Types
 *
 * Types for aggregating price references from multiple government sources
 * (PNCP, SINAPI, SICRO) with support for calculating consolidated averages.
 *
 * @module modules/gov-api/price-aggregation
 * @see https://github.com/CONFENGE/etp-express/issues/1159
 * @see Lei 14.133/2021 - Art. 23 (requires price research from multiple sources)
 */

import { GovApiSource } from '../interfaces/gov-api.interface';

/**
 * Individual price source data
 */
export interface PriceSource {
  /** Source API identifier */
  source: GovApiSource;
  /** Item code in the source system */
  code: string;
  /** Price value */
  price: number;
  /** Date when price was fetched */
  date: Date;
  /** Reference identifier (contract number, SINAPI code, etc.) */
  reference: string;
  /** Unit of measurement */
  unit: string;
  /** State (UF) if applicable */
  uf?: string;
  /** Whether price is desonerado (without social charges) */
  desonerado?: boolean;
}

/**
 * Confidence level for aggregated price
 * - HIGH: 3+ sources with low variance
 * - MEDIUM: 2 sources or 3+ with moderate variance
 * - LOW: 1 source or high variance between sources
 */
export type PriceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Aggregated price result combining multiple sources
 * Follows Art. 23 of Lei 14.133/2021 requirements
 */
export interface PriceAggregation {
  /** Normalized description of the item */
  description: string;
  /** Calculated average price */
  averagePrice: number;
  /** Median price (more robust to outliers) */
  medianPrice: number;
  /** Minimum price found */
  minPrice: number;
  /** Maximum price found */
  maxPrice: number;
  /** Individual price sources used in calculation */
  sources: PriceSource[];
  /** Number of sources used */
  sourceCount: number;
  /** Confidence level based on source count and variance */
  confidence: PriceConfidence;
  /** Coefficient of variation (CV) - standard deviation / mean */
  coefficientOfVariation: number;
  /** Methodology description for transparency */
  methodology: string;
  /** Whether outliers were excluded */
  outliersExcluded: boolean;
  /** Number of outliers excluded */
  outlierCount: number;
  /** Unit of measurement (normalized) */
  unit: string;
  /** Legal reference for the methodology */
  legalReference: string;
}

/**
 * Options for price aggregation calculation
 */
export interface PriceAggregationOptions {
  /** Minimum similarity threshold for matching items (0-1) */
  similarityThreshold?: number;
  /** Whether to exclude outliers from calculation */
  excludeOutliers?: boolean;
  /** Threshold for outlier detection (in standard deviations) */
  outlierStdDevThreshold?: number;
  /** Weights for each source (default: equal weights) */
  sourceWeights?: Partial<Record<GovApiSource, number>>;
  /** Preferred reference month for SINAPI/SICRO */
  mesReferencia?: string;
  /** Preferred state (UF) for regional prices */
  uf?: string;
}

/**
 * Search result with aggregated prices
 */
export interface PriceAggregationResult {
  /** Original search query */
  query: string;
  /** Aggregated price results */
  aggregations: PriceAggregation[];
  /** Raw prices that couldn't be aggregated */
  unmatchedPrices: PriceSource[];
  /** Total prices analyzed */
  totalPricesAnalyzed: number;
  /** Sources consulted */
  sourcesConsulted: GovApiSource[];
  /** Overall confidence level */
  overallConfidence: PriceConfidence;
  /** Timestamp of aggregation */
  timestamp: Date;
  /** Methodology summary */
  methodologySummary: string;
}

/**
 * Default similarity threshold for matching items
 * Two descriptions with similarity >= 0.85 are considered the same item
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

/**
 * Default outlier detection threshold (2.5 standard deviations)
 */
export const DEFAULT_OUTLIER_STD_DEV_THRESHOLD = 2.5;

/**
 * Default source weights (equal weighting)
 */
export const DEFAULT_SOURCE_WEIGHTS: Record<GovApiSource, number> = {
  pncp: 1.0,
  comprasgov: 1.0,
  sinapi: 1.2, // Slightly higher weight for official reference tables
  sicro: 1.2, // Slightly higher weight for official reference tables
};

/**
 * Legal reference for price research methodology
 * Lei 14.133/2021, Art. 23 - Price Research Requirements
 */
export const LEGAL_REFERENCE =
  'Lei 14.133/2021, Art. 23 - Pesquisa de Preços para Aquisições';

/**
 * Methodology description template
 */
export const METHODOLOGY_TEMPLATE = {
  WEIGHTED_AVERAGE:
    'Média ponderada de {count} fontes ({sources}), com pesos baseados na confiabilidade da fonte.',
  SIMPLE_AVERAGE: 'Média aritmética simples de {count} fontes ({sources}).',
  MEDIAN:
    'Mediana de {count} fontes ({sources}), utilizada devido à alta variância entre os valores.',
  SINGLE_SOURCE:
    'Valor único de {source}. Recomenda-se consulta adicional para maior confiabilidade.',
};
