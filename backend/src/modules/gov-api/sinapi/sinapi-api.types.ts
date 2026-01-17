/**
 * SINAPI API Types
 *
 * Type definitions for SINAPI API integration via Orcamentador.
 * This provides REST API access to SINAPI data with JSON responses.
 *
 * @module modules/gov-api/sinapi
 * @see https://orcamentador.com.br/api/docs
 * @see https://github.com/CONFENGE/etp-express/issues/1565
 */

/**
 * SINAPI API Search Parameters
 */
export interface SinapiApiSearchParams {
  /** Search by item name/description */
  nome?: string;
  /** Search by item code */
  codigo?: number;
  /** Filter by state (UF) */
  estado?: string;
  /** Reference date (YYYY-MM-DD format) */
  referencia?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Results per page (default: 50, max: 100) */
  limit?: number;
  /** Filter by regime: DESONERADO or NAO_DESONERADO */
  regime?: 'DESONERADO' | 'NAO_DESONERADO';
}

/**
 * SINAPI Insumo (Input) from API
 */
export interface SinapiApiInsumo {
  /** Item code */
  codigo: number;
  /** Item name/description */
  nome: string;
  /** Unit of measurement */
  unidade: string;
  /** Price with tax exemption (desonerado) */
  preco_desonerado: number;
  /** Price without tax exemption (onerado/nao_desonerado) */
  preco_naodesonerado: number;
  /** Item type: MATERIAL, MAO DE OBRA, EQUIPAMENTO */
  tipo: 'MATERIAL' | 'MAO DE OBRA' | 'EQUIPAMENTO';
  /** Item class/category */
  classe?: string;
  /** Reference date */
  referencia?: string;
  /** State (UF) */
  estado?: string;
}

/**
 * SINAPI Composicao (Composition) from API
 */
export interface SinapiApiComposicao {
  /** Composition code */
  codigo: number;
  /** Composition name/description */
  nome: string;
  /** Unit of measurement */
  unidade: string;
  /** Total price desonerado */
  preco_desonerado: number;
  /** Total price nao_desonerado */
  preco_naodesonerado: number;
  /** Class/category description */
  classe?: string;
  /** Reference date */
  referencia?: string;
  /** State (UF) */
  estado?: string;
}

/**
 * SINAPI Composicao Detail with breakdown
 */
export interface SinapiApiComposicaoDetail extends SinapiApiComposicao {
  /** Labor cost component */
  custo_mao_de_obra?: number;
  /** Material cost component */
  custo_material?: number;
  /** Equipment cost component */
  custo_equipamento?: number;
  /** Composition items */
  itens?: SinapiApiComposicaoItem[];
}

/**
 * Item within a Composicao
 */
export interface SinapiApiComposicaoItem {
  /** Item code */
  codigo: number;
  /** Item description */
  descricao: string;
  /** Unit */
  unidade: string;
  /** Coefficient (quantity used) */
  coeficiente: number;
  /** Unit price */
  preco_unitario: number;
  /** Total price (coeficiente * preco_unitario) */
  preco_total: number;
  /** Item type */
  tipo: 'INSUMO' | 'COMPOSICAO';
}

/**
 * SINAPI Composicao Exploded (with all nested items)
 */
export interface SinapiApiComposicaoExploded {
  /** Root composition */
  composicao: SinapiApiComposicaoDetail;
  /** All insumos used (flattened) */
  insumos: SinapiApiInsumo[];
  /** Total counts by type */
  totais: {
    insumos: number;
    mao_de_obra: number;
    equipamentos: number;
    materiais: number;
  };
}

/**
 * SINAPI Price History
 */
export interface SinapiApiHistorico {
  /** Reference date (YYYY-MM-DD) */
  referencia: string;
  /** Price desonerado */
  preco_desonerado: number;
  /** Price nao_desonerado */
  preco_naodesonerado: number;
  /** Variation from previous month (percentage) */
  variacao?: number;
}

/**
 * SINAPI Encargos Sociais (Social Charges)
 */
export interface SinapiApiEncargos {
  /** State (UF) */
  estado: string;
  /** Regime */
  regime: 'DESONERADO' | 'NAO_DESONERADO';
  /** Reference date */
  referencia: string;
  /** Encargos by category */
  encargos: {
    horista?: number;
    mensalista?: number;
    servico?: number;
  };
}

/**
 * SINAPI Estado (State) info
 */
export interface SinapiApiEstado {
  /** State code (UF) */
  sigla: string;
  /** State name */
  nome: string;
  /** Region */
  regiao: string;
  /** Whether has data available */
  disponivel: boolean;
}

/**
 * SINAPI Indicadores (Economic Indicators)
 */
export interface SinapiApiIndicadores {
  /** Reference date */
  referencia: string;
  /** CUB (Custo Unitario Basico) values by state */
  cub?: Record<string, number>;
  /** INCC (Indice Nacional de Custo da Construcao) */
  incc?: number;
  /** IGP-M */
  igpm?: number;
}

/**
 * SINAPI API Update info
 */
export interface SinapiApiAtualizacao {
  /** Last update date */
  ultima_atualizacao: string;
  /** Reference month available */
  referencia_disponivel: string;
  /** States updated */
  estados_atualizados: string[];
  /** Update notes */
  notas?: string;
}

/**
 * SINAPI API Status
 */
export interface SinapiApiStatus {
  /** API status */
  status: 'online' | 'maintenance' | 'offline';
  /** API version */
  versao: string;
  /** Server timestamp */
  timestamp: string;
  /** Message */
  mensagem?: string;
}

/**
 * Rate Limit information from response headers
 */
export interface SinapiApiRateLimitInfo {
  /** Requests allowed per minute */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when limit resets */
  reset: number;
  /** Monthly request limit */
  monthlyLimit: number;
  /** Requests used this month */
  monthlyUsed: number;
  /** Remaining monthly requests */
  monthlyRemaining: number;
}

/**
 * API Usage statistics
 */
export interface SinapiApiUsage {
  /** Total requests made */
  total_requests: number;
  /** Requests this month */
  monthly_requests: number;
  /** Monthly limit */
  monthly_limit: number;
  /** Reset date for monthly limit */
  reset_date: string;
  /** Plan name */
  plan: string;
}

/**
 * Paginated response wrapper
 */
export interface SinapiApiPaginatedResponse<T> {
  /** Response data */
  data: T[];
  /** Total items available */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  pages: number;
}

/**
 * Error response from API
 */
export interface SinapiApiErrorResponse {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: Record<string, unknown>;
  /** HTTP status code */
  status: number;
}

/**
 * SINAPI API Configuration
 */
export interface SinapiApiConfig {
  /** Base URL of the API */
  baseUrl: string;
  /** API Key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Cache TTL in seconds */
  cacheTtl: number;
  /** Whether to enable request retries */
  enableRetry: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Build cache key for SINAPI API requests
 */
export function buildSinapiApiCacheKey(
  endpoint: string,
  params?: SinapiApiSearchParams | Record<string, unknown>,
): string {
  if (!params || Object.keys(params).length === 0) {
    return `sinapi:api:${endpoint}`;
  }

  const sortedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `sinapi:api:${endpoint}:${sortedParams}`;
}
