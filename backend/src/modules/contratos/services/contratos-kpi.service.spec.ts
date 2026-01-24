import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContratosKpiService } from './contratos-kpi.service';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';

describe('ContratosKpiService', () => {
  let service: ContratosKpiService;
  let contratoRepository: Repository<Contrato>;
  let medicaoRepository: Repository<Medicao>;

  const mockContratoRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMedicaoRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockOrganizationId = 'org-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosKpiService,
        {
          provide: getRepositoryToken(Contrato),
          useValue: mockContratoRepository,
        },
        {
          provide: getRepositoryToken(Medicao),
          useValue: mockMedicaoRepository,
        },
      ],
    }).compile();

    service = module.get<ContratosKpiService>(ContratosKpiService);
    contratoRepository = module.get<Repository<Contrato>>(
      getRepositoryToken(Contrato),
    );
    medicaoRepository = module.get<Repository<Medicao>>(
      getRepositoryToken(Medicao),
    );

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    it('should return correct KPIs with all data', async () => {
      // Mock total contracts count
      mockContratoRepository.count.mockResolvedValue(42);

      // Mock total value query
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '1234567.89' }),
        getCount: jest.fn().mockResolvedValue(7),
      };

      mockContratoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Mock expiring contracts count (second call to createQueryBuilder)
      mockContratoRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder) // total value
        .mockReturnValueOnce(mockQueryBuilder); // expiring contracts

      // Mock pending measurements
      const mockMedicaoQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(12),
      };

      mockMedicaoRepository.createQueryBuilder.mockReturnValue(
        mockMedicaoQueryBuilder,
      );

      const result = await service.getKpis(mockOrganizationId);

      expect(result).toEqual({
        totalContracts: 42,
        totalValue: 1234567.89,
        expiringIn30Days: 7,
        pendingMeasurements: 12,
      });

      expect(mockContratoRepository.count).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          status: [
            ContratoStatus.ASSINADO,
            ContratoStatus.EM_EXECUCAO,
            ContratoStatus.ADITIVADO,
            ContratoStatus.SUSPENSO,
          ],
        },
      });
    });

    it('should handle zero contracts', async () => {
      mockContratoRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockContratoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const mockMedicaoQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockMedicaoRepository.createQueryBuilder.mockReturnValue(
        mockMedicaoQueryBuilder,
      );

      const result = await service.getKpis(mockOrganizationId);

      expect(result).toEqual({
        totalContracts: 0,
        totalValue: 0,
        expiringIn30Days: 0,
        pendingMeasurements: 0,
      });
    });

    it('should filter by organizationId for multi-tenancy', async () => {
      mockContratoRepository.count.mockResolvedValue(5);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
        getCount: jest.fn().mockResolvedValue(2),
      };

      mockContratoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const mockMedicaoQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };

      mockMedicaoRepository.createQueryBuilder.mockReturnValue(
        mockMedicaoQueryBuilder,
      );

      await service.getKpis('different-org-456');

      // Verify organizationId is used in count query
      expect(mockContratoRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'different-org-456',
          }),
        }),
      );

      // Verify organizationId is used in total value query
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'contrato.organizationId = :organizationId',
        { organizationId: 'different-org-456' },
      );

      // Verify organizationId is used in medições query
      expect(mockMedicaoQueryBuilder.where).toHaveBeenCalledWith(
        'contrato.organizationId = :organizationId',
        { organizationId: 'different-org-456' },
      );
    });

    it('should parse total value correctly when null', async () => {
      mockContratoRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockContratoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const mockMedicaoQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockMedicaoRepository.createQueryBuilder.mockReturnValue(
        mockMedicaoQueryBuilder,
      );

      const result = await service.getKpis(mockOrganizationId);

      expect(result.totalValue).toBe(0);
    });
  });
});
