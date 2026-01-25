import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContratosGovBrSyncService } from './contratos-govbr-sync.service';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { ContratosGovBrAuthService } from '../../gov-api/services/contratos-govbr-auth.service';
import { User } from '../../../entities/user.entity';

describe('ContratosGovBrSyncService', () => {
  let service: ContratosGovBrSyncService;
  let repository: Repository<Contrato>;
  let authService: ContratosGovBrAuthService;
  let httpService: HttpService;

  const mockRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthService = {
    getAuthHeaders: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CONTRATOS_GOVBR_API_URL') {
        return 'https://contratos.comprasnet.gov.br/api/v1';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosGovBrSyncService,
        {
          provide: getRepositoryToken(Contrato),
          useValue: mockRepository,
        },
        {
          provide: ContratosGovBrAuthService,
          useValue: mockAuthService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ContratosGovBrSyncService>(
      ContratosGovBrSyncService,
    );
    repository = module.get<Repository<Contrato>>(
      getRepositoryToken(Contrato),
    );
    authService = module.get<ContratosGovBrAuthService>(
      ContratosGovBrAuthService,
    );
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pushContrato', () => {
    const mockGestor: Partial<User> = {
      id: 'gestor-id',
      cargo: 'Gestor de Contratos - CPF: 123.456.789-00',
      name: 'Gestor Test',
    };

    const mockFiscal: Partial<User> = {
      id: 'fiscal-id',
      cargo: 'Fiscal de Contratos - CPF: 987.654.321-00',
      name: 'Fiscal Test',
    };

    const mockContrato: Partial<Contrato> = {
      id: 'contrato-123',
      numero: '001/2024-CONTRATO',
      numeroProcesso: '12345.678910/2024-11',
      objeto: 'Contratação de serviços de TI',
      descricaoObjeto: 'Desenvolvimento de sistema',
      contratadoCnpj: '12.345.678/0001-90',
      contratadoRazaoSocial: 'Empresa LTDA',
      contratadoNomeFantasia: 'Empresa',
      contratadoEndereco: 'Rua Teste, 123',
      contratadoTelefone: '(11) 1234-5678',
      contratadoEmail: 'contato@empresa.com',
      valorGlobal: '100000.00',
      valorUnitario: '1000.00',
      unidadeMedida: 'unidade',
      quantidadeContratada: '100',
      vigenciaInicio: new Date('2024-01-01'),
      vigenciaFim: new Date('2024-12-31'),
      prazoExecucao: 365,
      possibilidadeProrrogacao: 'Sim, conforme cláusula X',
      gestorResponsavelId: 'gestor-id',
      gestorResponsavel: mockGestor as User,
      fiscalResponsavelId: 'fiscal-id',
      fiscalResponsavel: mockFiscal as User,
      dotacaoOrcamentaria: '02.031.0001.2001.339039',
      fonteRecursos: 'Tesouro',
      condicoesPagamento: '30 dias após ateste',
      garantiaContratual: 'Seguro-garantia 5%',
      reajusteContratual: 'IPCA anual',
      sancoesAdministrativas: 'Multa 10% sobre valor',
      fundamentacaoLegal: 'Lei 14.133/2021 Art. 75',
      localEntrega: 'Sede do órgão',
      clausulas: {},
      status: ContratoStatus.ASSINADO,
      dataAssinatura: new Date('2024-01-01'),
      dataPublicacao: new Date('2024-01-02'),
      referenciaPublicacao: 'DOU 02/01/2024',
      versao: 1,
      motivoRescisao: null,
      dataRescisao: null,
      govBrId: null,
      govBrSyncedAt: null,
      govBrSyncStatus: 'pending',
      govBrSyncErrorMessage: null,
    };

    it('should push contrato successfully and update local record', async () => {
      const govBrId = 'gov-br-123';
      const mockAuthHeaders = { Authorization: 'Bearer token123' };
      const mockApiResponse = {
        data: {
          id: govBrId,
          numero_contrato: mockContrato.numero,
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockRepository.findOne.mockResolvedValue(mockContrato);
      mockAuthService.getAuthHeaders.mockResolvedValue(mockAuthHeaders);
      mockHttpService.post.mockReturnValue(of(mockApiResponse));
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.pushContrato('contrato-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'contrato-123' },
        relations: ['gestorResponsavel', 'fiscalResponsavel'],
      });

      expect(mockAuthService.getAuthHeaders).toHaveBeenCalled();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://contratos.comprasnet.gov.br/api/v1/contratos',
        expect.objectContaining({
          numero_contrato: '001/2024-CONTRATO',
          objeto_contrato: 'Contratação de serviços de TI',
          valor_global: 100000.0,
          cpf_gestor: '123.456.789-00',
          cpf_fiscal: '987.654.321-00',
          status_contrato: 2, // ASSINADO
        }),
        { headers: mockAuthHeaders },
      );

      expect(mockRepository.update).toHaveBeenCalledWith('contrato-123', {
        govBrId,
        govBrSyncedAt: expect.any(Date),
        govBrSyncStatus: 'synced',
        govBrSyncErrorMessage: null,
      });
    });

    it('should throw NotFoundException when contrato does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.pushContrato('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
        relations: ['gestorResponsavel', 'fiscalResponsavel'],
      });

      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      const invalidContrato = { ...mockContrato };
      delete invalidContrato.numero; // Remove campo obrigatório

      mockRepository.findOne.mockResolvedValue(invalidContrato);

      await expect(service.pushContrato('contrato-123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when gestor cpf is missing', async () => {
      const invalidContrato = {
        ...mockContrato,
        gestorResponsavel: { ...mockGestor, cargo: 'Gestor sem CPF' } as User,
      };

      mockRepository.findOne.mockResolvedValue(invalidContrato);

      await expect(service.pushContrato('contrato-123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should update status to error when API request fails', async () => {
      const mockError = new Error('API Error');
      mockRepository.findOne.mockResolvedValue(mockContrato);
      mockAuthService.getAuthHeaders.mockResolvedValue({
        Authorization: 'Bearer token',
      });
      mockHttpService.post.mockReturnValue(throwError(() => mockError));
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.pushContrato('contrato-123')).rejects.toThrow(
        'Failed to sync contrato to Gov.br: API Error',
      );

      expect(mockRepository.update).toHaveBeenCalledWith('contrato-123', {
        govBrSyncStatus: 'error',
        govBrSyncErrorMessage: 'API Error',
      });
    });

    it('should handle API response error message', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Invalid CNPJ format',
          },
        },
      };

      mockRepository.findOne.mockResolvedValue(mockContrato);
      mockAuthService.getAuthHeaders.mockResolvedValue({
        Authorization: 'Bearer token',
      });
      mockHttpService.post.mockReturnValue(throwError(() => apiError));
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.pushContrato('contrato-123')).rejects.toThrow(
        'Failed to sync contrato to Gov.br: Invalid CNPJ format',
      );

      expect(mockRepository.update).toHaveBeenCalledWith('contrato-123', {
        govBrSyncStatus: 'error',
        govBrSyncErrorMessage: 'Invalid CNPJ format',
      });
    });

    it('should correctly map ContratoStatus to Gov.br status code', async () => {
      const statusTestCases = [
        { status: ContratoStatus.MINUTA, expected: 1 },
        { status: ContratoStatus.ASSINADO, expected: 2 },
        { status: ContratoStatus.EM_EXECUCAO, expected: 3 },
        { status: ContratoStatus.ADITIVADO, expected: 4 },
        { status: ContratoStatus.SUSPENSO, expected: 5 },
        { status: ContratoStatus.RESCINDIDO, expected: 6 },
        { status: ContratoStatus.ENCERRADO, expected: 7 },
      ];

      for (const { status, expected } of statusTestCases) {
        const testContrato = { ...mockContrato, status };
        mockRepository.findOne.mockResolvedValue(testContrato);
        mockAuthService.getAuthHeaders.mockResolvedValue({
          Authorization: 'Bearer token',
        });

        const mockResponse = {
          data: { id: 'test-id', numero_contrato: 'TEST', created_at: '' },
        };
        mockHttpService.post.mockReturnValue(of(mockResponse));
        mockRepository.update.mockResolvedValue({ affected: 1 });

        await service.pushContrato('contrato-123');

        expect(mockHttpService.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            status_contrato: expected,
          }),
          expect.any(Object),
        );
      }
    });

    it('should correctly format dates to ISO 8601', async () => {
      mockRepository.findOne.mockResolvedValue(mockContrato);
      mockAuthService.getAuthHeaders.mockResolvedValue({
        Authorization: 'Bearer token',
      });

      const mockResponse = {
        data: { id: 'test-id', numero_contrato: 'TEST', created_at: '' },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.pushContrato('contrato-123');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          data_inicio_vigencia: '2024-01-01',
          data_fim_vigencia: '2024-12-31',
          data_assinatura: '2024-01-01',
          data_publicacao: '2024-01-02',
        }),
        expect.any(Object),
      );
    });

    it('should correctly convert string decimals to numbers', async () => {
      mockRepository.findOne.mockResolvedValue(mockContrato);
      mockAuthService.getAuthHeaders.mockResolvedValue({
        Authorization: 'Bearer token',
      });

      const mockResponse = {
        data: { id: 'test-id', numero_contrato: 'TEST', created_at: '' },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.pushContrato('contrato-123');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          valor_global: 100000.0,
          valor_unitario: 1000.0,
          quantidade: 100.0,
        }),
        expect.any(Object),
      );
    });
  });
});
