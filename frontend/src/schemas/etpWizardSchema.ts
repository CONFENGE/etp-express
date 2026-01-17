import { z } from 'zod';
import { EtpTemplateType } from '@/types/template';

// ============================================
// Step 0: Template Selection Schema
// Issue #1239 - Integrate TemplateSelector into CreateETPWizard
// ============================================

export const step0Schema = z.object({
  templateId: z.string().nullable().optional(),
  templateType: z.nativeEnum(EtpTemplateType).nullable().optional(),
});

// ============================================
// Dynamic Fields Schemas by Template Type
// Issue #1240 - Implement dynamic fields based on template
// ============================================

export const obrasDynamicFieldsSchema = z.object({
  artRrt: z.string().max(50).optional(),
  memorialDescritivo: z.string().max(10000).optional(),
  cronogramaFisicoFinanceiro: z.string().max(10000).optional(),
  bdiReferencia: z.number().min(0).max(100).optional(),
  projetoBasico: z.string().max(10000).optional(),
  projetoExecutivo: z.string().max(10000).optional(),
  licencasAmbientais: z.string().max(2000).optional(),
  planilhaOrcamentaria: z.string().max(10000).optional(),
});

export const tiDynamicFieldsSchema = z.object({
  especificacoesTecnicas: z.string().max(10000).optional(),
  nivelServico: z.string().max(5000).optional(),
  metodologiaTrabalho: z.enum(['agil', 'cascata', 'hibrida']).optional(),
  requisitosSeguranca: z.string().max(5000).optional(),
  slaMetricas: z.string().max(5000).optional(),
  arquiteturaTecnica: z.string().max(10000).optional(),
  integracaoSistemas: z.string().max(5000).optional(),
  lgpdConformidade: z.string().max(3000).optional(),
});

export const servicosDynamicFieldsSchema = z.object({
  produtividade: z.string().max(2000).optional(),
  postosTrabalho: z.number().min(0).optional(),
  frequenciaServico: z.string().max(500).optional(),
  indicadoresDesempenho: z.string().max(2000).optional(),
  materiaisEquipamentos: z.string().max(5000).optional(),
  uniformesEpi: z.string().max(2000).optional(),
  convencaoColetiva: z.string().max(500).optional(),
  transicaoContratual: z.string().max(5000).optional(),
});

export const materiaisDynamicFieldsSchema = z.object({
  especificacoesTecnicas: z.string().max(5000).optional(),
  garantiaMinima: z.string().max(500).optional(),
  assistenciaTecnica: z.string().max(2000).optional(),
  catalogo: z.string().max(100).optional(),
  amostraTeste: z.boolean().optional(),
  laudosTecnicos: z.string().max(5000).optional(),
  normasAplicaveis: z.string().max(2000).optional(),
  embalagensTransporte: z.string().max(2000).optional(),
  instalacaoTreinamento: z.string().max(3000).optional(),
});

export const dynamicFieldsSchema = z
  .union([
    obrasDynamicFieldsSchema,
    tiDynamicFieldsSchema,
    servicosDynamicFieldsSchema,
    materiaisDynamicFieldsSchema,
  ])
  .nullable()
  .optional();

// ============================================
// Constants for field validation
// ============================================

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const OBJETO_MIN_LENGTH = 10;
export const OBJETO_MAX_LENGTH = 500;
export const JUSTIFICATIVA_MIN_LENGTH = 50;
export const JUSTIFICATIVA_MAX_LENGTH = 5000;
export const DESCRICAO_DETALHADA_MAX_LENGTH = 5000;
export const NECESSIDADE_MAX_LENGTH = 3000;
export const BENEFICIOS_MAX_LENGTH = 3000;
export const REQUISITOS_TECNICOS_MAX_LENGTH = 5000;
export const REQUISITOS_QUALIFICACAO_MAX_LENGTH = 3000;
export const SUSTENTABILIDADE_MAX_LENGTH = 2000;
export const GARANTIA_MAX_LENGTH = 500;
export const RISCOS_MAX_LENGTH = 3000;
export const FONTE_PRECOS_MAX_LENGTH = 2000;
export const DOTACAO_MAX_LENGTH = 100;
export const ORGAO_MIN_LENGTH = 3;
export const ORGAO_MAX_LENGTH = 200;
export const UNIDADE_DEMANDANTE_MAX_LENGTH = 200;
export const UNIDADE_MEDIDA_MAX_LENGTH = 50;
export const RESPONSAVEL_NOME_MIN_LENGTH = 3;
export const RESPONSAVEL_NOME_MAX_LENGTH = 200;
export const RESPONSAVEL_MATRICULA_MAX_LENGTH = 50;

