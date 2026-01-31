import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TceService } from '../tce.service';
import { AudespAdapter } from '../adapters/audesp.adapter';
import {
  TceState,
  TceExportFormat,
  TceExportRequest,
} from '../interfaces/tce-api.interface';

describe('TceService', () => {
  let service: TceService;
  let audespAdapter: AudespAdapter;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AUDESP_API_URL: 'https://audesp.tce.sp.gov.br/api',
        AUDESP_API_KEY: 'test-api-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TceService,
        AudespAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TceService>(TceService);
    audespAdapter = module.get<AudespAdapter>(AudespAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSupportedStates', () => {
    it('should return list of supported states', () => {
      const states = service.getSupportedStates();
      expect(states).toContain(TceState.SP);
      expect(states.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return formats for SP', () => {
      const formats = service.getSupportedFormats(TceState.SP);
      expect(formats).toContain(TceExportFormat.AUDESP);
      expect(formats).toContain(TceExportFormat.XML);
    });

    it('should throw for unsupported state', () => {
      expect(() => {
        service.getSupportedFormats('XX' as TceState);
      }).toThrow();
    });
  });

  describe('checkConnection', () => {
    it('should check Audesp connection', async () => {
      const status = await service.checkConnection(TceState.SP);
      expect(status).toHaveProperty('state', TceState.SP);
      expect(status).toHaveProperty('system', 'Audesp');
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('authenticated');
    });
  });

  describe('checkAllConnections', () => {
    it('should check all supported states', async () => {
      const results = await service.checkAllConnections();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('state');
      expect(results[0]).toHaveProperty('available');
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

    it('should export contracts successfully', async () => {
      const result = await service.exportContracts(mockRequest);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('format', TceExportFormat.AUDESP);
      expect(result).toHaveProperty('state', TceState.SP);
      expect(result).toHaveProperty('contractCount', 1);

      if (result.success) {
        expect(result.fileContent).toBeDefined();
        expect(result.fileName).toBeDefined();
      }
    });

    it('should fail for unsupported format', async () => {
      const invalidRequest = {
        ...mockRequest,
        format: 'INVALID_FORMAT' as TceExportFormat,
      };

      await expect(service.exportContracts(invalidRequest)).rejects.toThrow();
    });

    it('should validate contract data', async () => {
      const invalidRequest: TceExportRequest = {
        ...mockRequest,
        contracts: [
          {
            ...mockRequest.contracts[0],
            contractNumber: '', // Invalid: empty
            contractValue: -1000, // Invalid: negative
          },
        ],
      };

      const result = await service.exportContracts(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('should return integration statistics', async () => {
      const stats = await service.getStatistics();
      expect(stats).toHaveProperty('totalStatesSupported');
      expect(stats).toHaveProperty('statesAvailable');
      expect(stats.totalStatesSupported).toBeGreaterThan(0);
      expect(Array.isArray(stats.statesAvailable)).toBe(true);
    });
  });
});
