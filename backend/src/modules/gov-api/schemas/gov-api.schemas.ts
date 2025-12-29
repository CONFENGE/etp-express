/**
 * Zod schemas for validating government API responses
 *
 * These schemas ensure type safety at runtime by validating
 * all responses from ComprasGov and PNCP APIs before processing.
 *
 * @module modules/gov-api/schemas
 * @see https://github.com/CONFENGE/etp-express/issues/1054
 */

import { z } from 'zod';

// ============================================================================
// ComprasGov Schemas
// ============================================================================

/**
 * Schema for ComprasGov licitacao raw response
 */
export const ComprasGovLicitacaoRawSchema = z.object({
  identificador: z.number(),
  numero_aviso: z.string(),
  modalidade: z.number(),
  uasg: z.number(),
  objeto: z.string().optional(),
  situacao: z.string().optional(),
  data_publicacao: z.string().optional(),
  data_entrega_proposta: z.string().optional(),
  valor_estimado: z.number().optional(),
  _links: z.record(z.any()).optional(),
});

/**
 * Schema for ComprasGov list response with embedded licitacoes
 */
export const ComprasGovListResponseSchema = z.object({
  _embedded: z
    .object({
      licitacoes: z.array(ComprasGovLicitacaoRawSchema).optional(),
    })
    .optional(),
  total: z.number().optional(),
  _links: z.record(z.any()).optional(),
});

/**
 * Schema for ComprasGov material (CATMAT)
 */
export const ComprasGovMaterialRawSchema = z.object({
  codigo: z.number(),
  descricao: z.string(),
  unidade: z.string().optional(),
  sustentavel: z.boolean().optional(),
});

/**
 * Schema for ComprasGov servico (CATSER)
 */
export const ComprasGovServicoRawSchema = z.object({
  codigo: z.number(),
  descricao: z.string(),
  unidade: z.string().optional(),
});

/**
 * Schema for ComprasGov contrato raw response
 */
export const ComprasGovContratoRawSchema = z.object({
  numero: z.string(),
  objeto: z.string().optional(),
  valor: z.number().optional(),
  vigencia_inicio: z.string().optional(),
  vigencia_fim: z.string().optional(),
  fornecedor_cnpj: z.string().optional(),
  fornecedor_nome: z.string().optional(),
});

// ============================================================================
// PNCP Schemas
// ============================================================================

/**
 * Schema for PNCP orgaoEntidade
 */
export const PncpOrgaoEntidadeSchema = z.object({
  cnpj: z.string(),
  razaoSocial: z.string().optional(),
  poderId: z.string().optional(),
  esferaId: z.string().optional(),
});

/**
 * Schema for PNCP unidadeOrgao
 */
export const PncpUnidadeSchema = z.object({
  codigoUnidade: z.string().optional(),
  nomeUnidade: z.string().optional(),
  ufSigla: z.string().optional(),
  ufNome: z.string().optional(),
  municipioNome: z.string().optional(),
  codigoIbge: z.string().optional(),
});

/**
 * Schema for PNCP contratacao
 */
export const PncpContratacaoSchema = z.object({
  numeroControlePNCP: z.string(),
  anoCompra: z.number(),
  sequencialCompra: z.number(),
  numeroCompra: z.string().optional(),
  objetoCompra: z.string(),
  informacaoComplementar: z.string().optional(),
  modalidadeId: z.number().optional(),
  modalidadeNome: z.string().optional(),
  situacaoCompraId: z.number().optional(),
  situacaoCompraNome: z.string().optional(),
  valorTotalEstimado: z.number().optional(),
  valorTotalHomologado: z.number().optional(),
  dataPublicacaoPncp: z.string(),
  dataAberturaProposta: z.string().optional(),
  dataEncerramentoProposta: z.string().optional(),
  srp: z.boolean(),
  orgaoEntidade: PncpOrgaoEntidadeSchema.optional(),
  unidadeOrgao: PncpUnidadeSchema.optional(),
});

