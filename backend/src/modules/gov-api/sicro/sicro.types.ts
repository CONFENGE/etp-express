/**
 * SICRO Types
 *
 * Type definitions for SICRO (Sistema de Custos Referenciais de Obras) data ingestion.
 *
 * SICRO is the Brazilian national reference system for transportation infrastructure
 * costs, published by DNIT (Departamento Nacional de Infraestrutura de Transportes).
 * Mandatory for works bid by DNIT.
 *
 * Data Source: https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/
 *
 * @module modules/gov-api/sicro
 * @see https://github.com/CONFENGE/etp-express/issues/694
 */

import { GovApiPriceReference } from '../interfaces/gov-api.interface';

/**
 * Brazilian states (UF) supported by SICRO
 */
export type SicroUF =
 | 'AC'
 | 'AL'
 | 'AM'
 | 'AP'
 | 'BA'
 | 'CE'
 | 'DF'
 | 'ES'
 | 'GO'
 | 'MA'
 | 'MG'
 | 'MS'
 | 'MT'
 | 'PA'
 | 'PB'
 | 'PE'
 | 'PI'
 | 'PR'
 | 'RJ'
 | 'RN'
 | 'RO'
 | 'RR'
 | 'RS'
 | 'SC'
 | 'SE'
 | 'SP'
 | 'TO';

/**
 * SICRO item types
 */
export enum SicroItemType {
 /** Insumo (input/material) */
 INSUMO = 'INSUMO',
 /** Composicao (composition/service) */
 COMPOSICAO = 'COMPOSICAO',
}

/**
 * SICRO categories for transportation infrastructure
 */
export enum SicroCategoria {
 /** Terraplanagem - Earthwork */
 TERRAPLANAGEM = 'TERRAPLANAGEM',
 /** Pavimentacao - Paving */
 PAVIMENTACAO = 'PAVIMENTACAO',
 /** Drenagem e OAC - Drainage and Special Works */
 DRENAGEM_OAC = 'DRENAGEM_OAC',
 /** Obras de Arte Especiais - Special Art Works (bridges, viaducts) */
 OBRAS_ARTE_ESPECIAIS = 'OBRAS_ARTE_ESPECIAIS',
 /** Sinalizacao - Signaling */
 SINALIZACAO = 'SINALIZACAO',
 /** Servicos Complementares - Complementary Services */
 SERVICOS_COMPLEMENTARES = 'SERVICOS_COMPLEMENTARES',
 /** Conservacao Rodoviaria - Road Maintenance */
 CONSERVACAO_RODOVIARIA = 'CONSERVACAO_RODOVIARIA',
 /** Meio Ambiente - Environmental */
 MEIO_AMBIENTE = 'MEIO_AMBIENTE',
 /** Equipamentos - Equipment */
 EQUIPAMENTOS = 'EQUIPAMENTOS',
 /** Mao de Obra - Labor */
 MAO_DE_OBRA = 'MAO_DE_OBRA',
 /** Materiais - Materials */
 MATERIAIS = 'MATERIAIS',
 /** Transportes - Transportation */
 TRANSPORTES = 'TRANSPORTES',
}

/**
 * SICRO infrastructure type (mode of transport)
 */
export enum SicroModoTransporte {
 /** Rodoviario - Road */
 RODOVIARIO = 'RODOVIARIO',
 /** Aquaviario - Waterway */
 AQUAVIARIO = 'AQUAVIARIO',
 /** Ferroviario - Railway */
 FERROVIARIO = 'FERROVIARIO',
}

/**
 * Raw SICRO insumo (input) as parsed from Excel
 */
export interface SicroInsumoRaw {
 /** Item code */
 codigo: string;
 /** Item description */
 descricao: string;
 /** Unit of measurement */
 unidade: string;
 /** Unit price with taxes (onerado) */
 precoOnerado?: number;
 /** Unit price without taxes (desonerado) */
 precoDesonerado?: number;
 /** Category code */
 categoriaId?: string;
 /** Category description */
 categoriaDescricao?: string;
 /** Transport mode */
 modoTransporte?: SicroModoTransporte;
}

