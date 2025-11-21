export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ETP Express';
export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
