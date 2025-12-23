/**
 * API Error Message Utilities
 *
 * Provides user-friendly error messages for API failures.
 * Maps technical error codes and messages to contextual, actionable messages.
 *
 * @see Issue #792 - Mensagens de erro amigáveis para falhas de API
 */

/**
 * HTTP status codes with user-friendly messages.
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Dados inválidos. Verifique as informações e tente novamente.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para acessar este recurso.',
  404: 'Recurso não encontrado.',
  408: 'A requisição demorou muito. Tente novamente.',
  409: 'Conflito de dados. Atualize a página e tente novamente.',
  422: 'Dados inválidos. Verifique as informações e tente novamente.',
  429: 'Muitas requisições. Aguarde um momento e tente novamente.',
  500: 'Erro interno do servidor. Tente novamente em instantes.',
  502: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  503: 'Serviço em manutenção. Tente novamente em alguns minutos.',
  504: 'O servidor demorou para responder. Tente novamente.',
};

/**
 * Patterns for matching technical error messages to friendly messages.
 * Order matters - more specific patterns should come first.
 *
 * @see Issue #917 - Melhorar diagnóstico de erros de conexão
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // 404 - Endpoint not found (API misconfiguration)
  {
    pattern: /404|not\s*found|cannot\s*(get|post|put|patch|delete)/i,
    message: 'Endpoint não encontrado. Verifique a configuração da API.',
  },

  // Network errors (no HTTP response)
  {
    pattern: /network\s*error|ERR_NETWORK|ECONNREFUSED/i,
    message: 'Erro de conexão. Verifique sua internet e tente novamente.',
  },

  // CORS errors
  {
    pattern: /cors|cross.*origin|access.*control.*allow/i,
    message: 'Erro de configuração do servidor. Contate o suporte.',
  },

  // Timeout errors
  {
    pattern: /timeout|ETIMEDOUT|ECONNRESET/i,
    message: 'A conexão expirou. Tente novamente.',
  },

  // Authentication errors
  {
    pattern: /unauthorized|401/i,
    message: 'Sessão expirada. Faça login novamente.',
  },
  {
    pattern: /forbidden|403/i,
    message: 'Você não tem permissão para realizar esta ação.',
  },

  // AI/External service errors
  {
    pattern: /exa\s*(api)?|search\s*service/i,
    message:
      'Serviço de pesquisa temporariamente indisponível. Tente novamente em instantes.',
  },
  {
    pattern: /openai|gpt|llm|completion/i,
    message:
      'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
  },
  {
    pattern: /rate\s*limit|too\s*many\s*requests|throttl/i,
    message: 'Muitas requisições. Aguarde um momento e tente novamente.',
  },

  // Database errors
  {
    pattern: /database|db\s*error|query\s*failed|typeorm|postgres/i,
    message: 'Erro ao acessar dados. Tente novamente em instantes.',
  },
  {
    pattern: /duplicate|unique\s*constraint|already\s*exists/i,
    message: 'Este registro já existe.',
  },

  // Validation errors
  {
    pattern: /validation\s*(error|failed)|invalid\s*(input|data)/i,
    message: 'Dados inválidos. Verifique as informações e tente novamente.',
  },

  // Generic failures
  {
    pattern: /request\s*failed|failed\s*to\s*fetch/i,
    message: 'Serviço temporariamente indisponível. Tente novamente.',
  },
  {
    pattern: /internal\s*server\s*error|500/i,
    message: 'Erro interno. Nossa equipe foi notificada.',
  },
];

/**
 * Default fallback message when no specific match is found.
 */
const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro inesperado. Tente novamente.';

/**
 * Extracts user-friendly error message from an API error response.
 *
 * @param error - Error object from API response (can be various formats)
 * @param context - Optional context hint for better error messages
 * @returns User-friendly error message in Portuguese
 *
 * @example
 * ```ts
 * try {
 *   await api.post('/etps', data);
 * } catch (error) {
 *   const message = getApiErrorMessage(error, 'criar ETP');
 *   toast.error(message); // "Erro ao criar ETP. Tente novamente."
 * }
 * ```
 */
