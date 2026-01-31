import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AudespAdapter } from '../adapters/audesp.adapter';
import {
  TceState,
  TceExportFormat,
  TceContractData,
  TceExportRequest,
} from '../interfaces/tce-api.interface';

describe('AudespAdapter', () => {
  let adapter: AudespAdapter;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | undefined> = {
        AUDESP_API_URL: 'https://audesp.tce.sp.gov.br/api',
        AUDESP_API_KEY: 'test-api-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudespAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    adapter = module.get<AudespAdapter>(AudespAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getState', () => {
    it('should return SP', () => {
      expect(adapter.getState()).toBe(TceState.SP);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const formats = adapter.getSupportedFormats();
      expect(formats).toContain(TceExportFormat.AUDESP);
      expect(formats).toContain(TceExportFormat.XML);
      expect(formats).toContain(TceExportFormat.CSV);
    });
  });

  describe('checkConnection', () => {
    it('should return connection status', async () => {
      const status = await adapter.checkConnection();
      expect(status.state).toBe(TceState.SP);
      expect(status.system).toBe('Audesp');
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('authenticated');
    });

    it('should return offline when credentials missing', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValueOnce(undefined);
      (mockConfigService.get as jest.Mock).mockReturnValueOnce(undefined);
      const status = await adapter.checkConnection();
      expect(status.available).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe('validateContractData', () => {
    const validContract: TceContractData = {
      contractNumber: 'CONT-2024-001',
      contractDate: new Date('2024-01-01'),
      organizationCnpj: '12345678000199',
      organizationName: 'Prefeitura Municipal',
      supplierCnpj: '98765432000188',
      supplierName: 'Fornecedor Ltda',
      contractValue: 100000,
      contractObject: 'Aquisição de equipamentos',
      status: 'active',
    };

    it('should validate correct data', async () => {
      const result = await adapter.validateContractData([validContract]);
      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(
        0,
      );
    });

    it('should detect missing required fields', async () => {
      const invalid: TceContractData = {
        ...validContract,
        contractNumber: '',
        organizationCnpj: '',
      };

      const result = await adapter.validateContractData([invalid]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid CNPJ', async () => {
      const invalid: TceContractData = {
        ...validContract,
        organizationCnpj: '123', // Too short
      };

      const result = await adapter.validateContractData([invalid]);
      expect(result.valid).toBe(false);
      const cnpjError = result.errors.find((e) => e.message.includes('CNPJ'));
      expect(cnpjError).toBeDefined();
    });

    it('should detect invalid contract value', async () => {
      const invalid: TceContractData = {
        ...validContract,
        contractValue: -1000,
      };

      const result = await adapter.validateContractData([invalid]);
      expect(result.valid).toBe(false);
      const valueError = result.errors.find((e) => e.message.includes('value'));
      expect(valueError).toBeDefined();
    });

    it('should detect invalid date range', async () => {
      const invalid: TceContractData = {
        ...validContract,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      const result = await adapter.validateContractData([invalid]);
      expect(result.valid).toBe(false);
      const dateError = result.errors.find((e) =>
        e.message.includes('End date'),
      );
      expect(dateError).toBeDefined();
    });

    it('should warn about excessive payments', async () => {
      const invalid: TceContractData = {
        ...validContract,
        contractValue: 100000,
        payments: [
          {
            paymentDate: new Date('2024-02-01'),
            paymentValue: 120000, // Exceeds contract value
            description: 'Pagamento',
          },
        ],
      };

      const result = await adapter.validateContractData([invalid]);
      expect(result.warnings.length + result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportContracts', () => {
    const mockRequest: TceExportRequest = {
      state: TceState.SP,
      format: TceExportFormat.AUDESP,
      contracts: [
        {
          contractNumber: 'CONT-2024-001',
          contractDate: new Date('2024-01-01'),
          organizationCnpj: '12345678000199',
          organizationName: 'Prefeitura Municipal',
          supplierCnpj: '98765432000188',
          supplierName: 'Fornecedor Ltda',
          contractValue: 100000,
          contractObject: 'Aquisição de equipamentos',
          status: 'active',
          biddingProcessNumber: 'PP-2023-123',
        },
      ],
      reportingPeriod: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
      organizationInfo: {
        cnpj: '12345678000199',
        name: 'Prefeitura Municipal',
        city: 'São Paulo',
        state: TceState.SP,
      },
    };

    it('should export XML format', async () => {
      const result = await adapter.exportContracts({
        ...mockRequest,
        format: TceExportFormat.XML,
      });

      expect(result.success).toBe(true);
      expect(result.fileContent).toBeDefined();
      expect(result.fileName).toContain('.xml');

      // Decode and check XML content
      const xml = Buffer.from(result.fileContent!, 'base64').toString('utf-8');
      expect(xml).toContain('<?xml');
      expect(xml).toContain('<Audesp');
      expect(xml).toContain('CONT-2024-001');
    });

    it('should export CSV format', async () => {
      const result = await adapter.exportContracts({
        ...mockRequest,
        format: TceExportFormat.CSV,
      });

      expect(result.success).toBe(true);
      expect(result.fileContent).toBeDefined();
      expect(result.fileName).toContain('.csv');

      // Decode and check CSV content
      const csv = Buffer.from(result.fileContent!, 'base64').toString('utf-8');
      expect(csv).toContain('Numero_Contrato');
      expect(csv).toContain('CONT-2024-001');
    });

    it('should fail for invalid data', async () => {
      const invalidRequest: TceExportRequest = {
        ...mockRequest,
        contracts: [
          {
            ...mockRequest.contracts[0],
            contractNumber: '',
          },
        ],
      };

      const result = await adapter.exportContracts(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
    });
  });
});
