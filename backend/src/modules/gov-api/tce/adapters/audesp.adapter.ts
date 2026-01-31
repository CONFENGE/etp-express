import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITceApiAdapter,
  TceState,
  TceExportFormat,
  TceConnectionStatus,
  TceValidationResult,
  TceExportRequest,
  TceExportResult,
  TceContractData,
} from '../interfaces/tce-api.interface';

/**
 * Audesp (TCE-SP) API Adapter
 *
 * Implements integration with Audesp - Auditoria Eletrônica de São Paulo.
 * Audesp is the electronic accountability system for São Paulo state.
 *
 * Current implementation: Export file generation (no direct API submission yet)
 * Future: Direct API submission when Audesp API credentials are available
 *
 * @see Issue #1293 - [Integração] Conectar com sistemas estaduais TCE
 * @see https://www.tce.sp.gov.br/audesp
 */
@Injectable()
export class AudespAdapter implements ITceApiAdapter {
  private readonly logger = new Logger(AudespAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the state this adapter handles
   */
  getState(): TceState {
    return TceState.SP;
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): TceExportFormat[] {
    return [TceExportFormat.AUDESP, TceExportFormat.XML, TceExportFormat.CSV];
  }

  /**
   * Check connection status with Audesp system
   *
   * Note: Currently returns mock status as direct API integration
   * is not yet implemented. Update when API credentials are available.
   */
  async checkConnection(): Promise<TceConnectionStatus> {
    this.logger.log('Checking Audesp connection status');

    const apiUrl = this.configService.get<string>('AUDESP_API_URL');
    const apiKey = this.configService.get<string>('AUDESP_API_KEY');

    // If credentials are not configured, return offline status
    if (!apiUrl || !apiKey) {
      return {
        state: TceState.SP,
        system: 'Audesp',
        available: false,
        lastChecked: new Date(),
        authenticated: false,
        error: 'API credentials not configured',
      };
    }

    try {
      // TODO: Implement actual API health check when endpoint is available
      // For now, return success if credentials are present
      return {
        state: TceState.SP,
        system: 'Audesp',
        available: true,
        lastChecked: new Date(),
        authenticated: true,
        endpoint: apiUrl,
        version: '1.0',
      };
    } catch (error) {
      this.logger.error('Failed to check Audesp connection', error);
      return {
        state: TceState.SP,
        system: 'Audesp',
        available: false,
        lastChecked: new Date(),
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate contract data before export
   *
   * Applies Audesp-specific validation rules:
   * - Required fields present
   * - CNPJ format valid
   * - Dates in logical order
   * - Values positive
   */
  async validateContractData(
    data: TceContractData[],
  ): Promise<TceValidationResult> {
    const errors: Array<{
      field: string;
      message: string;
      severity: 'error' | 'warning';
    }> = [];
    const warnings: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const contract = data[i];
      const prefix = `Contract ${i + 1} (${contract.contractNumber})`;

      // Required field validation
      if (!contract.contractNumber) {
        errors.push({
          field: `contracts[${i}].contractNumber`,
          message: `${prefix}: Contract number is required`,
          severity: 'error',
        });
      }

      if (!contract.organizationCnpj) {
        errors.push({
          field: `contracts[${i}].organizationCnpj`,
          message: `${prefix}: Organization CNPJ is required`,
          severity: 'error',
        });
      } else if (!this.isValidCnpj(contract.organizationCnpj)) {
        errors.push({
          field: `contracts[${i}].organizationCnpj`,
          message: `${prefix}: Invalid CNPJ format`,
          severity: 'error',
        });
      }

      if (!contract.supplierCnpj) {
        errors.push({
          field: `contracts[${i}].supplierCnpj`,
          message: `${prefix}: Supplier CNPJ/CPF is required`,
          severity: 'error',
        });
      }

      if (!contract.contractValue || contract.contractValue <= 0) {
        errors.push({
          field: `contracts[${i}].contractValue`,
          message: `${prefix}: Contract value must be positive`,
          severity: 'error',
        });
      }

      if (!contract.contractObject || contract.contractObject.trim() === '') {
        errors.push({
          field: `contracts[${i}].contractObject`,
          message: `${prefix}: Contract object description is required`,
          severity: 'error',
        });
      }

      // Date validation
      if (contract.startDate && contract.endDate) {
        if (contract.endDate < contract.startDate) {
          errors.push({
            field: `contracts[${i}].endDate`,
            message: `${prefix}: End date cannot be before start date`,
            severity: 'error',
          });
        }
      }

      if (contract.biddingDate && contract.contractDate) {
        if (contract.contractDate < contract.biddingDate) {
          warnings.push(
            `${prefix}: Contract date is before bidding date - verify`,
          );
        }
      }

      // Warning if no bidding info
      if (!contract.biddingProcessNumber) {
        warnings.push(`${prefix}: No bidding process number provided`);
      }

      // Payment validation
      if (contract.payments && contract.payments.length > 0) {
        const totalPaid = contract.payments.reduce(
          (sum, p) => sum + p.paymentValue,
          0,
        );
        if (totalPaid > contract.contractValue * 1.1) {
          // Allow 10% tolerance
          errors.push({
            field: `contracts[${i}].payments`,
            message: `${prefix}: Total payments (${totalPaid}) exceed contract value (${contract.contractValue})`,
            severity: 'warning',
          });
        }
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export contracts to Audesp format
   *
   * Generates Audesp-compatible export file (XML format).
   * Currently generates file content only - submission requires API credentials.
   */
  async exportContracts(
    request: TceExportRequest,
  ): Promise<TceExportResult> {
    this.logger.log('Exporting contracts to Audesp format', {
      contractCount: request.contracts.length,
      format: request.format,
    });

    // Validate data first
    const validation = await this.validateContractData(request.contracts);
    if (!validation.valid) {
      return {
        success: false,
        format: request.format,
        state: TceState.SP,
        exportedAt: new Date(),
        contractCount: request.contracts.length,
        validationErrors: validation.errors.map(
          (e) => `${e.field}: ${e.message}`,
        ),
        message: 'Validation failed',
      };
    }

    try {
      let fileContent: string;
      let fileName: string;

      switch (request.format) {
        case TceExportFormat.AUDESP:
        case TceExportFormat.XML:
          fileContent = this.generateAudespXml(request);
          fileName = `audesp_export_${this.formatDateForFilename(new Date())}.xml`;
          break;
        case TceExportFormat.CSV:
          fileContent = this.generateAudespCsv(request);
          fileName = `audesp_export_${this.formatDateForFilename(new Date())}.csv`;
          break;
        default:
          throw new Error(`Unsupported format: ${request.format}`);
      }

      return {
        success: true,
        format: request.format,
        state: TceState.SP,
        exportedAt: new Date(),
        contractCount: request.contracts.length,
        fileContent: Buffer.from(fileContent, 'utf-8').toString('base64'),
        fileName,
        validationErrors: validation.warnings,
        message: 'Export successful. File ready for manual upload to Audesp.',
      };
    } catch (error) {
      this.logger.error('Failed to export contracts to Audesp', error);
      return {
        success: false,
        format: request.format,
        state: TceState.SP,
        exportedAt: new Date(),
        contractCount: request.contracts.length,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate Audesp XML format
   */
  private generateAudespXml(request: TceExportRequest): string {
    const { organizationInfo, reportingPeriod, contracts } = request;

    const contractsXml = contracts
      .map(
        (c, idx) => `
    <Contrato id="${idx + 1}">
      <NumeroContrato>${this.escapeXml(c.contractNumber)}</NumeroContrato>
      <DataContrato>${this.formatDate(c.contractDate)}</DataContrato>
      <OrgaoContratante>
        <CNPJ>${this.escapeXml(c.organizationCnpj)}</CNPJ>
        <Nome>${this.escapeXml(c.organizationName)}</Nome>
      </OrgaoContratante>
      <Fornecedor>
        <CNPJ>${this.escapeXml(c.supplierCnpj)}</CNPJ>
        <Nome>${this.escapeXml(c.supplierName)}</Nome>
      </Fornecedor>
      <Valor>${c.contractValue.toFixed(2)}</Valor>
      <Objeto>${this.escapeXml(c.contractObject)}</Objeto>
      <Status>${c.status}</Status>
      ${c.biddingProcessNumber ? `<ProcessoLicitatorio>${this.escapeXml(c.biddingProcessNumber)}</ProcessoLicitatorio>` : ''}
      ${c.biddingModality ? `<Modalidade>${this.escapeXml(c.biddingModality)}</Modalidade>` : ''}
      ${c.startDate ? `<DataInicio>${this.formatDate(c.startDate)}</DataInicio>` : ''}
      ${c.endDate ? `<DataTermino>${this.formatDate(c.endDate)}</DataTermino>` : ''}
      ${c.legalBasis ? `<FundamentoLegal>${this.escapeXml(c.legalBasis)}</FundamentoLegal>` : ''}
      ${
        c.payments && c.payments.length > 0
          ? `
      <Pagamentos>
        ${c.payments.map((p) => `<Pagamento><Data>${this.formatDate(p.paymentDate)}</Data><Valor>${p.paymentValue.toFixed(2)}</Valor><Descricao>${this.escapeXml(p.description)}</Descricao></Pagamento>`).join('')}
      </Pagamentos>`
          : ''
      }
    </Contrato>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Audesp versao="1.0">
  <Cabecalho>
    <Orgao>
      <CNPJ>${this.escapeXml(organizationInfo.cnpj)}</CNPJ>
      <Nome>${this.escapeXml(organizationInfo.name)}</Nome>
      <Municipio>${this.escapeXml(organizationInfo.city)}</Municipio>
      <UF>${this.escapeXml(organizationInfo.state)}</UF>
    </Orgao>
    <PeriodoReferencia>
      <DataInicio>${this.formatDate(reportingPeriod.startDate)}</DataInicio>
      <DataFim>${this.formatDate(reportingPeriod.endDate)}</DataFim>
    </PeriodoReferencia>
    <DataGeracao>${this.formatDate(new Date())}</DataGeracao>
  </Cabecalho>
  <Contratos total="${contracts.length}">${contractsXml}
  </Contratos>
</Audesp>`;
  }

  /**
   * Generate Audesp CSV format
   */
  private generateAudespCsv(request: TceExportRequest): string {
    const headers = [
      'Numero_Contrato',
      'Data_Contrato',
      'CNPJ_Orgao',
      'Nome_Orgao',
      'CNPJ_Fornecedor',
      'Nome_Fornecedor',
      'Valor_Contrato',
      'Objeto',
      'Status',
      'Processo_Licitatorio',
      'Modalidade',
      'Data_Inicio',
      'Data_Termino',
      'Fundamento_Legal',
    ].join(';');

    const rows = request.contracts.map((c) => {
      return [
        c.contractNumber,
        this.formatDate(c.contractDate),
        c.organizationCnpj,
        c.organizationName,
        c.supplierCnpj,
        c.supplierName,
        c.contractValue.toFixed(2),
        this.escapeCsv(c.contractObject),
        c.status,
        c.biddingProcessNumber || '',
        c.biddingModality || '',
        c.startDate ? this.formatDate(c.startDate) : '',
        c.endDate ? this.formatDate(c.endDate) : '',
        c.legalBasis || '',
      ].join(';');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Validate CNPJ format (basic check)
   */
  private isValidCnpj(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date for filename (YYYYMMDD_HHMMSS)
   */
  private formatDateForFilename(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape CSV special characters
   */
  private escapeCsv(text: string): string {
    if (text.includes(';') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}
