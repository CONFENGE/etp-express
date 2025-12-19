/**
 * Compras.gov.br (SIASG) API Types
 *
 * Type definitions for the Compras.gov.br API (dados abertos).
 * API Documentation: https://compras.dados.gov.br/docs/
 *
 * @module modules/gov-api/compras-gov
 */

import { GovApiContract } from '../interfaces/gov-api.interface';

/**
 * Modality codes for government bidding processes
 * Based on Compras.gov.br API documentation
 */
export enum ComprasGovModalidade {
 /** Concorrencia */
 CONCORRENCIA = 1,
 /** Tomada de Precos */
 TOMADA_PRECOS = 2,
 /** Convite */
 CONVITE = 3,
 /** Concurso */
 CONCURSO = 4,
 /** Leilao */
 LEILAO = 5,
 /** Dispensa de Licitacao */
 DISPENSA = 6,
 /** Inexigibilidade */
 INEXIGIBILIDADE = 7,
 /** Pregao */
 PREGAO = 8,
 /** Regime Diferenciado de Contratacoes */
 RDC = 9,
}

/**
 * Status codes for bidding processes
 */
export enum ComprasGovSituacao {
 /** Publicado */
 PUBLICADO = 'Publicado',
 /** Aberto */
 ABERTO = 'Aberto',
 /** Encerrado */
 ENCERRADO = 'Encerrado',
 /** Homologado */
 HOMOLOGADO = 'Homologado',
 /** Cancelado */
 CANCELADO = 'Cancelado',
 /** Anulado */
 ANULADO = 'Anulado',
 /** Revogado */
 REVOGADO = 'Revogado',
 /** Deserto */
 DESERTO = 'Deserto',
 /** Fracassado */
 FRACASSADO = 'Fracassado',
}

/**
 * Raw API response structure for a licitacao (bid)
 * Matches the JSON structure returned by compras.dados.gov.br/licitacoes/v1/licitacoes.json
 */
export interface ComprasGovLicitacaoRaw {
 /** Unique identifier from the API (combination of modalidade + numero_aviso) */
 identificador: string;
 /** Bid notice number */
 numero_aviso: number;
 /** Object/purpose of the bid */
 objeto: string;
 /** Modality code */
 modalidade: number;
 /** Modality description */
 modalidade_descricao?: string;
 /** Publication date (ISO format) */
 data_publicacao: string;
 /** Proposal opening date (ISO format) */
 data_abertura_proposta?: string;
 /** Tender delivery date (ISO format) */
 data_entrega_edital?: string;
 /** Proposal submission date (ISO format) */
 data_entrega_proposta?: string;
 /** UASG (Administrative Unit) code */
 uasg: number;
 /** UASG name */
 uasg_nome?: string;
 /** State abbreviation */
 uf_uasg?: string;
 /** Status of the bid */
 situacao_aviso: string;
 /** Estimated total value */
 valor_estimado_total?: number;
 /** Electronic bidding indicator */
 pregao_eletronico?: boolean;
 /** URL to the bid details */
 link_licitacao?: string;
}

/**
 * Raw API response structure for materiais (materials catalog)
 */
export interface ComprasGovMaterialRaw {
 /** Material code (CATMAT) */
 codigo: string;
 /** Material description */
 descricao: string;
 /** Unit of measurement */
 unidade_fornecimento: string;
 /** Material class code */
 classe_codigo: number;
 /** Material class description */
 classe_descricao?: string;
 /** Material group code */
 grupo_codigo: number;
 /** Material group description */
 grupo_descricao?: string;
 /** Sustainable material indicator */
 sustentavel?: boolean;
}

/**
 * Raw API response structure for servicos (services catalog)
 */
export interface ComprasGovServicoRaw {
 /** Service code (CATSER) */
 codigo: string;
 /** Service description */
 descricao: string;
 /** Unit of measurement */
 unidade_medida: string;
 /** Service class code */
 classe_codigo: number;
 /** Service class description */
 classe_descricao?: string;
 /** Service group code */
 grupo_codigo: number;
 /** Service group description */
 grupo_descricao?: string;
}

/**
 * Raw API response structure for contratos (contracts)
 */
export interface ComprasGovContratoRaw {
 /** Contract identifier */
 identificador: string;
 /** Contract number */
 numero: string;
 /** Year */
 ano: number;
 /** Object/purpose */
 objeto: string;
 /** Modality code */
 modalidade: number;
 /** Modality description */
 modalidade_descricao?: string;
 /** UASG code */
 uasg: number;
 /** UASG name */
 uasg_nome?: string;
 /** State abbreviation */
 uf_uasg?: string;
 /** Supplier CNPJ */
 cnpj_contratado?: string;
 /** Supplier name */
 nome_contratado?: string;
 /** Total value */
 valor_total?: number;
 /** Initial value */
 valor_inicial?: number;
 /** Start date */
 data_inicio_vigencia?: string;
 /** End date */
 data_fim_vigencia?: string;
 /** Publication date */
 data_publicacao?: string;
}

/**
 * Raw API list response wrapper
 */
