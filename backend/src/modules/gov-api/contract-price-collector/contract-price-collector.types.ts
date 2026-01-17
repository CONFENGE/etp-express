/**
 * Contract Price Collector Types
 *
 * Type definitions for the Contract Price Collector service.
 *
 * @module modules/gov-api/contract-price-collector/types
 * @see Issue #1269 for M13: Market Intelligence implementation
 */

import {
  ContractPriceModalidade,
  ContractPriceFonte,
} from '../../../entities/contract-price.entity';

/**
 * Filters for collecting contract prices
 */
export interface CollectorFilters {
  /** Start date for collection period (YYYYMMDD format) */
  dataInicial: string;
  /** End date for collection period (YYYYMMDD format) */
  dataFinal: string;
  /** Filter by Brazilian state (2-letter code) */
  uf?: string;
  /** Filter only active contracts */
  apenasAtivos?: boolean;
  /** Page number (1-indexed) */
  pagina?: number;
  /** Page size (max 500) */
  tamanhoPagina?: number;
}

/**
 * Result of a collection operation
 */
export interface CollectionResult {
  /** Number of new records collected */
  collected: number;
  /** Number of records skipped (duplicates) */
  skipped: number;
  /** Number of records failed to process */
  failed: number;
  /** Total records processed */
  total: number;
  /** Collection duration in milliseconds */
  durationMs: number;
  /** Timestamp of collection */
  timestamp: Date;
  /** Errors encountered (if any) */
  errors?: string[];
}

/**
 * Statistics about the collected data
 */
export interface CollectionStats {
  /** Total records in database */
  totalRecords: number;
  /** Records by source (PNCP, COMPRASGOV) */
  bySource: Record<ContractPriceFonte, number>;
  /** Records by UF */
  byUf: Record<string, number>;
  /** Records by modalidade */
  byModalidade: Record<ContractPriceModalidade, number>;
  /** Date range of collected data */
  dateRange: {
    oldest: Date | null;
    newest: Date | null;
  };
  /** Last collection timestamp */
  lastCollection: Date | null;
}

/**
 * Normalized price data ready for storage
 */
export interface NormalizedPriceData {
  codigoItem: string;
  descricao: string;
  unidade: string;
  precoUnitario: number;
  quantidade: number;
  valorTotal: number;
  dataHomologacao: Date;
  modalidade: ContractPriceModalidade;
  fonte: ContractPriceFonte;
  externalId: string;
  uasgCodigo: string | null;
  uasgNome: string;
  uf: string;
  municipio: string | null;
  cnpjFornecedor: string | null;
  razaoSocial: string | null;
  numeroProcesso: string | null;
  urlOrigem: string | null;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
}

/**
 * Scheduler job status
 */
export interface SchedulerStatus {
  /** Is the scheduler enabled */
  enabled: boolean;
  /** Last run timestamp */
  lastRun: Date | null;
  /** Next scheduled run */
  nextRun: Date | null;
  /** Cron expression */
  cronExpression: string;
  /** Current status */
  status: 'idle' | 'running' | 'error';
  /** Last error message (if any) */
  lastError?: string;
}
