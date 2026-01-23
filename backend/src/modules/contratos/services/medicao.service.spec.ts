import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MedicaoService } from './medicao.service';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { User } from '../../../entities/user.entity';
import { CreateMedicaoDto } from '../dto/create-medicao.dto';
import { UpdateMedicaoDto } from '../dto/update-medicao.dto';

describe('MedicaoService', () => {
  let service: MedicaoService;
  let medicaoRepository: jest.Mocked<Repository<Medicao>>;
  let contratoRepository: jest.Mocked<Repository<Contrato>>;

  // Mock users
  const mockFiscal: User = {
    id: 'user-fiscal',
    name: 'João Silva',
    email: 'fiscal@prefeitura.test',
  } as User;

  const mockOtherUser: User = {
    id: 'user-other',
    name: 'Maria Santos',
    email: 'other@prefeitura.test',
  } as User;

  // Mock contrato
  const mockContrato: Contrato = {
    id: 'contrato-123',
    numero: '001/2024',
    objeto: 'Serviços de TI',
    valorGlobal: '100000.00',
    fiscalResponsavelId: mockFiscal.id,
    fiscalResponsavel: mockFiscal,
    status: ContratoStatus.EM_EXECUCAO,
  } as Contrato;

  // Mock medição
  const mockMedicao: Medicao = {
    id: 'medicao-123',
    contratoId: mockContrato.id,
    contrato: mockContrato,
    numero: 1,
    periodoInicio: new Date('2024-01-01'),
    periodoFim: new Date('2024-01-31'),
    valorMedido: '10000.00',
    status: MedicaoStatus.PENDENTE,
    fiscalResponsavelId: mockFiscal.id,
    fiscalResponsavel: mockFiscal,
    createdById: mockFiscal.id,
    createdBy: mockFiscal,
  } as Medicao;

  beforeEach(async () => {
    const mockMedicaoRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockContratoRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicaoService,
        {
          provide: getRepositoryToken(Medicao),
          useValue: mockMedicaoRepo,
        },
        {
          provide: getRepositoryToken(Contrato),
          useValue: mockContratoRepo,
        },
      ],
    }).compile();

    service = module.get<MedicaoService>(MedicaoService);
    medicaoRepository = module.get(getRepositoryToken(Medicao));
    contratoRepository = module.get(getRepositoryToken(Contrato));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateMedicaoDto = {
      periodoInicio: new Date('2024-01-01'),
      periodoFim: new Date('2024-01-31'),
      valorMedido: '10000.00',
      descricao: 'Primeira medição',
    };

    it('deve criar medição com sucesso', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      medicaoRepository.findOne.mockResolvedValue(null); // Nenhuma medição anterior
      medicaoRepository.create.mockReturnValue(mockMedicao);
      medicaoRepository.save.mockResolvedValue(mockMedicao);

      // Mock query builder for validateValorMedido
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalMedido: '0' }),
      } as unknown as SelectQueryBuilder<Medicao>;
      medicaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock query builder for validatePeriodo (getCount = 0)
      const mockQueryBuilder2 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as unknown as SelectQueryBuilder<Medicao>;
      medicaoRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockQueryBuilder2);

      const result = await service.create(
        mockContrato.id,
        createDto,
        mockFiscal.id,
      );

      expect(contratoRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContrato.id },
      });
      expect(medicaoRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockMedicao);
    });

    it('deve lançar NotFoundException se contrato não existe', async () => {
      contratoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockContrato.id, createDto, mockFiscal.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se usuário não é fiscal', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);

      await expect(
        service.create(mockContrato.id, createDto, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException se valor excede saldo', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      medicaoRepository.findOne.mockResolvedValue(null);

      // Mock query builder retornando total medido alto
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalMedido: '95000' }),
      } as unknown as SelectQueryBuilder<Medicao>;
      medicaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        service.create(mockContrato.id, createDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve auto-incrementar número sequencial', async () => {
      const ultimaMedicao = { ...mockMedicao, numero: 2 };
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      medicaoRepository.findOne.mockResolvedValue(ultimaMedicao);
      medicaoRepository.create.mockReturnValue({
        ...mockMedicao,
        numero: 3,
      });
      medicaoRepository.save.mockResolvedValue({
        ...mockMedicao,
        numero: 3,
      });

      // Mock validations passing
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalMedido: '0' }),
      } as unknown as SelectQueryBuilder<Medicao>;
      const mockQueryBuilder2 = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as unknown as SelectQueryBuilder<Medicao>;
      medicaoRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockQueryBuilder2);

      const result = await service.create(
        mockContrato.id,
        createDto,
        mockFiscal.id,
      );

      expect(result.numero).toBe(3);
    });
  });

  describe('findAllByContrato', () => {
    it('deve retornar todas as medições do contrato', async () => {
      const medicoes = [mockMedicao, { ...mockMedicao, numero: 2 }];
      medicaoRepository.find.mockResolvedValue(medicoes);

      const result = await service.findAllByContrato(mockContrato.id);

      expect(medicaoRepository.find).toHaveBeenCalledWith({
        where: { contratoId: mockContrato.id },
        order: { numero: 'ASC' },
      });
      expect(result).toEqual(medicoes);
    });
  });

  describe('findOne', () => {
    it('deve retornar medição por ID', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);

      const result = await service.findOne(mockMedicao.id);

      expect(medicaoRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockMedicao.id },
      });
      expect(result).toEqual(mockMedicao);
    });

    it('deve lançar NotFoundException se medição não existe', async () => {
      medicaoRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateMedicaoDto = {
      valorMedido: '15000.00',
    };

    it('deve atualizar medição com sucesso', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      medicaoRepository.save.mockResolvedValue({
        ...mockMedicao,
        ...updateDto,
      });

      // Mock validations passing
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ totalMedido: '0' }),
      } as unknown as SelectQueryBuilder<Medicao>;
      medicaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.update(
        mockMedicao.id,
        updateDto,
        mockFiscal.id,
      );

      expect(result.valorMedido).toBe(updateDto.valorMedido);
    });

    it('deve lançar ForbiddenException se usuário não é fiscal', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);

      await expect(
        service.update(mockMedicao.id, updateDto, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException se medição já foi aprovada', async () => {
      medicaoRepository.findOne.mockResolvedValue({
        ...mockMedicao,
        status: MedicaoStatus.APROVADA,
      });

      await expect(
        service.update(mockMedicao.id, updateDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve remover medição com sucesso', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      medicaoRepository.remove.mockResolvedValue(mockMedicao);

      await service.remove(mockMedicao.id, mockFiscal.id);

      expect(medicaoRepository.remove).toHaveBeenCalledWith(mockMedicao);
    });

    it('deve lançar ForbiddenException se usuário não é fiscal', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);

      await expect(
        service.remove(mockMedicao.id, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException se medição não está pendente', async () => {
      medicaoRepository.findOne.mockResolvedValue({
        ...mockMedicao,
        status: MedicaoStatus.APROVADA,
      });

      await expect(
        service.remove(mockMedicao.id, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
