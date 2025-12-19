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
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Network errors
  {
    pattern: /network\s*error|ERR_NETWORK|ECONNREFUSED/i,
    message: 'Erro de conexão. Verifique sua internet e tente novamente.',
  },
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
    message: 'Serviço de pesquisa temporariamente indisponível. Tente novamente em instantes.',
  },
  {
    pattern: /openai|gpt|llm|completion/i,
    message: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.',
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
export function getApiErrorMessage(
  error: unknown,
  context?: string,
): string {
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