export function getApiErrorMessage(error: unknown, context?: string): string {
  // Handle null/undefined
  if (!error) {
    return context
      ? `Erro ao ${context}. ${DEFAULT_ERROR_MESSAGE}`
      : DEFAULT_ERROR_MESSAGE;
  }

  // Extract status code if available (Axios error format)
  const statusCode = extractStatusCode(error);
  if (statusCode && HTTP_ERROR_MESSAGES[statusCode]) {
    return HTTP_ERROR_MESSAGES[statusCode];
  }

  // Extract error message
  const errorMessage = extractErrorMessage(error);

  // Match against known patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // If we have a readable error message that's not too technical, use it
  if (errorMessage && isUserFriendlyMessage(errorMessage)) {
    return errorMessage;
  }

  // Return context-aware default message
  return context
    ? `Erro ao ${context}. Tente novamente.`
    : DEFAULT_ERROR_MESSAGE;
}

/**
 * Extracts HTTP status code from error object.
 */
function extractStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const err = error as Record<string, unknown>;

  // Axios error format
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (typeof response.status === 'number') {
      return response.status;
    }
  }

  // Direct status code
  if (typeof err.status === 'number') {
    return err.status;
  }

  // Status code in message
  if (typeof err.statusCode === 'number') {
    return err.statusCode;
  }

  return null;
}

/**
 * Extracts error message string from various error formats.
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error !== 'object' || error === null) {
    return '';
  }

  const err = error as Record<string, unknown>;

  // NestJS error format: { message: string | { message: string } }
  if (err.message) {
    if (typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err.message === 'object' && err.message !== null) {
      const messageObj = err.message as Record<string, unknown>;
      if (typeof messageObj.message === 'string') {
        return messageObj.message;
      }
    }
  }

  // Axios error format: { response: { data: { message: string } } }
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      if (typeof data.message === 'string') {
        return data.message;
      }
    }
  }

  // Error property
  if (typeof err.error === 'string') {
    return err.error;
  }

  return '';
}

/**
 * Checks if a message is user-friendly (not too technical).
 * User-friendly messages:
 * - Are in Portuguese
 * - Don't contain stack traces
 * - Don't contain technical jargon
 * - Are reasonably short
 */
