export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ETP Express';
export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ETPS: '/etps',
  ETP_EDITOR: (id: string) => `/etps/${id}`,
  ETP_PREVIEW: (id: string) => `/etps/${id}/preview`,
} as const;

export const ETP_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  COMPLETED: 'completed',
} as const;

export const ETP_STATUS_LABELS = {
  [ETP_STATUS.DRAFT]: 'Rascunho',
  [ETP_STATUS.IN_PROGRESS]: 'Em Progresso',
  [ETP_STATUS.UNDER_REVIEW]: 'Em Revisão',
  [ETP_STATUS.COMPLETED]: 'Concluído',
} as const;

export const ETP_STATUS_COLORS = {
  [ETP_STATUS.DRAFT]: 'bg-gray-100 text-gray-800',
  [ETP_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [ETP_STATUS.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [ETP_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
} as const;

export const REQUIRED_SECTIONS = [1, 4, 6, 8, 13];

export const WARNING_MESSAGE =
  'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.';

export const AI_WARNING_MESSAGE =
  'Esta sugestão foi gerada por IA. Revise criticamente antes de aceitar.';

export const REFERENCE_WARNING_MESSAGE =
  'Verifique a fonte antes de utilizar esta referência.';

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_EMAIL: 'Email inválido',
  PASSWORD_MIN_LENGTH: 'A senha deve ter no mínimo 6 caracteres',
  PASSWORDS_DONT_MATCH: 'As senhas não coincidem',
  INVALID_NUMBER: 'Número inválido',
  MIN_VALUE: (min: number) => `O valor mínimo é ${min}`,
  MAX_VALUE: (max: number) => `O valor máximo é ${max}`,
  MIN_LENGTH: (min: number) => `O tamanho mínimo é ${min} caracteres`,
  MAX_LENGTH: (max: number) => `O tamanho máximo é ${max} caracteres`,
} as const;

export const TOAST_DURATION = 5000;

export const AUTO_SAVE_DELAY = 2000;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
} as const;

/**
 * Authentication error codes returned by the backend.
 * These are used to provide contextual error messages to users.
 */
export const AUTH_ERROR_CODES = {
  /** Generic invalid credentials (email not found or wrong password) */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** User account is deactivated */
  USER_INACTIVE: 'USER_INACTIVE',
  /** User has no organization assigned */
  NO_ORGANIZATION: 'NO_ORGANIZATION',
  /** User's organization is suspended */
  ORG_INACTIVE: 'ORG_INACTIVE',
  /** User's organization does not exist */
  ORG_NOT_FOUND: 'ORG_NOT_FOUND',
  /** Too many login attempts - rate limited */
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * User-friendly error messages for authentication failures.
 * Mapped from backend error codes to contextual messages.
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]:
    'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
  [AUTH_ERROR_CODES.USER_INACTIVE]:
    'Sua conta está desativada. Entre em contato com o administrador.',
  [AUTH_ERROR_CODES.NO_ORGANIZATION]:
    'Usuário sem organização associada. Entre em contato com o administrador.',
  [AUTH_ERROR_CODES.ORG_INACTIVE]:
    'Sua organização está suspensa. Entre em contato com o suporte.',
  [AUTH_ERROR_CODES.ORG_NOT_FOUND]:
    'Organização não encontrada. Entre em contato com o administrador.',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]:
    'Conta temporariamente bloqueada por muitas tentativas. Aguarde 1 minuto e tente novamente.',
} as const;

/**
 * Extracts the error message from an authentication error response.
 * Handles both structured error responses (with code) and legacy string errors.
 *
 * @param error - Error object from API response
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(error: unknown): string {
  // Default fallback message
  const defaultMessage =
    'Erro ao fazer login. Verifique suas credenciais e tente novamente.';

  if (!error) return defaultMessage;

  // Handle structured error response from backend
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;

    // Check for error code in response.message (NestJS format)
    if (errObj.message && typeof errObj.message === 'object') {
      const messageObj = errObj.message as Record<string, unknown>;
      if (
        messageObj.code &&
        typeof messageObj.code === 'string' &&
        messageObj.code in AUTH_ERROR_MESSAGES
      ) {
        return AUTH_ERROR_MESSAGES[messageObj.code as AuthErrorCode];
      }
      // If message object has a message property, use it
      if (messageObj.message && typeof messageObj.message === 'string') {
        return messageObj.message;
      }
    }

    // Check for error code directly in response
    if (
      errObj.code &&
      typeof errObj.code === 'string' &&
      errObj.code in AUTH_ERROR_MESSAGES
    ) {
      return AUTH_ERROR_MESSAGES[errObj.code as AuthErrorCode];
    }

    // Handle simple message string
    if (errObj.message && typeof errObj.message === 'string') {
      // Check for rate limiting
      if (errObj.message.includes('ThrottlerException')) {
        return AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_LOCKED];
      }
      return errObj.message;
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}