export interface ComprasGovListResponse<T> {
 /** Link to this resource */
 _links?: {
 self?: { href: string };
 next?: { href: string };
 prev?: { href: string };
 };
 /** Embedded resources */
 _embedded?: {
 licitacoes?: T[];
 materiais?: T[];
 servicos?: T[];
 contratos?: T[];
 };
 /** Total count (may not be present in all responses) */
 total?: number;
}

/**
 * Search filters specific to Compras.gov.br API
 * Extends base filters with API-specific parameters
 */
export interface ComprasGovSearchFilters {
 /** Search term for objeto (purpose) field */
 objeto?: string;
 /** CNPJ of winning supplier */
 cnpj_vencedor?: string;
 /** CPF of winning supplier */
 cpf_vencedor?: string;
 /** Minimum publication date (YYYY-MM-DD) */
 data_publicacao_min?: string;
 /** Maximum publication date (YYYY-MM-DD) */
 data_publicacao_max?: string;
 /** Minimum proposal opening date */
 data_abertura_proposta_min?: string;
 /** Maximum proposal opening date */
 data_abertura_proposta_max?: string;
 /** Material item code (CATMAT) */
 item_material?: string;
 /** Service item code (CATSER) */
 item_servico?: string;
 /** Modality code */
 modalidade?: ComprasGovModalidade;
 /** Bid notice number */
 numero_aviso?: number;
 /** Government agency code */
 orgao?: number;
 /** Electronic bidding indicator */
 pregao_eletronico?: boolean;
 /** UASG code */
 uasg?: number;
 /** State abbreviation */
 uf_uasg?: string;
 /** Minimum estimated value */
 valor_estimado_total_min?: number;
 /** Maximum estimated value */
 valor_estimado_total_max?: number;
 /** Offset for pagination (results are limited to 500 per page) */
 offset?: number;
}

/**
 * Extended contract type for Compras.gov.br
 * Includes all standard GovApiContract fields plus specific fields
 */
export interface ComprasGovContract extends GovApiContract {
 /** UASG code */
 uasg: number;
 /** Bid notice number */
 numeroAviso: number;
 /** Electronic bidding indicator */
 pregaoEletronico: boolean;
 /** Estimated total value */
 valorEstimado?: number;
}

/**
 * Transform raw licitacao to GovApiContract format
 */
export function transformLicitacaoToContract(
 raw: ComprasGovLicitacaoRaw,
): ComprasGovContract {
 return {
 // GovApiSearchResult fields
 id: raw.identificador,
 title: `Licitacao ${raw.numero_aviso} - ${raw.modalidade_descricao || getModalidadeDescription(raw.modalidade)}`,
 description: raw.objeto,
 source: 'comprasgov',
 url: raw.link_licitacao || buildLicitacaoUrl(raw),
 relevance: 1.0, // Will be adjusted by search ranking
 fetchedAt: new Date(),
 // GovApiContract fields
 numero: String(raw.numero_aviso),
 ano: new Date(raw.data_publicacao).getFullYear(),
 orgaoContratante: {
 cnpj: '', // Not directly available in licitacao response
 nome: raw.uasg_nome || `UASG ${raw.uasg}`,
 uf: raw.uf_uasg || '',
 },
 objeto: raw.objeto,
 valorTotal: raw.valor_estimado_total || 0,
 modalidade:
 raw.modalidade_descricao || getModalidadeDescription(raw.modalidade),
 status: raw.situacao_aviso,
 dataPublicacao: new Date(raw.data_publicacao),
 dataAbertura: raw.data_abertura_proposta
 ? new Date(raw.data_abertura_proposta)
 : undefined,
 // ComprasGovContract specific fields
 uasg: raw.uasg,
 numeroAviso: raw.numero_aviso,
 pregaoEletronico: raw.pregao_eletronico || false,
 valorEstimado: raw.valor_estimado_total,
 };
}

/**
 * Get modality description from code
 */
function getModalidadeDescription(codigo: number): string {
 const modalidades: Record<number, string> = {
 1: 'Concorrencia',
 2: 'Tomada de Precos',
 3: 'Convite',
 4: 'Concurso',
 5: 'Leilao',
 6: 'Dispensa de Licitacao',
 7: 'Inexigibilidade',
 8: 'Pregao',
 9: 'RDC',
 };
 return modalidades[codigo] || `Modalidade ${codigo}`;
}

/**
 * Build URL to licitacao details page
 */
function buildLicitacaoUrl(licitacao: ComprasGovLicitacaoRaw): string {
 return `https://compras.dados.gov.br/licitacoes/id/${licitacao.identificador}`;
}

/**
 * Build cache key for search queries
 */
export function buildCacheKey(
 endpoint: string,
 filters: ComprasGovSearchFilters,
): string {
 const sortedFilters = Object.entries(filters)
 .filter(([, value]) => value !== undefined && value !== null)
 .sort(([a], [b]) => a.localeCompare(b))
 .map(([key, value]) => `${key}=${value}`)
 .join('&');

 return `${endpoint}:${sortedFilters}`;
}
