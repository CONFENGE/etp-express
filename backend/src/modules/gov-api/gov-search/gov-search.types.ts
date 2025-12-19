/**
 * Government Search Service Types
 *
 * Types for unified government data search service that aggregates
 * results from PNCP, Compras.gov.br, SINAPI, and SICRO.
 *
 * @module modules/gov-api/gov-search
 * @see https://github.com/CONFENGE/etp-express/issues/755
 */

import {
 GovApiContract,
 GovApiPriceReference,
} from '../interfaces/gov-api.interface';
import { SearchStatus, SourceStatus } from '../types/search-result';

/**
 * Search options for unified government search
 */
export interface GovSearchOptions {
 /** Whether to include price references (SINAPI/SICRO) */
 includePrecos?: boolean;
 /** Whether to filter for infrastructure-related items */
 isInfrastructure?: boolean;
 /** Whether to filter for construction-related items */
 isConstrucaoCivil?: boolean;
 /** Maximum results per source */
 maxPerSource?: number;
 /** Start date for contract search */
 startDate?: Date;
 /** End date for contract search */
 endDate?: Date;
 /** State (UF) filter */
 uf?: string;
 /** Reference month for price search (YYYY-MM) */
 mesReferencia?: string;
 /** Whether to enable Exa fallback */
 enableExaFallback?: boolean;
}

/**
 * Consolidated search result from multiple government sources
 *
 * Now includes structured status information to differentiate
 * between "no results" and "service unavailable" scenarios.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/755
 */
export interface GovSearchResult {
 /** Contract results from PNCP and Compras.gov.br */
 contracts: GovApiContract[];
 /** Price references from SINAPI and SICRO */
 prices: {
 sinapi: GovApiPriceReference[];
 sicro: GovApiPriceReference[];
 };
 /** Sources that were queried */
 sources: string[];
 /** Whether Exa fallback was used */
 fallbackUsed: boolean;
 /** Total results across all sources */
 totalResults: number;
 /** Search query used */
 query: string;
 /** Timestamp of search */
 timestamp: Date;
 /** Whether results are from cache */
 cached: boolean;
 /**
 * Overall search status
 * - SUCCESS: All sources responded successfully
 * - PARTIAL: Some sources responded, some failed
 * - SERVICE_UNAVAILABLE: All sources failed
 */
 status: SearchStatus;
 /**
 * Detailed status for each source queried
 * Frontend can use this to show which sources failed
 */
 sourceStatuses: SourceStatus[];
 /**
 * Human-readable status message for the user
 */
 statusMessage: string;
}

/**
 * Threshold configuration for Exa fallback
 */
export interface ExaFallbackConfig {
 /** Minimum contract results before triggering fallback */
 minContractResults: number;
 /** Whether fallback is enabled */
 enabled: boolean;
}

/**
 * Default Exa fallback threshold
 * Fallback triggers if contract results < 3
 */
export const DEFAULT_EXA_FALLBACK_THRESHOLD = 3;

/**
 * Default maximum results per source
 */
export const DEFAULT_MAX_PER_SOURCE = 10;
