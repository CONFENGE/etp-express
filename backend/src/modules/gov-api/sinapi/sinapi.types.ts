/**
 * SINAPI Types
 *
 * Type definitions for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices
 * da Construção Civil) data ingestion.
 *
 * SINAPI is the Brazilian national reference system for construction costs,
 * published monthly by CAIXA and mandatory for federal public works
 * (Decreto 7.983/2013).
 *
 * Data Source: https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/
 *
 * @module modules/gov-api/sinapi
 * @see https://github.com/CONFENGE/etp-express/issues/693
 */

import { GovApiPriceReference } from '../interfaces/gov-api.interface';

/**
 * Brazilian states (UF) supported by SINAPI
 */
export type SinapiUF =
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
 * SINAPI item types
 */
export enum SinapiItemType {
  /** Insumo (input/material) */
  INSUMO = 'INSUMO',
  /** Composição (composition/assembly) */
  COMPOSICAO = 'COMPOSICAO',
}

/**
 * SINAPI item categories
 */
export enum SinapiCategoria {
  /** Servicos - Services */
  SERVICOS = 'SERVICOS',
  /** Equipamentos - Equipment */
  EQUIPAMENTOS = 'EQUIPAMENTOS',
  /** Mao de Obra - Labor */
  MAO_DE_OBRA = 'MAO_DE_OBRA',
  /** Materiais - Materials */
  MATERIAIS = 'MATERIAIS',
}

/**
 * Raw SINAPI insumo (input) as parsed from Excel
 */
export interface SinapiInsumoRaw {
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
  /** Class code */
  classeId?: string;
  /** Class description */
  classeDescricao?: string;
}

/**
 * Raw SINAPI composicao (composition) as parsed from Excel
 */
export interface SinapiComposicaoRaw {
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
  /** Composition items */
  itens?: SinapiComposicaoItem[];
}

/**
 * Item within a SINAPI composition
 */
