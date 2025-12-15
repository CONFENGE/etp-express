/**
 * Government API Module - Public Exports
 *
 * @module modules/gov-api
 */

// Module
export { GovApiModule } from './gov-api.module';

// Interfaces
export {
  GovApiSearchResult,
  GovApiSource,
  GovApiResponse,
  GovApiPaginationOptions,
  GovApiFilterOptions,
  ContractSearchFilters,
  PriceSearchFilters,
  GovApiHealthStatus,
  GovApiCacheConfig,
  GovApiRateLimitConfig,
  IGovApiService,
  GovApiContract,
  GovApiPriceReference,
} from './interfaces/gov-api.interface';

// Utilities
export {
  GovApiClient,
  GovApiClientConfig,
  createGovApiClient,
} from './utils/gov-api-client';

export { GovApiCache } from './utils/gov-api-cache';

// Compras.gov.br (SIASG) integration
export {
  ComprasGovModule,
  ComprasGovService,
  ComprasGovModalidade,
  ComprasGovSituacao,
  ComprasGovLicitacaoRaw,
  ComprasGovSearchFilters,
  ComprasGovContract,
} from './compras-gov';
