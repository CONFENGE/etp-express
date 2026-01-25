/**
 * Edital Extracted Data DTOs
 *
 * Data Transfer Objects for structured data extracted from public bidding documents (editais).
 *
 * This module defines the structure of data extracted from different types of
 * editais using PageIndex tree search. The extraction process uses LLM reasoning
 * to navigate document structure and extract relevant information.
 *
 * @module modules/pageindex/dto/edital-extracted-data
 * @see Issue #1695 - [INTEL-1545b] Implementar EditalExtractionService
 */

/**
 * Type of edital (bidding document)
 */
export enum EditalTipo {
  PREGAO = 'PREGAO',
  CONCORRENCIA = 'CONCORRENCIA',
  DISPENSA = 'DISPENSA',
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Item extracted from a lot
 */
export interface EditalItem {
  /** Item code (CATMAT/CATSER or internal code) */
  codigo: string;
  /** Item description */
  descricao: string;
  /** Quantity */
  quantidade: number;
  /** Unit of measurement */
  unidade: string;
  /** Unit price (if available) */
  precoUnitario?: number;
  /** Total price (if available) */
  precoTotal?: number;
}

/**
 * Lot (lote) extracted from edital
 */
export interface EditalLote {
  /** Lot number */
  numero: number;
  /** Lot description */
  descricao: string;
  /** Items in this lot */
  itens: EditalItem[];
}

/**
 * Structured data extracted from an edital document
 */
export interface EditalExtractedData {
  /** Type of edital */
  tipo: EditalTipo;
  /** Object/purpose of the bidding */
  objeto: string;
  /** Lots with items */
  lotes: EditalLote[];
  /** Total value (if available) */
  valorTotal?: number;
  /** Execution deadline in days (if available) */
  prazoExecucao?: number;
  /** Bidding number/process ID (if available) */
  numeroProcesso?: string;
  /** UASG code (if available) */
  codigoUasg?: string;
  /** UASG name (if available) */
  nomeUasg?: string;
  /** Opening date (if available) */
  dataAbertura?: string;
  /** Homologation date (if available) */
  dataHomologacao?: string;
}

/**
 * Extraction result with confidence and validation
 */
export interface EditalExtractionResult {
  /** Extracted structured data */
  data: EditalExtractedData;
  /** Confidence score (0-100) */
  confidence: number;
  /** Validation status */
  isValid: boolean;
  /** Validation errors (if any) */
  errors: string[];
  /** Flag for manual review if confidence < 80 */
  requiresManualReview: boolean;
  /** Extraction reasoning from LLM */
  reasoning: string;
  /** Extraction time in milliseconds */
  extractionTimeMs: number;
}

/**
 * Validation result for extracted data
 */
export interface EditalValidationResult {
  /** Is the data complete and valid? */
  isValid: boolean;
  /** Confidence score (0-100) */
  confidence: number;
  /** Validation errors */
  errors: string[];
  /** Flag for manual review */
  requiresManualReview: boolean;
}
