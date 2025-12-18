/**
 * Search Result Types for Frontend
 *
 * Mirrors backend types from backend/src/modules/gov-api/types/search-result.ts
 * to handle structured search results that differentiate between
 * "no results" and "service unavailable" scenarios.
 *
 * @see https://github.com/CONFENGE/etp-express/issues/756
 */

/**
 * Search operation status
 *
 * Differentiates between:
 * - SUCCESS: All sources responded, results may be empty (legitimately no data)
 * - PARTIAL: Some sources responded, some failed
 * - SERVICE_UNAVAILABLE: All sources failed or circuit breaker is open
 * - RATE_LIMITED: Request was rate limited
 * - TIMEOUT: Request timed out
 */
export enum SearchStatus {
  /** All sources responded successfully */
  SUCCESS = 'SUCCESS',
  /** Some sources responded, some failed */
  PARTIAL = 'PARTIAL',
  /** All sources failed or unavailable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** Request was rate limited */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',
}

/**
 * Individual source status in a search result
 */
export interface SourceStatus {
  /** Source identifier (e.g., 'pncp', 'comprasgov', 'sinapi', 'sicro', 'exa') */
  name: string;
  /** Source status */
  status: SearchStatus;
  /** Error message if failed */
  error?: string;
  /** Response latency in ms */
  latencyMs?: number;
  /** Number of results from this source */
  resultCount?: number;
}

/**
 * Source display configuration
 */
export interface SourceDisplayConfig {
  /** Source identifier */
  name: string;
  /** Human-readable label in Portuguese */
  label: string;
  /** Full name of the source */
  fullName: string;
}

/**
 * Map of source names to display configuration
 */
export const SOURCE_DISPLAY_CONFIG: Record<string, SourceDisplayConfig> = {
  pncp: {
    name: 'pncp',
    label: 'PNCP',
    fullName: 'Portal Nacional de Contratações Públicas',
  },
  comprasgov: {
    name: 'comprasgov',
    label: 'Compras.gov.br',
    fullName: 'Sistema Integrado de Administração de Serviços Gerais',
  },
  sinapi: {
    name: 'sinapi',
    label: 'SINAPI',
    fullName: 'Sistema Nacional de Pesquisa de Custos e Índices',
  },
  sicro: {
    name: 'sicro',
    label: 'SICRO',
    fullName: 'Sistema de Custos Referenciais de Obras',
  },
  exa: {
    name: 'exa',
    label: 'Exa',
    fullName: 'Busca Web Complementar',
  },
};

/**
 * Get display configuration for a source
 */
export function getSourceDisplayConfig(
  sourceName: string,
): SourceDisplayConfig {
  return (
    SOURCE_DISPLAY_CONFIG[sourceName.toLowerCase()] || {
      name: sourceName,
      label: sourceName.toUpperCase(),
      fullName: sourceName,
    }
  );
}

/**
 * Generate user-friendly message based on status
 *
 * @param status - Search status
 * @param failedSources - Names of sources that failed
 * @returns User-friendly message in Portuguese
 */
export function getStatusMessage(
  status: SearchStatus,
  failedSources: string[] = [],
): string {
  switch (status) {
    case SearchStatus.SUCCESS:
      return 'Busca realizada com sucesso';
    case SearchStatus.PARTIAL:
      if (failedSources.length > 0) {
        const failedNames = failedSources
          .map((s) => getSourceDisplayConfig(s).label)
          .join(', ');
        return `Busca parcial: ${failedNames} indisponível(is)`;
      }
      return 'Busca parcial: algumas fontes indisponíveis';
    case SearchStatus.SERVICE_UNAVAILABLE:
      return 'Serviços governamentais temporariamente indisponíveis. Tente novamente em alguns minutos.';
    case SearchStatus.RATE_LIMITED:
      return 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.';
    case SearchStatus.TIMEOUT:
      return 'A busca demorou mais que o esperado. Tente novamente.';
    default:
      return 'Erro desconhecido na busca';
  }
}
