/**
 * Contract types for fiscalização (supervision) module
 * @see backend/src/entities/medicao.entity.ts
 * @see backend/src/entities/ocorrencia.entity.ts
 * @see backend/src/entities/ateste.entity.ts
 */

export interface UserReference {
  id: string;
  name: string;
}

// ==================== MEDICAO ====================

export enum MedicaoStatus {
  PENDENTE = 'PENDENTE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
}

export interface Medicao {
  id: string;
  contratoId: string;
  numero: number;
  periodoInicio: string; // ISO 8601
  periodoFim: string; // ISO 8601
  valorMedido: string; // DECIMAL as string
  descricao?: string;
  observacoes?: string;
  status: MedicaoStatus;
  fiscalResponsavel?: UserReference;
  dataAteste?: string; // ISO 8601
  createdBy?: UserReference;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicaoDto {
  periodoInicio: string; // ISO 8601
  periodoFim: string; // ISO 8601
  valorMedido: string; // DECIMAL as string
  descricao?: string;
  observacoes?: string;
}

export interface UpdateMedicaoDto {
  periodoInicio?: string;
  periodoFim?: string;
  valorMedido?: string;
  descricao?: string;
  observacoes?: string;
}

// ==================== OCORRENCIA ====================

export enum OcorrenciaTipo {
  ATRASO = 'ATRASO',
  FALHA = 'FALHA',
  INADIMPLENCIA = 'INADIMPLENCIA',
  OUTRO = 'OUTRO',
}

export enum OcorrenciaGravidade {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum OcorrenciaStatus {
  ABERTA = 'ABERTA',
  EM_ANALISE = 'EM_ANALISE',
  RESOLVIDA = 'RESOLVIDA',
  CANCELADA = 'CANCELADA',
}

export interface Ocorrencia {
  id: string;
  contratoId: string;
  tipo: OcorrenciaTipo;
  gravidade: OcorrenciaGravidade;
  dataOcorrencia: string; // ISO 8601
  descricao: string;
  acaoCorretiva?: string;
  prazoResolucao?: string; // ISO 8601
  status: OcorrenciaStatus;
  registradoPor?: UserReference;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOcorrenciaDto {
  tipo: OcorrenciaTipo;
  gravidade: OcorrenciaGravidade;
  dataOcorrencia: string; // ISO 8601
  descricao: string;
  acaoCorretiva?: string;
  prazoResolucao?: string; // ISO 8601
}

export interface UpdateOcorrenciaDto {
  tipo?: OcorrenciaTipo;
  gravidade?: OcorrenciaGravidade;
  dataOcorrencia?: string;
  descricao?: string;
  acaoCorretiva?: string;
  prazoResolucao?: string;
  status?: OcorrenciaStatus;
}

// ==================== ATESTE ====================

export enum AtesteResultado {
  APROVADO = 'APROVADO',
  APROVADO_COM_RESSALVAS = 'APROVADO_COM_RESSALVAS',
  REJEITADO = 'REJEITADO',
}

export interface Ateste {
  id: string;
  medicaoId: string;
  medicao?: Medicao;
  fiscal?: UserReference;
  resultado: AtesteResultado;
  justificativa?: string;
  valorAtestado?: string; // DECIMAL as string
  dataAteste: string; // ISO 8601
  observacoes?: string;
  createdAt: string;
}

export interface CreateAtesteDto {
  resultado: AtesteResultado;
  justificativa?: string;
  valorAtestado?: string; // DECIMAL as string
  dataAteste: string; // ISO 8601
  observacoes?: string;
}

export interface UpdateAtesteDto {
  resultado?: AtesteResultado;
  justificativa?: string;
  valorAtestado?: string;
  dataAteste?: string;
  observacoes?: string;
}

// ==================== HELPER TYPES ====================

/**
 * Badge colors for Medicao status
 */
export const MEDICAO_STATUS_COLOR: Record<MedicaoStatus, string> = {
  [MedicaoStatus.PENDENTE]: 'bg-yellow-100 text-yellow-800',
  [MedicaoStatus.APROVADA]: 'bg-green-100 text-green-800',
  [MedicaoStatus.REJEITADA]: 'bg-red-100 text-red-800',
};

/**
 * Badge colors for Ocorrencia gravidade
 */
export const OCORRENCIA_GRAVIDADE_COLOR: Record<OcorrenciaGravidade, string> = {
  [OcorrenciaGravidade.BAIXA]: 'bg-blue-100 text-blue-800',
  [OcorrenciaGravidade.MEDIA]: 'bg-yellow-100 text-yellow-800',
  [OcorrenciaGravidade.ALTA]: 'bg-orange-100 text-orange-800',
  [OcorrenciaGravidade.CRITICA]: 'bg-red-100 text-red-800',
};

/**
 * Badge colors for Ocorrencia status
 */
export const OCORRENCIA_STATUS_COLOR: Record<OcorrenciaStatus, string> = {
  [OcorrenciaStatus.ABERTA]: 'bg-red-100 text-red-800',
  [OcorrenciaStatus.EM_ANALISE]: 'bg-yellow-100 text-yellow-800',
  [OcorrenciaStatus.RESOLVIDA]: 'bg-green-100 text-green-800',
  [OcorrenciaStatus.CANCELADA]: 'bg-gray-100 text-gray-800',
};

/**
 * Badge colors for Ateste resultado
 */
export const ATESTE_RESULTADO_COLOR: Record<AtesteResultado, string> = {
  [AtesteResultado.APROVADO]: 'bg-green-100 text-green-800',
  [AtesteResultado.APROVADO_COM_RESSALVAS]: 'bg-yellow-100 text-yellow-800',
  [AtesteResultado.REJEITADO]: 'bg-red-100 text-red-800',
};

// ==================== CONTRATO ====================

/**
 * Status do Contrato conforme ciclo de vida
 * @see backend/src/entities/contrato.entity.ts
 */
export enum ContratoStatus {
  MINUTA = 'minuta',
  ASSINADO = 'assinado',
  EM_EXECUCAO = 'em_execucao',
  ADITIVADO = 'aditivado',
  SUSPENSO = 'suspenso',
  RESCINDIDO = 'rescindido',
  ENCERRADO = 'encerrado',
}

/**
 * Contrato - Instrumento formal de contratação pública
 */
export interface Contrato {
  id: string;
  numero: string;
  numeroProcesso: string | null;
  objeto: string;
  contratadoCnpj: string;
  contratadoRazaoSocial: string;
  contratadoNomeFantasia: string | null;
  valorGlobal: string;
  vigenciaInicio: string; // ISO date string
  vigenciaFim: string; // ISO date string
  status: ContratoStatus;
  gestorResponsavel: UserReference;
  fiscalResponsavel: UserReference;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filtros para busca de contratos
 */
export interface ContractFilters {
  status?: ContratoStatus[];
  fornecedor?: string;
  valorMin?: number;
  valorMax?: number;
  vigenciaInicio?: string; // ISO date string
  vigenciaFim?: string; // ISO date string
}

/**
 * Resposta paginada da API de contratos
 */
export interface ContractsResponse {
  data: Contrato[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Badge colors for Contrato status
 */
export const CONTRATO_STATUS_COLOR: Record<ContratoStatus, string> = {
  [ContratoStatus.MINUTA]: 'bg-gray-100 text-gray-800',
  [ContratoStatus.ASSINADO]: 'bg-blue-100 text-blue-800',
  [ContratoStatus.EM_EXECUCAO]: 'bg-green-100 text-green-800',
  [ContratoStatus.ADITIVADO]: 'bg-purple-100 text-purple-800',
  [ContratoStatus.SUSPENSO]: 'bg-yellow-100 text-yellow-800',
  [ContratoStatus.RESCINDIDO]: 'bg-red-100 text-red-800',
  [ContratoStatus.ENCERRADO]: 'bg-slate-100 text-slate-800',
};

/**
 * Human-readable labels for Contrato status
 */
export const CONTRATO_STATUS_LABEL: Record<ContratoStatus, string> = {
  [ContratoStatus.MINUTA]: 'Minuta',
  [ContratoStatus.ASSINADO]: 'Assinado',
  [ContratoStatus.EM_EXECUCAO]: 'Em Execução',
  [ContratoStatus.ADITIVADO]: 'Aditivado',
  [ContratoStatus.SUSPENSO]: 'Suspenso',
  [ContratoStatus.RESCINDIDO]: 'Rescindido',
  [ContratoStatus.ENCERRADO]: 'Encerrado',
};
