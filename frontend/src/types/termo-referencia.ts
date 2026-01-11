/**
 * Types for Termo de Referencia module.
 *
 * @see backend/src/entities/termo-referencia.entity.ts
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 * @see Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */

/**
 * Status do Termo de Referencia.
 * Segue ciclo de vida: draft -> review -> approved -> archived
 */
export enum TermoReferenciaStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
}

/**
 * Status labels for display in UI
 */
export const TR_STATUS_LABELS: Record<TermoReferenciaStatus, string> = {
  [TermoReferenciaStatus.DRAFT]: 'Rascunho',
  [TermoReferenciaStatus.REVIEW]: 'Em Revisao',
  [TermoReferenciaStatus.APPROVED]: 'Aprovado',
  [TermoReferenciaStatus.ARCHIVED]: 'Arquivado',
};

/**
 * Status colors for badges
 */
export const TR_STATUS_COLORS: Record<TermoReferenciaStatus, string> = {
  [TermoReferenciaStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [TermoReferenciaStatus.REVIEW]: 'bg-yellow-100 text-yellow-800',
  [TermoReferenciaStatus.APPROVED]: 'bg-green-100 text-green-800',
  [TermoReferenciaStatus.ARCHIVED]: 'bg-red-100 text-red-800',
};

/**
 * Basic user info for createdBy relation
 */
export interface TRUser {
  id: string;
  name: string;
  email?: string;
}

/**
 * Basic ETP info for TR origin reference
 */
export interface TREtp {
  id: string;
  title: string;
  status: string;
  templateType?: string;
}

/**
 * Basic organization info
 */
export interface TROrganization {
  id: string;
  name: string;
}

/**
 * Termo de Referencia entity
 */
export interface TermoReferencia {
  id: string;
  etpId: string;
  etp?: TREtp;
  organizationId: string;
  organization?: TROrganization;

  // Campos obrigatorios (Lei 14.133/2021)
  objeto: string;
  fundamentacaoLegal?: string;
  descricaoSolucao?: string;
  requisitosContratacao?: string;
  modeloExecucao?: string;
  modeloGestao?: string;
  criteriosSelecao?: string;
  valorEstimado?: number;
  dotacaoOrcamentaria?: string;
  prazoVigencia?: number;
  obrigacoesContratante?: string;
  obrigacoesContratada?: string;
  sancoesPenalidades?: string;
  cronograma?: Record<string, unknown>;
  especificacoesTecnicas?: Record<string, unknown>;

  // Campos adicionais
  localExecucao?: string;
  garantiaContratual?: string;
  condicoesPagamento?: string;
  subcontratacao?: string;

  // Metadados
  status: TermoReferenciaStatus;
  versao: number;
  createdBy?: TRUser;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a new TR
 */
export interface CreateTermoReferenciaDto {
  etpId: string;
  objeto: string;
  fundamentacaoLegal?: string;
  descricaoSolucao?: string;
  requisitosContratacao?: string;
  modeloExecucao?: string;
  modeloGestao?: string;
  criteriosSelecao?: string;
  valorEstimado?: number;
  dotacaoOrcamentaria?: string;
  prazoVigencia?: number;
  obrigacoesContratante?: string;
  obrigacoesContratada?: string;
  sancoesPenalidades?: string;
  cronograma?: Record<string, unknown>;
  especificacoesTecnicas?: Record<string, unknown>;
  localExecucao?: string;
  garantiaContratual?: string;
  condicoesPagamento?: string;
  subcontratacao?: string;
}

/**
 * DTO for updating a TR
 */
export interface UpdateTermoReferenciaDto
  extends Partial<Omit<CreateTermoReferenciaDto, 'etpId'>> {
  status?: TermoReferenciaStatus;
}

/**
 * Response from AI-powered TR generation
 */
export interface GenerateTrResponse extends TermoReferencia {
  metadata?: {
    tokens: number;
    model: string;
    latencyMs: number;
    aiEnhanced: boolean;
  };
}

/**
 * TR section template for form display
 */
export interface TRSectionTemplate {
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  field: keyof TermoReferencia;
  isRequired: boolean;
  placeholder?: string;
}

/**
 * TR section templates for editor tabs
 * Based on Lei 14.133/2021 structure
 */
export const TR_SECTION_TEMPLATES: TRSectionTemplate[] = [
  {
    number: 1,
    title: 'Objeto',
    shortTitle: 'Objeto',
    description: 'Definicao do objeto da contratacao',
    field: 'objeto',
    isRequired: true,
    placeholder: 'Descreva de forma clara e precisa o objeto a ser contratado...',
  },
  {
    number: 2,
    title: 'Fundamentacao Legal',
    shortTitle: 'Legal',
    description: 'Referencias aos dispositivos legais que embasam a contratacao',
    field: 'fundamentacaoLegal',
    isRequired: false,
    placeholder: 'Ex: Lei 14.133/2021, art. 75, inciso II...',
  },
  {
    number: 3,
    title: 'Descricao da Solucao',
    shortTitle: 'Solucao',
    description: 'Visao geral de como a necessidade sera atendida',
    field: 'descricaoSolucao',
    isRequired: false,
    placeholder: 'Descreva a solucao proposta para atender a necessidade...',
  },
  {
    number: 4,
    title: 'Requisitos da Contratacao',
    shortTitle: 'Requisitos',
    description: 'Especificacoes tecnicas, qualificacao minima, certificacoes',
    field: 'requisitosContratacao',
    isRequired: true,
    placeholder: 'Liste os requisitos tecnicos e de qualificacao...',
  },
  {
    number: 5,
    title: 'Modelo de Execucao',
    shortTitle: 'Execucao',
    description: 'Como o objeto sera executado/entregue',
    field: 'modeloExecucao',
    isRequired: false,
    placeholder: 'Ex: Entrega unica, Execucao continuada, Por demanda...',
  },
  {
    number: 6,
    title: 'Modelo de Gestao',
    shortTitle: 'Gestao',
    description: 'Mecanismos de acompanhamento e fiscalizacao',
    field: 'modeloGestao',
    isRequired: false,
    placeholder: 'Descreva como sera feito o acompanhamento e fiscalizacao...',
  },
  {
    number: 7,
    title: 'Criterios de Selecao',
    shortTitle: 'Selecao',
    description: 'Tipo de licitacao, criterios de julgamento',
    field: 'criteriosSelecao',
    isRequired: false,
    placeholder: 'Ex: Menor preco, Melhor tecnica, Tecnica e preco...',
  },
  {
    number: 8,
    title: 'Estimativas de Custo',
    shortTitle: 'Custos',
    description: 'Valor estimado e dotacao orcamentaria',
    field: 'valorEstimado',
    isRequired: true,
    placeholder: 'Informe o valor estimado da contratacao...',
  },
  {
    number: 9,
    title: 'Obrigacoes das Partes',
    shortTitle: 'Obrigacoes',
    description: 'Deveres do contratante e da contratada',
    field: 'obrigacoesContratante',
    isRequired: false,
    placeholder: 'Liste as obrigacoes do orgao contratante...',
  },
  {
    number: 10,
    title: 'Sancoes e Penalidades',
    shortTitle: 'Sancoes',
    description: 'Multas, advertencias, suspensao',
    field: 'sancoesPenalidades',
    isRequired: false,
    placeholder: 'Descreva as sancoes aplicaveis em caso de descumprimento...',
  },
];

/**
 * Calculate TR completion percentage based on filled sections
 */
export function calculateTRProgress(tr: TermoReferencia): number {
  const fields: (keyof TermoReferencia)[] = [
    'objeto',
    'fundamentacaoLegal',
    'descricaoSolucao',
    'requisitosContratacao',
    'modeloExecucao',
    'modeloGestao',
    'criteriosSelecao',
    'valorEstimado',
    'obrigacoesContratante',
    'sancoesPenalidades',
  ];

  const filledFields = fields.filter((field) => {
    const value = tr[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return value > 0;
    return Boolean(value);
  });

  return Math.round((filledFields.length / fields.length) * 100);
}