// ============================================
// Step 1: Identification Schema
// ============================================

export const step1Schema = z.object({
  title: z
    .string()
    .min(
      TITLE_MIN_LENGTH,
      `Título deve ter no mínimo ${TITLE_MIN_LENGTH} caracteres`,
    )
    .max(
      TITLE_MAX_LENGTH,
      `Título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres`,
    ),
  orgaoEntidade: z
    .string()
    .min(
      ORGAO_MIN_LENGTH,
      `Órgão/Entidade deve ter no mínimo ${ORGAO_MIN_LENGTH} caracteres`,
    )
    .max(
      ORGAO_MAX_LENGTH,
      `Órgão/Entidade deve ter no máximo ${ORGAO_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  uasg: z
    .string()
    .regex(/^\d{6}$/, 'UASG deve conter exatamente 6 dígitos numéricos')
    .optional()
    .or(z.literal('')),
  unidadeDemandante: z
    .string()
    .max(
      UNIDADE_DEMANDANTE_MAX_LENGTH,
      `Unidade demandante deve ter no máximo ${UNIDADE_DEMANDANTE_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  responsavelTecnicoNome: z
    .string()
    .min(
      RESPONSAVEL_NOME_MIN_LENGTH,
      `Nome deve ter no mínimo ${RESPONSAVEL_NOME_MIN_LENGTH} caracteres`,
    )
    .max(
      RESPONSAVEL_NOME_MAX_LENGTH,
      `Nome deve ter no máximo ${RESPONSAVEL_NOME_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  responsavelTecnicoMatricula: z
    .string()
    .max(
      RESPONSAVEL_MATRICULA_MAX_LENGTH,
      `Matrícula deve ter no máximo ${RESPONSAVEL_MATRICULA_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  dataElaboracao: z.string().optional().or(z.literal('')),
});

// ============================================
// Step 2: Object and Justification Schema
// ============================================

export const step2Schema = z.object({
  objeto: z
    .string()
    .min(
      OBJETO_MIN_LENGTH,
      `Objeto deve ter no mínimo ${OBJETO_MIN_LENGTH} caracteres`,
    )
    .max(
      OBJETO_MAX_LENGTH,
      `Objeto deve ter no máximo ${OBJETO_MAX_LENGTH} caracteres`,
    ),
  descricaoDetalhada: z
    .string()
    .max(
      DESCRICAO_DETALHADA_MAX_LENGTH,
      `Descrição detalhada deve ter no máximo ${DESCRICAO_DETALHADA_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  quantidadeEstimada: z
    .number()
    .min(1, 'Quantidade deve ser no mínimo 1')
    .optional()
    .or(z.nan().transform(() => undefined)),
  unidadeMedida: z
    .string()
    .max(
      UNIDADE_MEDIDA_MAX_LENGTH,
      `Unidade de medida deve ter no máximo ${UNIDADE_MEDIDA_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  justificativaContratacao: z
    .string()
    .min(
      JUSTIFICATIVA_MIN_LENGTH,
      `Justificativa deve ter no mínimo ${JUSTIFICATIVA_MIN_LENGTH} caracteres`,
    )
    .max(
      JUSTIFICATIVA_MAX_LENGTH,
      `Justificativa deve ter no máximo ${JUSTIFICATIVA_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  necessidadeAtendida: z
    .string()
    .max(
      NECESSIDADE_MAX_LENGTH,
      `Necessidade atendida deve ter no máximo ${NECESSIDADE_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  beneficiosEsperados: z
    .string()
    .max(
      BENEFICIOS_MAX_LENGTH,
      `Benefícios esperados deve ter no máximo ${BENEFICIOS_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
});

// ============================================
// Step 3: Technical Requirements Schema
// ============================================

export const step3Schema = z.object({
  requisitosTecnicos: z
    .string()
    .max(
      REQUISITOS_TECNICOS_MAX_LENGTH,
      `Requisitos técnicos deve ter no máximo ${REQUISITOS_TECNICOS_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  requisitosQualificacao: z
    .string()
    .max(
      REQUISITOS_QUALIFICACAO_MAX_LENGTH,
      `Requisitos de qualificação deve ter no máximo ${REQUISITOS_QUALIFICACAO_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  criteriosSustentabilidade: z
    .string()
    .max(
      SUSTENTABILIDADE_MAX_LENGTH,
      `Critérios de sustentabilidade deve ter no máximo ${SUSTENTABILIDADE_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  garantiaExigida: z
    .string()
    .max(
      GARANTIA_MAX_LENGTH,
      `Garantia exigida deve ter no máximo ${GARANTIA_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  prazoExecucao: z
    .number()
    .int('Prazo deve ser um número inteiro')
    .min(1, 'Prazo deve ser no mínimo 1 dia')
    .optional()
    .or(z.nan().transform(() => undefined)),
});

// ============================================
// Step 4: Cost Estimation Schema
// ============================================

export const step4Schema = z.object({
  valorUnitario: z
    .number()
    .min(0, 'Valor unitário deve ser maior ou igual a 0')
    .optional()
    .or(z.nan().transform(() => undefined)),
  valorEstimado: z
    .number()
    .min(0, 'Valor estimado deve ser maior ou igual a 0')
    .optional()
    .or(z.nan().transform(() => undefined)),
  fontePesquisaPrecos: z
    .string()
    .max(
      FONTE_PRECOS_MAX_LENGTH,
      `Fonte de pesquisa de preços deve ter no máximo ${FONTE_PRECOS_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  dotacaoOrcamentaria: z
    .string()
    .max(
      DOTACAO_MAX_LENGTH,
      `Dotação orçamentária deve ter no máximo ${DOTACAO_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
});

// ============================================
// Step 5: Risk Analysis Schema
// ============================================

export const NivelRiscoEnum = z.enum(['BAIXO', 'MEDIO', 'ALTO']);

export const step5Schema = z.object({
  nivelRisco: NivelRiscoEnum.optional(),
  descricaoRiscos: z
    .string()
    .max(
      RISCOS_MAX_LENGTH,
      `Descrição de riscos deve ter no máximo ${RISCOS_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
});

// ============================================
// Step 6: Dynamic Fields Schema (varies by template)
// Issue #1240 - Implement dynamic fields based on template
// ============================================

export const step6Schema = z.object({
  dynamicFields: dynamicFieldsSchema,
});

// ============================================
// Complete ETP Wizard Schema
// ============================================

export const etpWizardSchema = z.object({
  // Step 0: Template Selection
  ...step0Schema.shape,
  // Step 1: Identification
  ...step1Schema.shape,
  // Step 2: Object and Justification
  ...step2Schema.shape,
  // Step 3: Technical Requirements
  ...step3Schema.shape,
  // Step 4: Cost Estimation
  ...step4Schema.shape,
  // Step 5: Risk Analysis
  ...step5Schema.shape,
  // Step 6: Dynamic Fields (Issue #1240)
  ...step6Schema.shape,
});

// ============================================
// Type Definitions
// ============================================

export type Step0FormData = z.infer<typeof step0Schema>;
export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;
export type Step4FormData = z.infer<typeof step4Schema>;
export type Step5FormData = z.infer<typeof step5Schema>;
export type Step6FormData = z.infer<typeof step6Schema>;
export type ObrasDynamicFields = z.infer<typeof obrasDynamicFieldsSchema>;
export type TiDynamicFields = z.infer<typeof tiDynamicFieldsSchema>;
export type ServicosDynamicFields = z.infer<typeof servicosDynamicFieldsSchema>;
export type MateriaisDynamicFields = z.infer<
  typeof materiaisDynamicFieldsSchema
>;
export type DynamicFieldsType = z.infer<typeof dynamicFieldsSchema>;
export type ETPWizardFormData = z.infer<typeof etpWizardSchema>;

// ============================================
// Backend-Compatible Types (Issue #1530)
// These types match the backend DTOs for API payloads
// ============================================

/**
 * Responsável técnico structure matching backend DTO.
 * Issue #1530 - Backend expects nested object, not flat fields.
 * @see backend/src/modules/etps/dto/create-etp.dto.ts ResponsavelTecnicoDto
 */
export interface ResponsavelTecnico {
  nome: string;
  matricula?: string;
}

/**
 * API payload type for creating/updating ETPs.
 * Transforms wizard form data (flat) to backend DTO format (nested).
 * Issue #1530 - Ensures parity between frontend and backend.
 */
export interface CreateETPPayload {
  title: string;
  description?: string;
  objeto: string;
  orgaoEntidade?: string;
  uasg?: string;
  unidadeDemandante?: string;
  responsavelTecnico?: ResponsavelTecnico;
  dataElaboracao?: string;
  descricaoDetalhada?: string;
  quantidadeEstimada?: number;
  unidadeMedida?: string;
  justificativaContratacao?: string;
  necessidadeAtendida?: string;
  beneficiosEsperados?: string;
  requisitosTecnicos?: string;
  requisitosQualificacao?: string;
  criteriosSustentabilidade?: string;
  garantiaExigida?: string;
  prazoExecucao?: number;
  valorUnitario?: number;
  valorEstimado?: number;
  fontePesquisaPrecos?: string;
  dotacaoOrcamentaria?: string;
  nivelRisco?: 'BAIXO' | 'MEDIO' | 'ALTO';
  descricaoRiscos?: string;
  templateId?: string;
  templateType?: string;
  dynamicFields?: DynamicFieldsType;
}

/**
 * Transforms wizard form data (flat fields) to API payload (nested structure).
 * Issue #1530 - Centralizes the flat → nested transformation.
 *
 * @param data - Wizard form data with flat responsavelTecnico fields
 * @returns API payload with nested responsavelTecnico object
 *
 * @example
 * ```typescript
 * const formData = { responsavelTecnicoNome: 'João', responsavelTecnicoMatricula: '123' };
 * const payload = transformWizardDataToPayload(formData);
 * // payload.responsavelTecnico = { nome: 'João', matricula: '123' }
 * ```
 */
export function transformWizardDataToPayload(
  data: ETPWizardFormData,
): CreateETPPayload {
  return {
    title: data.title,
    description: data.description || undefined,
    objeto: data.objeto,
    // Identification fields
    orgaoEntidade: data.orgaoEntidade || undefined,
    uasg: data.uasg || undefined,
    unidadeDemandante: data.unidadeDemandante || undefined,
    // Transform flat → nested (Issue #1530)
    responsavelTecnico: data.responsavelTecnicoNome
      ? {
          nome: data.responsavelTecnicoNome,
          matricula: data.responsavelTecnicoMatricula || undefined,
        }
      : undefined,
    dataElaboracao: data.dataElaboracao || undefined,
    // Object and Justification fields
    descricaoDetalhada: data.descricaoDetalhada || undefined,
    quantidadeEstimada: data.quantidadeEstimada || undefined,
    unidadeMedida: data.unidadeMedida || undefined,
    justificativaContratacao: data.justificativaContratacao || undefined,
    necessidadeAtendida: data.necessidadeAtendida || undefined,
    beneficiosEsperados: data.beneficiosEsperados || undefined,
    // Requirements fields
    requisitosTecnicos: data.requisitosTecnicos || undefined,
    requisitosQualificacao: data.requisitosQualificacao || undefined,
    criteriosSustentabilidade: data.criteriosSustentabilidade || undefined,
    garantiaExigida: data.garantiaExigida || undefined,
    prazoExecucao: data.prazoExecucao || undefined,
    // Cost fields
    valorUnitario: data.valorUnitario || undefined,
    valorEstimado: data.valorEstimado || undefined,
    fontePesquisaPrecos: data.fontePesquisaPrecos || undefined,
    dotacaoOrcamentaria: data.dotacaoOrcamentaria || undefined,
    // Risk fields
    nivelRisco: data.nivelRisco || undefined,
    descricaoRiscos: data.descricaoRiscos || undefined,
    // Template fields
    templateId: data.templateId || undefined,
    templateType: data.templateType || undefined,
    dynamicFields: data.dynamicFields || undefined,
  };
}

// ============================================
// Step Configuration
// ============================================

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  schema: z.ZodSchema;
  fields: string[];
  /** If true, this step can be skipped when no template is selected */
  skipWhenNoTemplate?: boolean;
}

/** Step index for "Campos Específicos" (Dynamic Fields) - can be skipped when no template */
export const DYNAMIC_FIELDS_STEP = 4;

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 0,
    title: 'Tipo de Documento',
    description: 'Selecione um template para iniciar',
    schema: step0Schema,
    fields: ['templateId', 'templateType'],
  },
  {
    id: 1,
    title: 'Identificação',
    description: 'Dados básicos do ETP',
    schema: step1Schema,
    fields: [
      'title',
      'orgaoEntidade',
      'uasg',
      'unidadeDemandante',
      'responsavelTecnicoNome',
      'responsavelTecnicoMatricula',
      'dataElaboracao',
    ],
  },
  {
    id: 2,
    title: 'Objeto e Justificativa',
    description: 'Descrição e motivação',
    schema: step2Schema,
    fields: [
      'objeto',
      'descricaoDetalhada',
      'quantidadeEstimada',
      'unidadeMedida',
      'justificativaContratacao',
      'necessidadeAtendida',
      'beneficiosEsperados',
    ],
  },
  {
    id: 3,
    title: 'Requisitos Técnicos',
    description: 'Especificações e qualificações',
    schema: step3Schema,
    fields: [
      'requisitosTecnicos',
      'requisitosQualificacao',
      'criteriosSustentabilidade',
      'garantiaExigida',
      'prazoExecucao',
    ],
  },
  {
    id: 4,
    title: 'Campos Específicos',
    description: 'Campos do tipo de contratação',
    schema: step6Schema,
    fields: ['dynamicFields'],
    skipWhenNoTemplate: true, // #1330 - Skip this step when no template is selected
  },
  {
    id: 5,
    title: 'Estimativa de Custos',
    description: 'Valores e fontes de preço',
    schema: step4Schema,
    fields: [
      'valorUnitario',
      'valorEstimado',
      'fontePesquisaPrecos',
      'dotacaoOrcamentaria',
    ],
  },
  {
    id: 6,
    title: 'Análise de Riscos',
    description: 'Riscos e observações',
    schema: step5Schema,
    fields: ['nivelRisco', 'descricaoRiscos', 'description'],
  },
];

// ============================================
// Default Values
// ============================================

export const defaultWizardValues: ETPWizardFormData = {
  // Step 0: Template Selection
  templateId: null,
  templateType: null,
  // Step 1
  title: '',
  orgaoEntidade: '',
  uasg: '',
  unidadeDemandante: '',
  responsavelTecnicoNome: '',
  responsavelTecnicoMatricula: '',
  dataElaboracao: '',
  // Step 2
  objeto: '',
  descricaoDetalhada: '',
  quantidadeEstimada: undefined,
  unidadeMedida: '',
  justificativaContratacao: '',
  necessidadeAtendida: '',
  beneficiosEsperados: '',
  // Step 3
  requisitosTecnicos: '',
  requisitosQualificacao: '',
  criteriosSustentabilidade: '',
  garantiaExigida: '',
  prazoExecucao: undefined,
  // Step 4: Dynamic Fields (Issue #1240)
  dynamicFields: null,
  // Step 5
  valorUnitario: undefined,
  valorEstimado: undefined,
  fontePesquisaPrecos: '',
  dotacaoOrcamentaria: '',
  // Step 6
  nivelRisco: undefined,
  descricaoRiscos: '',
  description: '',
};
