/**
 * Government Data Sync Types
 *
 * Type definitions for scheduled jobs that sync government data
 * (SINAPI, SICRO, and cache refresh).
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

/**
 * Job data for SINAPI sync
 */
export interface SinapiSyncJobData {
  /** Target UF to sync (optional, syncs all if not specified) */
  uf?: string;
  /** Target reference month (YYYY-MM), defaults to current month */
  mesReferencia?: string;
  /** Item type to sync (INSUMO, COMPOSICAO, or both) */
  tipo?: 'INSUMO' | 'COMPOSICAO' | 'ALL';
  /** Force re-sync even if already loaded */
  force?: boolean;
}

/**
 * Job data for SICRO sync
 */
export interface SicroSyncJobData {
  /** Target UF to sync (optional, syncs all if not specified) */
  uf?: string;
  /** Target reference month (YYYY-MM), defaults to current quarter */
  mesReferencia?: string;
  /** Item type to sync (INSUMO, COMPOSICAO, or both) */
  tipo?: 'INSUMO' | 'COMPOSICAO' | 'ALL';
  /** Force re-sync even if already loaded */
  force?: boolean;
}

/**
 * Job data for cache refresh
 */
export interface GovCacheRefreshJobData {
  /** Target cache to refresh (sinapi, sicro, pncp, comprasgov, all) */
  cacheType?: 'sinapi' | 'sicro' | 'pncp' | 'comprasgov' | 'contracts' | 'all';
  /** Maximum age of cache entries to keep (in hours) */
  maxAgeHours?: number;
}

/**
 * Job data for PNCP weekly check (#1166)
 * Checks for new contratações published in the last week
 */
export interface PncpWeeklyCheckJobData {
  /** Target UF to check (optional, checks all if not specified) */
  uf?: string;
  /** Number of days to look back (default: 7) */
  lookbackDays?: number;
  /** Force refresh even if recent data exists in cache */
  forceRefresh?: boolean;
}

/**
 * Job data for cache validation (#1166)
 * Validates cache integrity and reports statistics
 */
export interface CacheValidationJobData {
  /** Target cache to validate (sinapi, sicro, pncp, comprasgov, all) */
  cacheType?: 'sinapi' | 'sicro' | 'pncp' | 'comprasgov' | 'all';
  /** Whether to auto-repair inconsistencies */
  autoRepair?: boolean;
}

/**
 * Result of PNCP weekly check
 */
export interface PncpWeeklyCheckResult {
  /** Number of new contratações found */
  newContratacoes: number;
  /** Number of new atas found */
  newAtas: number;
  /** Number of new contratos found */
  newContratos: number;
  /** Date range checked */
  dateRange: {
    start: string;
    end: string;
  };
  /** UFs checked */
  ufsChecked: string[];
  /** Whether new data was found */
  hasNewData: boolean;
}

/**
 * Result of cache validation
 */
export interface CacheValidationResult {
  /** Cache type validated */
  cacheType: string;
  /** Total keys in cache */
  totalKeys: number;
  /** Number of expired keys found */
  expiredKeys: number;
  /** Number of corrupted entries */
  corruptedEntries: number;
  /** Number of entries repaired (if autoRepair enabled) */
  repairedEntries: number;
  /** Cache hit ratio since last validation */
  hitRatio: number;
  /** Cache health score (0-100) */
  healthScore: number;
  /** Issues found during validation */
  issues: string[];
}

/**
 * Sync result for tracking
 */
export interface GovDataSyncResult {
  /** Source (sinapi, sicro, cache) */
  source: string;
  /** Whether sync was successful */
  success: boolean;
  /** Number of items synced */
  itemsSynced: number;
  /** Number of errors encountered */
  errors: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Details about what was synced */
  details?: Record<string, unknown>;
}

/**
 * Brazilian states (UFs) for sync
 */
export const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export type BrazilianUF = (typeof BRAZILIAN_UFS)[number];

/**
 * Get current reference month in YYYY-MM format
 */
export function getCurrentReferenceMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get current quarter reference month in YYYY-MM format
 * SICRO is published quarterly (Jan, Apr, Jul, Oct)
 */
export function getCurrentQuarterReferenceMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 1; // 1, 4, 7, or 10
  const month = String(quarterMonth).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Queue names for gov data sync
 */
export const GOV_DATA_SYNC_QUEUE = 'gov-data-sync';
export const SINAPI_SYNC_JOB = 'sinapi-sync';
export const SICRO_SYNC_JOB = 'sicro-sync';
export const GOV_CACHE_REFRESH_JOB = 'gov-cache-refresh';
/** PNCP weekly check job - checks for new contratações (#1166) */
export const PNCP_WEEKLY_CHECK_JOB = 'pncp-weekly-check';
/** Cache validation job - validates cache integrity (#1166) */
export const CACHE_VALIDATION_JOB = 'cache-validation';
