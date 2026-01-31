/**
 * TCE API Integration Interfaces
 *
 * Defines contracts for integration with Brazilian State Audit Courts (TCE).
 * Each state has its own TCE with different APIs and data formats.
 *
 * Initial implementation targets:
 * - Audesp (TCE-SP): Auditoria Eletrônica de São Paulo
 * - LicitaCon (TCE-RS): Sistema de Licitações e Contratos
 * - SICAP (TCE-PE): Sistema de Acompanhamento de Contratos
 *
 * @module modules/gov-api/tce
 * @see Issue #1293 - [Integração] Conectar com sistemas estaduais TCE
 */

/**
 * TCE State identifiers
 */
export enum TceState {
  SP = 'SP', // São Paulo - Audesp
  RS = 'RS', // Rio Grande do Sul - LicitaCon
  PE = 'PE', // Pernambuco - SICAP
  MG = 'MG', // Minas Gerais
  RJ = 'RJ', // Rio de Janeiro
  BA = 'BA', // Bahia
  PR = 'PR', // Paraná
  SC = 'SC', // Santa Catarina
  // Add more states as needed
}

/**
 * TCE Export formats
 */
export enum TceExportFormat {
  AUDESP = 'AUDESP', // TCE-SP format
  LICITACON = 'LICITACON', // TCE-RS format
  SICAP = 'SICAP', // TCE-PE format
  XML = 'XML', // Generic XML
  JSON = 'JSON', // Generic JSON
  CSV = 'CSV', // Generic CSV
}

/**
 * Contract data for TCE export
 */
export interface TceContractData {
  // Basic contract info
  contractNumber: string;
  contractDate: Date;
  organizationCnpj: string;
  organizationName: string;
  supplierCnpj: string;
  supplierName: string;
  contractValue: number;
  contractObject: string;

  // Bidding process info
  biddingProcessNumber?: string;
  biddingModality?: string;
  biddingDate?: Date;

  // Execution info
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';

  // Payment info
  payments?: TcePaymentData[];

  // Additional metadata
  legalBasis?: string;
  notes?: string;
}

/**
 * Payment data for TCE export
 */
export interface TcePaymentData {
  paymentDate: Date;
  paymentValue: number;
  description: string;
  invoiceNumber?: string;
  fiscalDocument?: string;
}

/**
 * TCE export request
 */
export interface TceExportRequest {
  state: TceState;
  format: TceExportFormat;
  contracts: TceContractData[];
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  organizationInfo: {
    cnpj: string;
    name: string;
    city: string;
    state: TceState;
  };
}

/**
 * TCE export result
 */
export interface TceExportResult {
  success: boolean;
  format: TceExportFormat;
  state: TceState;
  exportedAt: Date;
  contractCount: number;
  fileContent?: string; // Base64 encoded or raw content
  fileName?: string;
  validationErrors?: string[];
  submissionId?: string; // ID returned by TCE system
  submissionStatus?: 'pending' | 'accepted' | 'rejected';
  message?: string;
}

/**
 * TCE API connection status
 */
export interface TceConnectionStatus {
  state: TceState;
  system: string; // e.g., "Audesp", "LicitaCon", "SICAP"
  available: boolean;
  lastChecked: Date;
  version?: string;
  endpoint?: string;
  authenticated: boolean;
  error?: string;
}

/**
 * TCE Validation result
 */
export interface TceValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}

/**
 * Base interface for TCE API adapters
 */
export interface ITceApiAdapter {
  /**
   * Get the state this adapter handles
   */
  getState(): TceState;

  /**
   * Get supported export formats
   */
  getSupportedFormats(): TceExportFormat[];

  /**
   * Check connection status with TCE system
   */
  checkConnection(): Promise<TceConnectionStatus>;

  /**
   * Validate contract data before export
   */
  validateContractData(data: TceContractData[]): Promise<TceValidationResult>;

  /**
   * Export contracts to TCE format
   */
  exportContracts(request: TceExportRequest): Promise<TceExportResult>;

  /**
   * Submit exported data to TCE system (if API available)
   */
  submitToTce?(exportResult: TceExportResult): Promise<{
    success: boolean;
    submissionId?: string;
    message?: string;
  }>;

  /**
   * Get submission status (if API available)
   */
  getSubmissionStatus?(submissionId: string): Promise<{
    status: 'pending' | 'accepted' | 'rejected';
    message?: string;
    processedAt?: Date;
  }>;
}