export interface SinapiComposicaoItem {
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
 * SINAPI price reference extending base GovApiPriceReference
 */
export interface SinapiPriceReference extends GovApiPriceReference {
  /** Item type (insumo or composicao) */
  tipo: SinapiItemType;
  /** Class code */
  classeId?: string;
  /** Class description */
  classeDescricao?: string;
  /** Price with taxes (onerado) */
  precoOnerado: number;
  /** Price without taxes (desonerado) */
  precoDesonerado: number;
}

/**
 * Search filters specific to SINAPI
 */
export interface SinapiSearchFilters {
  /** Search term for description */
  descricao?: string;
  /** Item code */
  codigo?: string;
  /** State (UF) */
  uf?: SinapiUF;
  /** Reference month (YYYY-MM format) */
  mesReferencia?: string;
  /** Item type (insumo or composicao) */
  tipo?: SinapiItemType;
  /** Category */
  categoria?: SinapiCategoria;
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
 * SINAPI Excel file metadata
 */
export interface SinapiExcelMetadata {
  /** Reference month (YYYY-MM) */
  mesReferencia: string;
  /** State (UF) */
  uf: SinapiUF;
  /** File type */
  tipo: SinapiItemType;
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
 * Parse result from SINAPI Excel file
 */
export interface SinapiParseResult {
  /** Parsed items */
  items: SinapiPriceReference[];
  /** Number of items parsed */
  count: number;
  /** Metadata about the source file */
  metadata: SinapiExcelMetadata;
  /** Parse errors (if any) */
  errors: SinapiParseError[];
  /** Parse duration in milliseconds */
  durationMs: number;
}

/**
 * Parse error details
 */
export interface SinapiParseError {
  /** Row number in Excel */
  row?: number;
  /** Column name */
  column?: string;
  /** Error message */
  message: string;
  /** Raw value that caused the error */
  rawValue?: string;
}

/**
 * SINAPI download progress info
 */
export interface SinapiDownloadProgress {
  /** Current step */
  step: 'downloading' | 'parsing' | 'saving' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current file being processed */
  currentFile?: string;
  /** Total files to process */
  totalFiles?: number;
  /** Current file index */
  currentFileIndex?: number;
  /** Items processed so far */
  itemsProcessed?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Build cache key for SINAPI searches
 */
export function buildSinapiCacheKey(filters: SinapiSearchFilters): string {
  const sortedFilters = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `sinapi:${sortedFilters}`;
}

/**
 * Format reference month to YYYY-MM
 */
export function formatMesReferencia(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parse reference month from YYYY-MM format
 */
export function parseMesReferencia(mesReferencia: string): Date | null {
  const match = mesReferencia.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month] = match;
  return new Date(parseInt(year), parseInt(month) - 1, 1);
}

/**
 * Get SINAPI download URL for a specific month and state
 * Note: CAIXA does not provide a stable URL pattern. This is a placeholder
 * that should be updated based on the actual CAIXA download page structure.
 */
export function getSinapiDownloadUrl(
  uf: SinapiUF,
  mesReferencia: string,
  tipo: SinapiItemType,
): string {
  // CAIXA download page - actual URL needs to be scraped from the page
  // This is a placeholder structure
  const baseUrl = 'https://www.caixa.gov.br/Downloads/sinapi-a-partir-jul-2009';
  const tipoFolder = tipo === SinapiItemType.INSUMO ? 'Insumos' : 'Composicoes';
  const [year, month] = mesReferencia.split('-');

  // Format: SINAPI_Preco_Ref_Insumos_DF_202401_Desonerado.xlsx
  return `${baseUrl}/${tipoFolder}/SINAPI_Preco_Ref_${tipoFolder}_${uf}_${year}${month}.xlsx`;
}

/**
 * Transform raw insumo to SinapiPriceReference
 */
export function transformInsumoToReference(
  raw: SinapiInsumoRaw,
  uf: SinapiUF,
  mesReferencia: string,
  desonerado: boolean,
): SinapiPriceReference {
  const preco = desonerado ? raw.precoDesonerado || 0 : raw.precoOnerado || 0;

  return {
    // GovApiSearchResult fields
    id: `sinapi:${raw.codigo}:${uf}:${mesReferencia}:${desonerado ? 'D' : 'O'}`,
    title: raw.descricao,
    description: raw.descricao,
    source: 'sinapi',
    url: undefined,
    relevance: 1.0,
    fetchedAt: new Date(),
    // GovApiPriceReference fields
    codigo: raw.codigo,
    descricao: raw.descricao,
    unidade: raw.unidade,
    precoUnitario: preco,
    mesReferencia,
    uf,
    desonerado,
    categoria: SinapiCategoria.MATERIAIS,
    // SinapiPriceReference specific fields
    tipo: SinapiItemType.INSUMO,
    classeId: raw.classeId,
    classeDescricao: raw.classeDescricao,
    precoOnerado: raw.precoOnerado || 0,
    precoDesonerado: raw.precoDesonerado || 0,
  };
}

/**
 * Transform raw composicao to SinapiPriceReference
 */
export function transformComposicaoToReference(
  raw: SinapiComposicaoRaw,
  uf: SinapiUF,
  mesReferencia: string,
  desonerado: boolean,
): SinapiPriceReference {
  const preco = desonerado ? raw.precoDesonerado || 0 : raw.precoOnerado || 0;

  return {
    // GovApiSearchResult fields
    id: `sinapi:${raw.codigo}:${uf}:${mesReferencia}:${desonerado ? 'D' : 'O'}`,
    title: raw.descricao,
    description: raw.descricao,
    source: 'sinapi',
    url: undefined,
    relevance: 1.0,
    fetchedAt: new Date(),
    // GovApiPriceReference fields
    codigo: raw.codigo,
    descricao: raw.descricao,
    unidade: raw.unidade,
    precoUnitario: preco,
    mesReferencia,
    uf,
    desonerado,
    categoria: SinapiCategoria.SERVICOS,
    // SinapiPriceReference specific fields
    tipo: SinapiItemType.COMPOSICAO,
    classeId: undefined,
    classeDescricao: undefined,
    precoOnerado: raw.precoOnerado || 0,
    precoDesonerado: raw.precoDesonerado || 0,
  };
}
