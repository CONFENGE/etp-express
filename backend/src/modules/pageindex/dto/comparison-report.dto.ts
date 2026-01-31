/**
 * Comparison Report DTOs
 *
 * Data Transfer Objects for multi-edital price comparison and anomaly detection.
 *
 * This module defines the structure of reports generated when comparing prices
 * across multiple editais to identify anomalies and potential overpricing.
 *
 * @module modules/pageindex/dto/comparison-report
 * @see Issue #1697 - [INTEL-1545d] Implementar EditalComparisonService para análise de preços
 */

/**
 * Anomaly category for pricing analysis
 */
export enum AnomaliaCategoria {
  /** Price is within normal range (within 2 standard deviations) */
  NORMAL = 'normal',
  /** Price requires attention (between 2-3 standard deviations) */
  ATENCAO = 'atenção',
  /** Price indicates potential overpricing (> 3 standard deviations) */
  SOBREPRECO = 'sobrepreço',
}

/**
 * Outlier detection result for a specific item in an edital
 */
export interface OutlierDetection {
  /** Edital identifier */
  editalId: string;
  /** Item price */
  preco: number;
  /** Percentage deviation from mean */
  desvioPercentual: number;
  /** Z-score (number of standard deviations from mean) */
  zScore: number;
  /** Anomaly category */
  categoria: AnomaliaCategoria;
}

/**
 * Comparison statistics for a normalized item across multiple editais
 */
export interface ItemComparado {
  /** Normalized item description */
  descricao: string;
  /** Item category (if available) */
  categoria?: string;
  /** Number of occurrences across editais */
  ocorrencias: number;
  /** Average price */
  precoMedio: number;
  /** Median price */
  precoMediana: number;
  /** Standard deviation */
  desvio: number;
  /** Minimum price found */
  precoMinimo: number;
  /** Maximum price found */
  precoMaximo: number;
  /** Outliers detected (prices > 2 std deviations) */
  outliers: OutlierDetection[];
}

/**
 * Multi-edital comparison report with statistical analysis
 */
export interface ComparisonReport {
  /** Items compared with statistical analysis */
  itensComparados: ItemComparado[];
  /** Number of overpricing alerts (categoria = 'sobrepreço') */
  alertasSobrepreco: number;
  /** Confidence score based on sample size (0-100) */
  confiabilidade: number;
  /** Report generation timestamp */
  geradoEm: string;
  /** Edital IDs included in comparison */
  editaisAnalisados: string[];
  /** Total number of unique items analyzed */
  totalItens: number;
}
