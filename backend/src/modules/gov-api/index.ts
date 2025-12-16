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

// PNCP (Portal Nacional de Contratações Públicas)
export { PncpModule, PncpService } from './pncp';
export {
  PncpContratacao,
  PncpContrato,
  PncpAta,
  PncpPaginatedResponse,
  PncpContratacaoSearchParams,
  PncpContratoSearchParams,
  PncpAtaSearchParams,
  PncpModalidade,
  PncpSituacaoContratacao,
  PncpCategoriaProcesso,
  PNCP_MODALIDADE_NAMES,
  PNCP_SITUACAO_NAMES,
  PNCP_CATEGORIA_NAMES,
} from './pncp/pncp.types';

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

// SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil)
export {
  SinapiModule,
  SinapiService,
  SinapiItemType,
  SinapiCategoria,
  SinapiUF,
  SinapiSearchFilters,
  SinapiPriceReference,
  SinapiInsumoRaw,
  SinapiComposicaoRaw,
  SinapiParseResult,
  SinapiExcelMetadata,
  buildSinapiCacheKey,
  formatMesReferencia,
  parseMesReferencia,
  SinapiParser,
  createSinapiParser,
} from './sinapi';