/**
 * Schema for PNCP fornecedor
 */
export const PncpFornecedorSchema = z.object({
  cnpjCpf: z.string(),
  nomeRazaoSocial: z.string().optional(),
  tipo: z.string().optional(),
});

/**
 * Schema for PNCP contrato
 */
export const PncpContratoSchema = z.object({
  numeroControlePNCP: z.string(),
  anoContrato: z.number().optional(),
  sequencialContrato: z.number().optional(),
  numeroContrato: z.string().optional(),
  objetoContrato: z.string().optional(),
  valorInicial: z.number(),
  valorGlobal: z.number().optional(),
  dataAssinatura: z.string().optional(),
  dataVigenciaInicio: z.string().optional(),
  dataVigenciaFim: z.string().optional(),
  fornecedor: PncpFornecedorSchema.optional(),
  orgaoEntidade: PncpOrgaoEntidadeSchema.optional(),
});

/**
 * Schema for PNCP ata de registro de precos
 */
export const PncpAtaSchema = z.object({
  numeroControlePNCP: z.string(),
  anoAta: z.number().optional(),
  sequencialAta: z.number().optional(),
  numeroAta: z.string().optional(),
  dataAssinatura: z.string().optional(),
  dataVigenciaInicio: z.string().optional(),
  dataVigenciaFim: z.string().optional(),
  contratacao: PncpContratacaoSchema.optional(),
  orgaoEntidade: PncpOrgaoEntidadeSchema.optional(),
});

/**
 * Schema for PNCP paginated response
 */
export const PncpContratacaoPaginatedSchema = z.object({
  data: z.array(PncpContratacaoSchema),
  numeroPagina: z.number(),
  quantidadeRegistrosPagina: z.number(),
  totalRegistros: z.number(),
  totalPaginas: z.number(),
});

/**
 * Schema for PNCP contrato paginated response
 */
export const PncpContratoPaginatedSchema = z.object({
  data: z.array(PncpContratoSchema),
  numeroPagina: z.number(),
  quantidadeRegistrosPagina: z.number(),
  totalRegistros: z.number(),
  totalPaginas: z.number(),
});

/**
 * Schema for PNCP ata paginated response
 */
export const PncpAtaPaginatedSchema = z.object({
  data: z.array(PncpAtaSchema),
  numeroPagina: z.number(),
  quantidadeRegistrosPagina: z.number(),
  totalRegistros: z.number(),
  totalPaginas: z.number(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format Zod errors into human-readable strings
 *
 * @param error - Zod error object
 * @returns Array of formatted error messages
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
}

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type ComprasGovLicitacaoRawZod = z.infer<
  typeof ComprasGovLicitacaoRawSchema
>;
export type ComprasGovListResponseZod = z.infer<
  typeof ComprasGovListResponseSchema
>;
export type ComprasGovMaterialRawZod = z.infer<
  typeof ComprasGovMaterialRawSchema
>;
export type ComprasGovServicoRawZod = z.infer<
  typeof ComprasGovServicoRawSchema
>;
export type ComprasGovContratoRawZod = z.infer<
  typeof ComprasGovContratoRawSchema
>;

export type PncpOrgaoEntidadeZod = z.infer<typeof PncpOrgaoEntidadeSchema>;
export type PncpUnidadeZod = z.infer<typeof PncpUnidadeSchema>;
export type PncpContratacaoZod = z.infer<typeof PncpContratacaoSchema>;
export type PncpContratoZod = z.infer<typeof PncpContratoSchema>;
export type PncpAtaZod = z.infer<typeof PncpAtaSchema>;
export type PncpContratacaoPaginatedZod = z.infer<
  typeof PncpContratacaoPaginatedSchema
>;
export type PncpContratoPaginatedZod = z.infer<
  typeof PncpContratoPaginatedSchema
>;
export type PncpAtaPaginatedZod = z.infer<typeof PncpAtaPaginatedSchema>;
