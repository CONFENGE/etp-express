/**
 * Government API Interfaces
 *
 * Base interfaces for Brazilian government API integrations:
 * - PNCP (Portal Nacional de Contratacoes Publicas)
 * - Compras.gov.br (SIASG)
 * - SINAPI (Sistema Nacional de Pesquisa de Custos)
 * - SICRO (Sistema de Custos Rodoviarios)
 *
 * @module modules/gov-api/interfaces
 */

import { SearchStatus, SourceStatus } from '../types/search-result';

/**
 * Standard search result from government APIs
 */
export interface GovApiSearchResult {
 /** Unique identifier from the source API */
 id: string;
 /** Title or description of the item */
 title: string;
 /** Detailed description or snippet */
 description: string;
 /** Source API identifier */
 source: GovApiSource;
 /** Original URL to the item */
 url?: string;
 /** Relevance score (0-1) */
 relevance: number;
 /** Additional metadata from the source */
 metadata?: Record<string, unknown>;
 /** Timestamp when data was fetched */
 fetchedAt: Date;
}

/**
 * Government API sources supported
 */
export type GovApiSource = 'pncp' | 'comprasgov' | 'sinapi' | 'sicro';

/**
 * Standard response wrapper from government APIs
 *
 * Now includes structured status information to differentiate
 * between "no results" and "service unavailable" scenarios.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/755
 */
export interface GovApiResponse<T = GovApiSearchResult[]> {
 /** Response data */
 data: T;
 /** Total results available (for pagination) */
 total: number;
 /** Current page */
 page: number;
 /** Results per page */
 perPage: number;
 /** Source API */
 source: GovApiSource;
 /** Whether response is from cache */
 cached: boolean;
 /**
 * Whether response is from fallback
 * @deprecated Use `status` field instead for better differentiation
 */
 isFallback: boolean;
 /** Response timestamp */
 timestamp: Date;
 /**
 * Structured status indicating success, partial, or service unavailable
 * This allows frontend to differentiate between "no results" and "error"
 */
 status?: SearchStatus;
 /**
 * Detailed status for each source (when aggregating multiple sources)
 */
 sourceStatuses?: SourceStatus[];
 /**
 * Human-readable status message for the user
 */
 statusMessage?: string;
}

/**
 * Pagination options for API requests
 */
export interface GovApiPaginationOptions {
 /** Page number (1-indexed) */
 page?: number;
 /** Results per page */
 perPage?: number;
}

/**
 * Base filter options for government API searches
 */
export interface GovApiFilterOptions extends GovApiPaginationOptions {
 /** Start date for date range filter */
 startDate?: Date;
 /** End date for date range filter */
 endDate?: Date;
 /** UF (state) filter */
 uf?: string;
 /** Municipality filter */
 municipio?: string;
 /** Organization (orgao) filter */
 orgao?: string;
}

/**
 * Contract search specific filters (PNCP, Compras.gov.br)
 */
export interface ContractSearchFilters extends GovApiFilterOptions {
 /** Modality (pregao, concorrencia, etc.) */
 modalidade?: string;
 /** Contract status */
 status?: 'aberto' | 'encerrado' | 'homologado' | 'cancelado';
 /** Minimum value */
 valorMinimo?: number;
 /** Maximum value */
 valorMaximo?: number;
 /** CNPJ of organization */
 cnpj?: string;
}

/**
 * Price reference search filters (SINAPI, SICRO)
 */
export interface PriceSearchFilters extends GovApiFilterOptions {
 /** Reference month (YYYY-MM format) */
 mesReferencia?: string;
 /** Item code */
 codigo?: string;
 /** Item category */
 categoria?: string;
 /** Desonerado (without taxes) */
 desonerado?: boolean;
}

/**
 * Health check result for API monitoring
 */
export interface GovApiHealthStatus {
 /** API source */
 source: GovApiSource;
 /** Whether API is available */
 healthy: boolean;
 /** Response latency in milliseconds */
 latencyMs: number;
 /** Last successful check timestamp */
 lastCheck: Date;
 /** Error message if unhealthy */
 error?: string;
 /** Circuit breaker state */
 circuitState: 'closed' | 'open' | 'half-open';
}

/**
 * Cache configuration for a specific API source
 */
export interface GovApiCacheConfig {
 /** Cache key prefix */
 prefix: string;
 /** TTL in seconds */
 ttlSeconds: number;
 /** Whether cache is enabled */
 enabled: boolean;
}

/**
 * Rate limiting configuration
 */
export interface GovApiRateLimitConfig {
 /** Maximum requests per window */
 maxRequests: number;
 /** Window duration in milliseconds */
 windowMs: number;
 /** Whether to throw error on limit exceeded */
 throwOnLimit: boolean;
}

/**
 * Base service interface for government API integrations
 *
 * All government API services must implement this interface to ensure
 * consistent behavior and easy integration with the unified search service.
 */
export interface IGovApiService {
 /** API source identifier */
 readonly source: GovApiSource;

 /**
 * Search for contracts or items matching the query
 * @param query Search query string
 * @param filters Optional filters
 * @returns Paginated search results
 */
 search(
 query: string,
 filters?: GovApiFilterOptions,
 ): Promise<GovApiResponse<GovApiSearchResult[]>>;

 /**
 * Get a specific item by ID
 * @param id Item identifier
 * @returns Single item or null if not found
 */
 getById(id: string): Promise<GovApiSearchResult | null>;

 /**
 * Check API health and connectivity
 * @returns Health status including latency
 */
 healthCheck(): Promise<GovApiHealthStatus>;

 /**
 * Get current circuit breaker state
 * @returns Circuit state information
 */
 getCircuitState(): {
 opened: boolean;
 halfOpen: boolean;
 closed: boolean;
 stats: Record<string, unknown>;
 };

 /**
 * Get cache statistics for this API
 * @returns Cache hit/miss stats
 */
 getCacheStats(): {
 hits: number;
 misses: number;
 keys: number;
 };
}

/**
 * Contract data structure from PNCP/Compras.gov.br
 */
export interface GovApiContract extends GovApiSearchResult {
 /** Contract number */
 numero: string;
 /** Year */
 ano: number;
 /** Contracting organization */
 orgaoContratante: {
 cnpj: string;
 nome: string;
 uf: string;
 };
 /** Contract object description */
 objeto: string;
 /** Total value */
 valorTotal: number;
 /** Modality */
 modalidade: string;
 /** Status */
 status: string;
 /** Publication date */
 dataPublicacao: Date;
 /** Opening date */
 dataAbertura?: Date;
}

/**
 * Price reference data structure from SINAPI/SICRO
 */
export interface GovApiPriceReference extends GovApiSearchResult {
 /** Item code */
 codigo: string;
 /** Item description */
 descricao: string;
 /** Unit */
 unidade: string;
 /** Unit price */
 precoUnitario: number;
 /** Reference month */
 mesReferencia: string;
 /** State (UF) */
 uf: string;
 /** Whether price is desonerado */
 desonerado: boolean;
 /** Category */
 categoria: string;
}
