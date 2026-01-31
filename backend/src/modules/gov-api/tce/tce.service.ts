import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  TceState,
  TceExportFormat,
  ITceApiAdapter,
  TceConnectionStatus,
  TceExportRequest,
  TceExportResult,
} from './interfaces/tce-api.interface';
import { AudespAdapter } from './adapters/audesp.adapter';

/**
 * TCE Integration Service
 *
 * Main service for integration with Brazilian State Audit Courts (TCE).
 * Provides unified interface for exporting contract data to different state systems.
 *
 * Supported TCE systems:
 * - Audesp (TCE-SP) - Implemented
 * - LicitaCon (TCE-RS) - Planned
 * - SICAP (TCE-PE) - Planned
 *
 * @module modules/gov-api/tce
 * @see Issue #1293 - [Integração] Conectar com sistemas estaduais TCE
 */
@Injectable()
export class TceService {
  private readonly logger = new Logger(TceService.name);
  private readonly adapters: Map<TceState, ITceApiAdapter>;

  constructor(private readonly audespAdapter: AudespAdapter) {
    // Register available adapters
    this.adapters = new Map();
    this.adapters.set(TceState.SP, audespAdapter);

    this.logger.log('TCE Service initialized', {
      supportedStates: Array.from(this.adapters.keys()),
    });
  }

  /**
   * Get list of supported states
   */
  getSupportedStates(): TceState[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get supported export formats for a state
   */
  getSupportedFormats(state: TceState): TceExportFormat[] {
    const adapter = this.getAdapter(state);
    return adapter.getSupportedFormats();
  }

  /**
   * Check connection status for a specific state TCE
   */
  async checkConnection(state: TceState): Promise<TceConnectionStatus> {
    const adapter = this.getAdapter(state);
    return adapter.checkConnection();
  }

  /**
   * Check connection status for all supported states
   */
  async checkAllConnections(): Promise<TceConnectionStatus[]> {
    const states = this.getSupportedStates();
    const results = await Promise.all(
      states.map((state) => this.checkConnection(state)),
    );
    return results;
  }

  /**
   * Export contracts to TCE format
   */
  async exportContracts(request: TceExportRequest): Promise<TceExportResult> {
    this.logger.log('Exporting contracts to TCE', {
      state: request.state,
      format: request.format,
      contractCount: request.contracts.length,
    });

    const adapter = this.getAdapter(request.state);

    // Validate that the format is supported
    const supportedFormats = adapter.getSupportedFormats();
    if (!supportedFormats.includes(request.format)) {
      throw new BadRequestException(
        `Format ${request.format} is not supported for state ${request.state}. Supported formats: ${supportedFormats.join(', ')}`,
      );
    }

    // Validate contract data
    const validation = await adapter.validateContractData(request.contracts);
    if (!validation.valid) {
      const errorMessages = validation.errors
        .filter((e) => e.severity === 'error')
        .map((e) => e.message);

      this.logger.warn('Contract validation failed', {
        errors: errorMessages,
        warnings: validation.warnings,
      });

      return {
        success: false,
        format: request.format,
        state: request.state,
        exportedAt: new Date(),
        contractCount: request.contracts.length,
        validationErrors: errorMessages,
        message: 'Validation failed. Please fix errors and try again.',
      };
    }

    // Export contracts
    const result = await adapter.exportContracts(request);

    this.logger.log('Contract export completed', {
      success: result.success,
      state: request.state,
      format: request.format,
      contractCount: result.contractCount,
    });

    return result;
  }

  /**
   * Get adapter for a specific state
   */
  private getAdapter(state: TceState): ITceApiAdapter {
    const adapter = this.adapters.get(state);
    if (!adapter) {
      throw new BadRequestException(
        `TCE integration not available for state ${state}. Supported states: ${Array.from(this.adapters.keys()).join(', ')}`,
      );
    }
    return adapter;
  }

  /**
   * Get statistics about TCE integrations
   */
  async getStatistics(): Promise<{
    totalStatesSupported: number;
    statesAvailable: Array<{
      state: TceState;
      system: string;
      formats: TceExportFormat[];
      connected: boolean;
    }>;
  }> {
    const states = this.getSupportedStates();
    const connections = await this.checkAllConnections();

    const statesAvailable = states.map((state) => {
      const adapter = this.adapters.get(state)!;
      const connection = connections.find((c) => c.state === state)!;

      return {
        state,
        system: connection.system,
        formats: adapter.getSupportedFormats(),
        connected: connection.available && connection.authenticated,
      };
    });

    return {
      totalStatesSupported: states.length,
      statesAvailable,
    };
  }
}
