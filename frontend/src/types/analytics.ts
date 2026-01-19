/**
 * Analytics types for overprice alert system.
 * Issue #1274 - Integrate price alerts in ETP wizard
 *
 * These types match backend DTOs from:
 * @see backend/src/modules/market-intelligence/dto/overprice-alert.dto.ts
 */

/**
 * Alert level classification for overprice detection.
 * Matches backend enum at backend/src/entities/overprice-alert.entity.ts
 */
export enum AlertLevel {
  /** Price is within acceptable range (0-20% above median) */
  OK = 'OK',
  /** Price slightly above median (20-40%) - worth noting */
  ATTENTION = 'ATTENTION',
  /** Price significantly above median (40-60%) - TCE may question */
  WARNING = 'WARNING',
  /** Price critically above median (>60%) - high risk of audit findings */
  CRITICAL = 'CRITICAL',
}

/**
 * Input DTO for checking a price against benchmarks.
 */
export interface CheckPriceRequest {
  /** Price to check against benchmark */
  price: number;
  /** Item description for context */
  itemDescription: string;
  /** Brazilian state (2-letter code) */
  uf: string;
  /** Category ID for precise benchmark lookup (optional) */
  categoryId?: string;
  /** Category code (CATMAT/CATSER) (optional) */
  categoryCode?: string;
  /** Item code for reference (optional) */
  itemCode?: string;
  /** ETP ID to associate the alert with (optional) */
  etpId?: string;
  /** Whether to persist the alert to database (default: true) */
  persistAlert?: boolean;
}

/**
 * Response DTO for price check result.
 */
export interface CheckPriceResponse {
  /** Alert ID (if persisted) */
  alertId?: string;
  /** Input price that was checked */
  informedPrice: number;
  /** Median price from benchmark */
  medianPrice: number;
  /** Percentage above median (negative if below) */
  percentageAbove: number;
  /** Alert classification level */
  alertLevel: AlertLevel;
  /** Human-readable suggestion message */
  suggestion: string;
  /** Suggested price range - lower bound */
  suggestedPriceLow: number;
  /** Suggested price range - upper bound */
  suggestedPriceHigh: number;
  /** Number of samples used in the benchmark */
  benchmarkSampleCount: number;
  /** Benchmark UF used */
  benchmarkUf: string;
  /** Whether the alert was persisted */
  persisted: boolean;
  /** Whether benchmark data was available */
  benchmarkAvailable: boolean;
  /** Category information if matched */
  category?: {
    id: string;
    code: string;
    name: string;
  };
}

/**
 * Alert threshold configuration.
 */
export interface AlertThresholds {
  /** Threshold for ATTENTION level (percentage) */
  attention: number;
  /** Threshold for WARNING level (percentage) */
  warning: number;
  /** Threshold for CRITICAL level (percentage) */
  critical: number;
}
