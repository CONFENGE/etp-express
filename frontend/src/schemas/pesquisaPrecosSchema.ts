import { z } from 'zod';

// ============================================
// Pesquisa de Preços Wizard Schema
// Issue #1506 - Criar estrutura base do wizard
// ============================================

/**
 * Price source types for price research
 */
export enum PriceSourceType {
  PNCP = 'pncp',
  SINAPI = 'sinapi',
  SICRO = 'sicro',
  ATAS = 'atas',
  MANUAL = 'manual',
}

/**
 * Available price sources configuration
 */
export const PRICE_SOURCES = [
  {
    id: PriceSourceType.PNCP,
    name: 'PNCP/Compras.gov',
    description: 'Portal Nacional de Contratacoes Publicas',
    isAutomatic: true,
  },
  {
    id: PriceSourceType.SINAPI,
    name: 'SINAPI',
    description: 'Sistema Nacional de Pesquisa de Custos e Indices',
    isAutomatic: true,
  },
  {
    id: PriceSourceType.SICRO,
    name: 'SICRO',
    description: 'Sistema de Custos Referenciais de Obras',
    isAutomatic: true,
  },
  {
    id: PriceSourceType.ATAS,
    name: 'Atas de Registro de Precos',
    description: 'Precos registrados em atas vigentes',
    isAutomatic: true,
  },
  {
    id: PriceSourceType.MANUAL,
    name: 'Cotacao Manual',
    description: 'Cotacoes obtidas diretamente com fornecedores',
    isAutomatic: false,
  },
] as const;

// ============================================
// Step 0: Base Selection Schema
// Select ETP or TR as reference base
// ============================================

export const step0BaseSelectionSchema = z.object({
  baseType: z.enum(['etp', 'tr']).nullable().optional(),
  baseId: z.string().nullable().optional(),
});

// ============================================
// Step 1: Items Definition Schema
// Define items to research prices for
// ============================================

export const pesquisaItemSchema = z.object({
  id: z.string(),
  description: z.string().min(3, 'Descricao deve ter pelo menos 3 caracteres'),
  quantity: z.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unit: z.string().min(1, 'Unidade de medida e obrigatoria'),
});

export const step1ItemsSchema = z.object({
  items: z
    .array(pesquisaItemSchema)
    .min(1, 'Pelo menos um item deve ser definido'),
});

// ============================================
// Step 2: Sources Selection Schema
// Select price sources to query
// ============================================

export const step2SourcesSchema = z.object({
  selectedSources: z
    .array(z.nativeEnum(PriceSourceType))
    .min(1, 'Pelo menos uma fonte deve ser selecionada'),
});

// ============================================
// Step 3: Execution Schema (internal state)
// Used during price search execution
// ============================================

export const step3ExecutionSchema = z.object({
  isExecuting: z.boolean().default(false),
  executionProgress: z.number().min(0).max(100).default(0),
  executionErrors: z.array(z.string()).default([]),
});

// ============================================
// Step 4: Review Schema
// Review and adjust results
// ============================================

export const priceResultSchema = z.object({
  itemId: z.string(),
  source: z.nativeEnum(PriceSourceType),
  price: z.number().nullable(),
  date: z.string().nullable(),
  reference: z.string().nullable(),
  isManual: z.boolean().default(false),
});

export const step4ReviewSchema = z.object({
  results: z.array(priceResultSchema),
  selectedPrices: z.record(z.string(), z.number()), // itemId -> chosen price
  justifications: z.record(z.string(), z.string()), // itemId -> justification
});

// ============================================
// Combined Schema for Full Form
// ============================================

export const pesquisaPrecosWizardSchema = z.object({
  // Step 0 - Base Selection
  ...step0BaseSelectionSchema.shape,

  // Step 1 - Items
  ...step1ItemsSchema.shape,

  // Step 2 - Sources
  ...step2SourcesSchema.shape,

  // Step 3 - Execution (not user-editable)
  ...step3ExecutionSchema.shape,

  // Step 4 - Review
  results: z.array(priceResultSchema).default([]),
  selectedPrices: z.record(z.string(), z.number()).default({}),
  justifications: z.record(z.string(), z.string()).default({}),
});

export type PesquisaPrecosFormData = z.infer<typeof pesquisaPrecosWizardSchema>;
export type PesquisaItem = z.infer<typeof pesquisaItemSchema>;
export type PriceResult = z.infer<typeof priceResultSchema>;

// ============================================
// Default Values
// ============================================

export const defaultPesquisaPrecosValues: PesquisaPrecosFormData = {
  baseType: null,
  baseId: null,
  items: [],
  selectedSources: [],
  isExecuting: false,
  executionProgress: 0,
  executionErrors: [],
  results: [],
  selectedPrices: {},
  justifications: {},
};

// ============================================
// Wizard Step Configuration
// ============================================

export const PESQUISA_WIZARD_STEPS = [
  {
    id: 'step0',
    title: 'Selecionar Base',
    description: 'Escolha o ETP ou TR de referencia',
    fields: ['baseType', 'baseId'] as const,
  },
  {
    id: 'step1',
    title: 'Definir Itens',
    description: 'Defina os itens a pesquisar',
    fields: ['items'] as const,
  },
  {
    id: 'step2',
    title: 'Selecionar Fontes',
    description: 'Escolha as fontes de precos',
    fields: ['selectedSources'] as const,
  },
  {
    id: 'step3',
    title: 'Executar Pesquisa',
    description: 'Aguarde a coleta de precos',
    fields: ['isExecuting', 'executionProgress', 'executionErrors'] as const,
  },
  {
    id: 'step4',
    title: 'Revisar Resultados',
    description: 'Revise e ajuste os resultados',
    fields: ['results', 'selectedPrices', 'justifications'] as const,
  },
] as const;

// Step schemas array for validation
export const pesquisaStepSchemas = [
  step0BaseSelectionSchema,
  step1ItemsSchema,
  step2SourcesSchema,
  step3ExecutionSchema,
  step4ReviewSchema,
];