/**
 * Raw SICRO composicao (composition/service) as parsed from Excel
 */
export interface SicroComposicaoRaw {
 /** Composition code */
 codigo: string;
 /** Composition description */
 descricao: string;
 /** Unit of measurement */
 unidade: string;
 /** Total price with taxes (onerado) */
 precoOnerado?: number;
 /** Total price without taxes (desonerado) */
 precoDesonerado?: number;
 /** Labor cost component */
 custoMaoDeObra?: number;
 /** Material cost component */
 custoMaterial?: number;
 /** Equipment cost component */
 custoEquipamento?: number;
 /** Transportation cost component */
 custoTransporte?: number;
 /** Category */
 categoria?: SicroCategoria;
 /** Transport mode */
 modoTransporte?: SicroModoTransporte;
 /** Composition items (components) */
 itens?: SicroComposicaoItem[];
}

/**
 * Item within a SICRO composition
 */
export interface SicroComposicaoItem {
 /** Item code (insumo or composition) */
 codigo: string;
 /** Item description */
 descricao: string;
 /** Unit */
 unidade: string;
 /** Coefficient (quantity used) */
 coeficiente: number;
 /** Unit price */
 precoUnitario: number;
 /** Total price (coeficiente * precoUnitario) */
 precoTotal: number;
}

/**
 * SICRO price reference extending base GovApiPriceReference
 */
export interface SicroPriceReference extends GovApiPriceReference {
 /** Item type (insumo or composicao) */
 tipo: SicroItemType;
 /** Category code */
 categoriaId?: string;
 /** Category description */
 categoriaDescricao?: string;
 /** Price with taxes (onerado) */
 precoOnerado: number;
 /** Price without taxes (desonerado) */
 precoDesonerado: number;
 /** Transport mode */
 modoTransporte?: SicroModoTransporte;
 /** Labor cost component (for composicoes) */
 custoMaoDeObra?: number;
 /** Material cost component (for composicoes) */
 custoMaterial?: number;
 /** Equipment cost component (for composicoes) */
 custoEquipamento?: number;
 /** Transportation cost component (for composicoes) */
 custoTransporte?: number;
}

/**
 * Search filters specific to SICRO
 */
export interface SicroSearchFilters {
 /** Search term for description */
 descricao?: string;
 /** Item code */
 codigo?: string;
 /** State (UF) */
 uf?: SicroUF;
 /** Reference month (YYYY-MM format) */
 mesReferencia?: string;
 /** Item type (insumo or composicao) */
 tipo?: SicroItemType;
 /** Category */
 categoria?: SicroCategoria;
 /** Transport mode */
 modoTransporte?: SicroModoTransporte;
 /** Price type (desonerado or not) */
 desonerado?: boolean;
 /** Minimum price */
 precoMinimo?: number;
 /** Maximum price */
 precoMaximo?: number;
 /** Page number */
 page?: number;
 /** Results per page */
 perPage?: number;
}

/**
 * SICRO Excel file metadata
 */
export interface SicroExcelMetadata {
 /** Reference month (YYYY-MM) */
 mesReferencia: string;
 /** State (UF) */
 uf: SicroUF;
 /** File type */
 tipo: SicroItemType;
 /** Transport mode */
 modoTransporte?: SicroModoTransporte;
 /** Download URL */
 url: string;
 /** File name */
 filename: string;
 /** File size in bytes (if known) */
 fileSize?: number;
 /** Last modified date */
 lastModified?: Date;
}

/**
 * Result from parsing SICRO Excel file
 */
