/**
 * Contract Price Collector Service Tests
 *
 * Unit tests for ContractPriceCollectorService
 *
 * @module modules/gov-api/contract-price-collector
 * @see Issue #1269 for M13: Market Intelligence implementation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractPriceCollectorService } from './contract-price-collector.service';
import { PncpService } from '../pncp/pncp.service';
import {
  ContractPrice,
  ContractPriceModalidade,
  ContractPriceFonte,
} from '../../../entities/contract-price.entity';
import {
  GovApiPriceReference,
  GovApiResponse,
} from '../interfaces/gov-api.interface';
import { SearchStatus } from '../types/search-result';

describe('ContractPriceCollectorService', () => {
  let service: ContractPriceCollectorService;
  let pncpService: jest.Mocked<PncpService>;
  let configService: jest.Mocked<ConfigService>;
  let contractPriceRepository: jest.Mocked<Repository<ContractPrice>>;

  const mockPriceReference: GovApiPriceReference = {
    id: 'PNCP-12345-ITEM-1',
    title: 'Papel A4',
    description: 'Papel sulfite A4 branco 75g',
    source: 'pncp',
    relevance: 1.0,
    fetchedAt: new Date('2024-01-15T10:00:00Z'),
    codigo: 'CATMAT-123456',
    descricao: 'Papel sulfite A4 branco 75g - Resma 500 folhas',
    unidade: 'RESMA',
    precoUnitario: 25.5,
    mesReferencia: '2024-01',
    uf: 'DF',
    desonerado: false,
    categoria: 'Material de Escritório',
    metadata: {
      modalidadeId: 6,
      quantidade: 100,
      orgaoNome: 'Ministério da Economia',
      uasgCodigo: '170001',
      municipio: 'Brasília',
      numeroProcesso: '12345/2024',
      fornecedor: {
        cpfCnpj: '12.345.678/0001-90',
        nomeRazaoSocial: 'Papelaria XYZ Ltda',
      },
      marca: 'Report',
      modelo: 'Premium',
      codigoCatmat: '123456',
      dataAssinatura: '2024-01-10',
    },
    url: 'https://pncp.gov.br/app/contratacoes/12345',
  };

  const mockPncpResponse: GovApiResponse<GovApiPriceReference[]> = {
    data: [mockPriceReference],
    total: 1,
    page: 1,
    perPage: 500,
    source: 'pncp',
    cached: false,
    isFallback: false,
    timestamp: new Date(),
    status: SearchStatus.SUCCESS,
    statusMessage: 'Success',
  };

  beforeEach(async () => {
    // Create mocks
    pncpService = {
      searchContratosItens: jest.fn().mockResolvedValue(mockPncpResponse),
      search: jest.fn(),
      searchAtasRegistroPreco: jest.fn(),
      getById: jest.fn(),
      healthCheck: jest.fn(),
      getCircuitState: jest.fn(),
      source: 'pncp',
    } as unknown as jest.Mocked<PncpService>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'CONTRACT_PRICE_COLLECTOR_ENABLED') {
          return 'true';
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    contractPriceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((entity) => entity as ContractPrice),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: 'uuid-123' })),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as jest.Mocked<Repository<ContractPrice>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractPriceCollectorService,
        {
          provide: PncpService,
          useValue: pncpService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: getRepositoryToken(ContractPrice),
          useValue: contractPriceRepository,
        },
      ],
    }).compile();

    service = module.get<ContractPriceCollectorService>(
      ContractPriceCollectorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with idle scheduler status', () => {
      const status = service.getSchedulerStatus();
      expect(status.status).toBe('idle');
      expect(status.enabled).toBe(true);
    });
  });

  describe('collectFromPncp', () => {
    it('should collect prices from PNCP and store them', async () => {
      const result = await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
        uf: 'DF',
      });

      expect(pncpService.searchContratosItens).toHaveBeenCalledWith({
        dataInicial: '20240101',
        dataFinal: '20240131',
        ufOrgao: 'DF',
        apenasAtivos: false,
        pagina: 1,
        tamanhoPagina: 500,
      });

      expect(contractPriceRepository.create).toHaveBeenCalled();
      expect(contractPriceRepository.save).toHaveBeenCalled();

      expect(result.collected).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
    });

    it('should skip duplicate records', async () => {
      // First record exists (duplicate)
      contractPriceRepository.findOne.mockResolvedValueOnce({
        id: 'existing-uuid',
        externalId: mockPriceReference.id,
        fonte: ContractPriceFonte.PNCP,
      } as ContractPrice);

      const result = await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(result.collected).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle empty response', async () => {
      pncpService.searchContratosItens.mockResolvedValueOnce({
        ...mockPncpResponse,
        data: [],
        total: 0,
      });

      const result = await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(result.collected).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle PNCP API error gracefully', async () => {
      pncpService.searchContratosItens.mockRejectedValueOnce(
        new Error('PNCP API timeout'),
      );

      const result = await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(result.collected).toBe(0);
      expect(result.errors).toContain('Collection failed: PNCP API timeout');
    });

    it('should handle save errors for individual records', async () => {
      contractPriceRepository.save.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const result = await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(result.failed).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should use default pagination values', async () => {
      await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(pncpService.searchContratosItens).toHaveBeenCalledWith(
        expect.objectContaining({
          pagina: 1,
          tamanhoPagina: 500,
          apenasAtivos: false,
        }),
      );
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      contractPriceRepository.count.mockResolvedValueOnce(100);

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      // Mock by source
      queryBuilder.getRawMany
        .mockResolvedValueOnce([
          { fonte: 'PNCP', count: '80' },
          { fonte: 'COMPRASGOV', count: '20' },
        ])
        // Mock by UF
        .mockResolvedValueOnce([
          { uf: 'DF', count: '30' },
          { uf: 'SP', count: '25' },
          { uf: 'RJ', count: '20' },
        ])
        // Mock by modalidade
        .mockResolvedValueOnce([
          { modalidade: 'PREGAO_ELETRONICO', count: '60' },
          { modalidade: 'DISPENSA', count: '30' },
          { modalidade: 'OUTROS', count: '10' },
        ]);

      contractPriceRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      contractPriceRepository.findOne
        .mockResolvedValueOnce({
          dataHomologacao: new Date('2023-01-01'),
        } as ContractPrice)
        .mockResolvedValueOnce({
          dataHomologacao: new Date('2024-01-31'),
        } as ContractPrice)
        .mockResolvedValueOnce({
          fetchedAt: new Date('2024-01-15'),
        } as ContractPrice);

      const stats = await service.getCollectionStats();

      expect(stats.totalRecords).toBe(100);
      expect(stats.bySource[ContractPriceFonte.PNCP]).toBe(80);
      expect(stats.bySource[ContractPriceFonte.COMPRASGOV]).toBe(20);
      expect(stats.byUf['DF']).toBe(30);
      expect(stats.byUf['SP']).toBe(25);
      expect(stats.dateRange.oldest).toEqual(new Date('2023-01-01'));
      expect(stats.dateRange.newest).toEqual(new Date('2024-01-31'));
    });

    it('should handle empty database', async () => {
      contractPriceRepository.count.mockResolvedValueOnce(0);

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      contractPriceRepository.createQueryBuilder.mockReturnValue(
        queryBuilder as any,
      );

      contractPriceRepository.findOne.mockResolvedValue(null);

      const stats = await service.getCollectionStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.dateRange.oldest).toBeNull();
      expect(stats.dateRange.newest).toBeNull();
      expect(stats.lastCollection).toBeNull();
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return current scheduler status', () => {
      const status = service.getSchedulerStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('lastRun');
      expect(status).toHaveProperty('nextRun');
      expect(status).toHaveProperty('cronExpression');
      expect(status).toHaveProperty('status');
      expect(status.cronExpression).toBe('0 3 * * 0');
    });
  });

  describe('scheduledCollection', () => {
    it('should skip collection when disabled', async () => {
      configService.get.mockReturnValueOnce('false');

      await service.scheduledCollection();

      expect(pncpService.searchContratosItens).not.toHaveBeenCalled();

      const status = service.getSchedulerStatus();
      expect(status.enabled).toBe(false);
    });

    it('should run collection when enabled', async () => {
      await service.scheduledCollection();

      expect(pncpService.searchContratosItens).toHaveBeenCalled();

      const status = service.getSchedulerStatus();
      expect(status.lastRun).not.toBeNull();
      expect(status.status).toBe('idle');
    });

    it('should handle errors during scheduled collection', async () => {
      // Reset mock and set up rejection
      pncpService.searchContratosItens.mockReset();
      pncpService.searchContratosItens.mockRejectedValueOnce(
        new Error('API Error'),
      );

      await service.scheduledCollection();

      const status = service.getSchedulerStatus();
      expect(status.status).toBe('error');
      expect(status.lastError).toBe('API Error');
    });
  });

  describe('data normalization', () => {
    it('should normalize unit of measurement', async () => {
      const testCases = [
        { input: 'UNIDADE', expected: 'UN' },
        { input: 'QUILOGRAMA', expected: 'KG' },
        { input: 'METRO QUADRADO', expected: 'M2' },
        { input: 'LITRO', expected: 'L' },
        { input: 'RESMA', expected: 'RESMA' },
      ];

      for (const testCase of testCases) {
        const priceRef = {
          ...mockPriceReference,
          id: `test-${testCase.input}`,
          unidade: testCase.input,
        };

        pncpService.searchContratosItens.mockResolvedValueOnce({
          ...mockPncpResponse,
          data: [priceRef],
        });

        contractPriceRepository.findOne.mockResolvedValueOnce(null);

        await service.collectFromPncp({
          dataInicial: '20240101',
          dataFinal: '20240131',
        });

        expect(contractPriceRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            unidade: testCase.expected,
          }),
        );
      }
    });

    it('should map PNCP modalidade to enum', async () => {
      const testCases = [
        {
          modalidadeId: 6,
          expected: ContractPriceModalidade.PREGAO_ELETRONICO,
        },
        { modalidadeId: 8, expected: ContractPriceModalidade.DISPENSA },
        { modalidadeId: 9, expected: ContractPriceModalidade.INEXIGIBILIDADE },
        { modalidadeId: 4, expected: ContractPriceModalidade.CONCORRENCIA },
        { modalidadeId: 999, expected: ContractPriceModalidade.OUTROS },
      ];

      for (const testCase of testCases) {
        const priceRef = {
          ...mockPriceReference,
          id: `test-mod-${testCase.modalidadeId}`,
          metadata: {
            ...mockPriceReference.metadata,
            modalidadeId: testCase.modalidadeId,
          },
        };

        pncpService.searchContratosItens.mockResolvedValueOnce({
          ...mockPncpResponse,
          data: [priceRef],
        });

        contractPriceRepository.findOne.mockResolvedValueOnce(null);

        await service.collectFromPncp({
          dataInicial: '20240101',
          dataFinal: '20240131',
        });

        expect(contractPriceRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            modalidade: testCase.expected,
          }),
        );
      }
    });

    it('should extract CNPJ without formatting', async () => {
      await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(contractPriceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cnpjFornecedor: '12345678000190', // Without dots, slashes, dashes
        }),
      );
    });

    it('should calculate valorTotal from precoUnitario and quantidade', async () => {
      const priceRef = {
        ...mockPriceReference,
        precoUnitario: 10.0,
        metadata: {
          ...mockPriceReference.metadata,
          quantidade: 50,
        },
      };

      pncpService.searchContratosItens.mockResolvedValueOnce({
        ...mockPncpResponse,
        data: [priceRef],
      });

      await service.collectFromPncp({
        dataInicial: '20240101',
        dataFinal: '20240131',
      });

      expect(contractPriceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          precoUnitario: 10.0,
          quantidade: 50,
          valorTotal: 500.0,
        }),
      );
    });
  });
});