function isUserFriendlyMessage(message: string): boolean {
  // Too long messages are likely technical
  if (message.length > 200) {
    return false;
  }

  // Check for technical patterns
  const technicalPatterns = [
    /at\s+\w+\s+\(/i, // Stack trace
    /error:\s*\w+Error/i, // Error class names
    /\.(ts|js|tsx|jsx):\d+/i, // File references
    /undefined|null|NaN/i, // JS primitives
    /^Error:/i, // Raw Error prefix
    /\{.*\}/s, // JSON objects
    /\[.*\]/s, // Arrays
    /exception|stack\s*trace/i, // Exception keywords
    /sql|query|select|insert|update|delete/i, // SQL
    /connection|socket|port/i, // Network internals
  ];

  for (const pattern of technicalPatterns) {
    if (pattern.test(message)) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a contextual error message for specific operations.
 *
 * @param operation - The operation that failed (e.g., 'carregar', 'salvar', 'deletar')
 * @param resource - The resource involved (e.g., 'ETP', 'seção', 'usuário')
 * @param error - The original error
 * @returns Contextual error message
 *
 * @example
 * ```ts
 * catch (error) {
 *   const message = getContextualErrorMessage('carregar', 'ETPs', error);
 *   // Returns: "Erro ao carregar ETPs. Verifique sua conexão e tente novamente."
 * }
 * ```
 */
export function getContextualErrorMessage(
  operation: string,
  resource: string,
  error: unknown,
): string {
  const baseMessage = getApiErrorMessage(error);

  // If we got a specific error message (not the default), use it
  if (baseMessage !== DEFAULT_ERROR_MESSAGE) {
    return `Erro ao ${operation} ${resource}. ${baseMessage}`;
  }

  return `Erro ao ${operation} ${resource}. Tente novamente.`;
}

/**
 * Health check result with diagnostic details.
 *
 * @see Issue #917 - Melhorar diagnóstico de erros de conexão
 */
export interface ApiHealthResult {
  /** Whether the API is reachable and healthy */
  isHealthy: boolean;
  /** Human-readable diagnostic details */
  details: string;
  /** Diagnostic code for programmatic use */
  code:
    | 'healthy'
    | 'not_found'
    | 'server_error'
    | 'network_error'
    | 'timeout'
    | 'unknown';
}

/**
 * Checks if the API is reachable and healthy.
 * Performs a lightweight health check and returns diagnostic information.
 *
 * @param apiUrl - Base URL of the API (defaults to VITE_API_URL)
 * @returns Health check result with diagnostic details
 *
 * @example
 * ```ts
 * const health = await checkApiHealth();
 * if (!health.isHealthy) {
 *   console.log(`API offline: ${health.details}`);
 * }
 * ```
 *
 * @see Issue #917 - Melhorar diagnóstico de erros de conexão
 */
export async function checkApiHealth(
  apiUrl?: string,
): Promise<ApiHealthResult> {
  const baseUrl =
    apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

  // Build health endpoint URL
  // If API_URL includes /api/v1, health is at /api/health (one level up)
  const healthUrl = baseUrl.includes('/api/v1')
    ? baseUrl.replace('/api/v1', '/api/health')
    : `${baseUrl}/health`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        isHealthy: true,
        details: 'API disponível',
        code: 'healthy',
      };
    }

    // Handle specific HTTP status codes
    if (response.status === 404) {
      return {
        isHealthy: false,
        details: `Endpoint não encontrado (404). Verifique a URL da API: ${healthUrl}`,
        code: 'not_found',
      };
    }

    return {
      isHealthy: false,
      details: `API retornou status ${response.status}`,
      code: 'server_error',
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        isHealthy: false,
        details: 'API não respondeu em 5 segundos',
        code: 'timeout',
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        isHealthy: false,
        details: 'API inacessível. Verifique sua conexão.',
        code: 'network_error',
      };
    }

    return {
      isHealthy: false,
      details: 'Erro ao verificar API',
      code: 'unknown',
    };
  }
}

/**
 * Diagnostic error message type for enhanced error display.
 *
 * @see Issue #917 - Melhorar diagnóstico de erros de conexão
 */
export interface DiagnosticErrorMessage {
  /** Main user-friendly error message */
  message: string;
  /** Additional diagnostic details (optional) */
  diagnostic?: string;
}

/**
 * Gets an error message with optional diagnostic details from a health check.
 *
 * @param error - The original error
 * @param healthResult - Optional health check result for diagnostic enhancement
 * @returns Error message with optional diagnostic
 *
 * @example
 * ```ts
 * const health = await checkApiHealth();
 * const { message, diagnostic } = getErrorWithDiagnostic(error, health);
 * toast.error(diagnostic ? `${message} (${diagnostic})` : message);
 * ```
 *
 * @see Issue #917 - Melhorar diagnóstico de erros de conexão
 */
export function getErrorWithDiagnostic(
  error: unknown,
  healthResult?: ApiHealthResult,
): DiagnosticErrorMessage {
  const message = getApiErrorMessage(error);

  // If no health result or API is healthy, just return the base message
  if (!healthResult || healthResult.isHealthy) {
    return { message };
  }

  // Add diagnostic info for unhealthy API
  return {
    message,
    diagnostic: healthResult.details,
  };
}