export interface SicroParseResult {
 /** Parsed items */
 items: SicroPriceReference[];
 /** Total count */
 count: number;
 /** File metadata */
 metadata: SicroExcelMetadata;
 /** Parse errors (non-fatal) */
 errors: SicroParseError[];
 /** Processing duration in ms */
 durationMs: number;
}

/**
 * Error during parsing (non-fatal)
 */
export interface SicroParseError {
 /** Row number (1-indexed) */
 row?: number;
 /** Error message */
 message: string;
 /** Field that caused error */
 field?: string;
}

/**
 * Build unique ID for SICRO item
 * Format: sicro:codigo:uf:mesRef:D|O
 *
 * @param codigo Item code
 * @param uf State
 * @param mesReferencia Reference month (YYYY-MM)
 * @param desonerado Whether price is desonerado
 */
export function buildSicroId(
 codigo: string,
 uf: SicroUF,
 mesReferencia: string,
 desonerado: boolean,
): string {
 const suffix = desonerado ? 'D' : 'O';
 return `sicro:${codigo}:${uf}:${mesReferencia}:${suffix}`;
}

/**
 * Build cache key for SICRO search
 *
 * @param filters Search filters
 */
export function buildSicroCacheKey(filters: SicroSearchFilters): string {
 const parts: string[] = ['search'];

 if (filters.descricao) parts.push(`desc:${filters.descricao.toLowerCase()}`);
 if (filters.codigo) parts.push(`cod:${filters.codigo}`);
 if (filters.uf) parts.push(`uf:${filters.uf}`);
 if (filters.mesReferencia) parts.push(`mes:${filters.mesReferencia}`);
 if (filters.tipo) parts.push(`tipo:${filters.tipo}`);
 if (filters.categoria) parts.push(`cat:${filters.categoria}`);
 if (filters.modoTransporte) parts.push(`modo:${filters.modoTransporte}`);
 if (filters.desonerado !== undefined) parts.push(`des:${filters.desonerado}`);
 if (filters.precoMinimo !== undefined)
 parts.push(`min:${filters.precoMinimo}`);
 if (filters.precoMaximo !== undefined)
 parts.push(`max:${filters.precoMaximo}`);
 if (filters.page) parts.push(`p:${filters.page}`);
 if (filters.perPage) parts.push(`pp:${filters.perPage}`);

 return parts.join(':');
}

/**
 * Format reference month to standard format
 *
 * @param input Input string (various formats)
 * @returns YYYY-MM format
 */
export function formatMesReferencia(input: string): string {
 // Already in YYYY-MM format
 if (/^\d{4}-\d{2}$/.test(input)) {
 return input;
 }

 // YYYYMM format
 if (/^\d{6}$/.test(input)) {
 return `${input.slice(0, 4)}-${input.slice(4, 6)}`;
 }

 // MM/YYYY format
 const match = input.match(/^(\d{2})\/(\d{4})$/);
 if (match) {
 return `${match[2]}-${match[1]}`;
 }

 // Try parsing as date
 const date = new Date(input);
 if (!isNaN(date.getTime())) {
 const year = date.getFullYear();
 const month = String(date.getMonth() + 1).padStart(2, '0');
 return `${year}-${month}`;
 }

 return input;
}

/**
 * Transform raw insumo to SicroPriceReference
 *
 * @param insumo Raw insumo data
 * @param uf State
 * @param mesReferencia Reference month
 * @param desonerado Whether to use desonerado price
 */
export function transformInsumoToReference(
 insumo: SicroInsumoRaw,
 uf: SicroUF,
 mesReferencia: string,
 desonerado: boolean,
): SicroPriceReference {
 const preco = desonerado
 ? (insumo.precoDesonerado ?? insumo.precoOnerado ?? 0)
 : (insumo.precoOnerado ?? 0);

 return {
 id: buildSicroId(insumo.codigo, uf, mesReferencia, desonerado),
 title: insumo.descricao,
 description: `${insumo.descricao} - ${insumo.unidade}`,
 source: 'sicro',
 url: `https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro/${uf.toLowerCase()}`,
 relevance: 1.0,
 fetchedAt: new Date(),
 codigo: insumo.codigo,
 descricao: insumo.descricao,
 unidade: insumo.unidade,
 precoUnitario: preco,
 mesReferencia: formatMesReferencia(mesReferencia),
 uf,
 desonerado,
 categoria: insumo.categoriaDescricao ?? 'INSUMO',
 tipo: SicroItemType.INSUMO,
 categoriaId: insumo.categoriaId,
 categoriaDescricao: insumo.categoriaDescricao,
 precoOnerado: insumo.precoOnerado ?? 0,
 precoDesonerado: insumo.precoDesonerado ?? insumo.precoOnerado ?? 0,
 modoTransporte: insumo.modoTransporte,
 };
}

/**
 * Transform raw composicao to SicroPriceReference
 *
 * @param composicao Raw composicao data
 * @param uf State
 * @param mesReferencia Reference month
 * @param desonerado Whether to use desonerado price
 */
export function transformComposicaoToReference(
 composicao: SicroComposicaoRaw,
 uf: SicroUF,
 mesReferencia: string,
 desonerado: boolean,
): SicroPriceReference {
 const preco = desonerado
 ? (composicao.precoDesonerado ?? composicao.precoOnerado ?? 0)
 : (composicao.precoOnerado ?? 0);

 return {
 id: buildSicroId(composicao.codigo, uf, mesReferencia, desonerado),
 title: composicao.descricao,
 description: `${composicao.descricao} - ${composicao.unidade}`,
 source: 'sicro',
 url: `https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro/${uf.toLowerCase()}`,
 relevance: 1.0,
 fetchedAt: new Date(),
 codigo: composicao.codigo,
 descricao: composicao.descricao,
 unidade: composicao.unidade,
 precoUnitario: preco,
 mesReferencia: formatMesReferencia(mesReferencia),
 uf,
 desonerado,
 categoria: composicao.categoria ?? 'COMPOSICAO',
 tipo: SicroItemType.COMPOSICAO,
 precoOnerado: composicao.precoOnerado ?? 0,
 precoDesonerado: composicao.precoDesonerado ?? composicao.precoOnerado ?? 0,
 modoTransporte: composicao.modoTransporte,
 custoMaoDeObra: composicao.custoMaoDeObra,
 custoMaterial: composicao.custoMaterial,
 custoEquipamento: composicao.custoEquipamento,
 custoTransporte: composicao.custoTransporte,
 };
}

/**
 * Mapping from SICRO category code to human-readable name
 */
export const SICRO_CATEGORIA_NAMES: Record<string, string> = {
 TERRAPLANAGEM: 'Terraplanagem',
 PAVIMENTACAO: 'Pavimentacao',
 DRENAGEM_OAC: 'Drenagem e OAC',
 OBRAS_ARTE_ESPECIAIS: 'Obras de Arte Especiais',
 SINALIZACAO: 'Sinalizacao',
 SERVICOS_COMPLEMENTARES: 'Servicos Complementares',
 CONSERVACAO_RODOVIARIA: 'Conservacao Rodoviaria',
 MEIO_AMBIENTE: 'Meio Ambiente',
 EQUIPAMENTOS: 'Equipamentos',
 MAO_DE_OBRA: 'Mao de Obra',
 MATERIAIS: 'Materiais',
 TRANSPORTES: 'Transportes',
};

/**
 * Mapping from SICRO transport mode to human-readable name
 */
export const SICRO_MODO_TRANSPORTE_NAMES: Record<SicroModoTransporte, string> =
 {
 [SicroModoTransporte.RODOVIARIO]: 'Rodoviario',
 [SicroModoTransporte.AQUAVIARIO]: 'Aquaviario',
 [SicroModoTransporte.FERROVIARIO]: 'Ferroviario',
 };
