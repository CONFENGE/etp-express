import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AtesteService } from './ateste.service';
import { Ateste, AtesteResultado } from '../../../entities/ateste.entity';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';
import { User } from '../../../entities/user.entity';
import { CreateAtesteDto } from '../dto/create-ateste.dto';

describe('AtesteService', () => {
  let service: AtesteService;
  let atesteRepository: jest.Mocked<Repository<Ateste>>;
  let medicaoRepository: jest.Mocked<Repository<Medicao>>;

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

  // Mock medição
  const mockMedicao: Medicao = {
    id: 'medicao-123',
    contratoId: 'contrato-123',
    numero: 1,
    periodoInicio: new Date('2024-01-01'),
    periodoFim: new Date('2024-01-31'),
    valorMedido: '10000.00',
    status: MedicaoStatus.PENDENTE,
    fiscalResponsavelId: mockFiscal.id,
    fiscalResponsavel: mockFiscal,
  } as Medicao;

  // Mock ateste
  const mockAteste: Ateste = {
    id: 'ateste-123',
    medicaoId: mockMedicao.id,
    medicao: mockMedicao,
    fiscalId: mockFiscal.id,
    fiscal: mockFiscal,
    resultado: AtesteResultado.APROVADO,
    dataAteste: new Date('2024-02-01'),
  } as Ateste;

  beforeEach(async () => {
    const mockAtesteRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockMedicaoRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtesteService,
        {
          provide: getRepositoryToken(Ateste),
          useValue: mockAtesteRepo,
        },
        {
          provide: getRepositoryToken(Medicao),
          useValue: mockMedicaoRepo,
        },
      ],
    }).compile();

    service = module.get<AtesteService>(AtesteService);
    atesteRepository = module.get(getRepositoryToken(Ateste));
    medicaoRepository = module.get(getRepositoryToken(Medicao));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateAtesteDto = {
      resultado: AtesteResultado.APROVADO,
      dataAteste: new Date('2024-02-01'),
    };

    it('deve criar ateste aprovado com sucesso', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(null); // Sem ateste existente
      atesteRepository.create.mockReturnValue(mockAteste);
      atesteRepository.save.mockResolvedValue(mockAteste);
      medicaoRepository.save.mockResolvedValue({
        ...mockMedicao,
        status: MedicaoStatus.APROVADA,
        dataAteste: createDto.dataAteste,
      });

      const result = await service.create(
        mockMedicao.id,
        createDto,
        mockFiscal.id,
      );

      expect(result).toEqual(mockAteste);
      expect(atesteRepository.create).toHaveBeenCalledWith({
        medicaoId: mockMedicao.id,
        fiscalId: mockFiscal.id,
        resultado: AtesteResultado.APROVADO,
        justificativa: undefined,
        valorAtestado: undefined,
        dataAteste: createDto.dataAteste,
        observacoes: undefined,
      });
      expect(medicaoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MedicaoStatus.APROVADA,
          dataAteste: createDto.dataAteste,
        }),
      );
    });

    it('deve criar ateste rejeitado e reverter medição para pendente', async () => {
      const rejeitadoDto: CreateAtesteDto = {
        resultado: AtesteResultado.REJEITADO,
        justificativa: 'Serviços não conformes',
        dataAteste: new Date('2024-02-01'),
      };

      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(null);
      atesteRepository.create.mockReturnValue({
        ...mockAteste,
        resultado: AtesteResultado.REJEITADO,
        justificativa: rejeitadoDto.justificativa || null,
      });
      atesteRepository.save.mockResolvedValue({
        ...mockAteste,
        resultado: AtesteResultado.REJEITADO,
      });
      medicaoRepository.save.mockResolvedValue({
        ...mockMedicao,
        status: MedicaoStatus.REJEITADA,
      });

      const result = await service.create(
        mockMedicao.id,
        rejeitadoDto,
        mockFiscal.id,
      );

      expect(medicaoRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MedicaoStatus.REJEITADA,
          dataAteste: null,
        }),
      );
    });

    it('deve criar ateste aprovado com ressalvas', async () => {
      const ressalvasDto: CreateAtesteDto = {
        resultado: AtesteResultado.APROVADO_COM_RESSALVAS,
        justificativa: 'Qualidade parcialmente não conforme',
        valorAtestado: '9500.00',
        dataAteste: new Date('2024-02-01'),
      };

      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(null);
      atesteRepository.create.mockReturnValue({
        ...mockAteste,
        resultado: AtesteResultado.APROVADO_COM_RESSALVAS,
        justificativa: ressalvasDto.justificativa || null,
        valorAtestado: ressalvasDto.valorAtestado || null,
      });
      atesteRepository.save.mockResolvedValue({
        ...mockAteste,
        resultado: AtesteResultado.APROVADO_COM_RESSALVAS,
      });
      medicaoRepository.save.mockResolvedValue({
        ...mockMedicao,
        status: MedicaoStatus.APROVADA,
      });

      const result = await service.create(
        mockMedicao.id,
        ressalvasDto,
        mockFiscal.id,
      );

      expect(atesteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          valorAtestado: ressalvasDto.valorAtestado,
        }),
      );
    });

    it('deve lançar erro se medição não existe', async () => {
      medicaoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockMedicao.id, createDto, mockFiscal.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro se usuário não é fiscal', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);

      await expect(
        service.create(mockMedicao.id, createDto, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar erro se medição já está atestada', async () => {
      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(mockAteste);

      await expect(
        service.create(mockMedicao.id, createDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se valor atestado excede valor medido', async () => {
      const invalidDto: CreateAtesteDto = {
        resultado: AtesteResultado.APROVADO_COM_RESSALVAS,
        justificativa: 'Teste',
        valorAtestado: '15000.00', // Excede os 10000.00 medidos
        dataAteste: new Date('2024-02-01'),
      };

      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockMedicao.id, invalidDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro se justificativa falta quando obrigatória', async () => {
      const semJustificativaDto: CreateAtesteDto = {
        resultado: AtesteResultado.REJEITADO,
        dataAteste: new Date('2024-02-01'),
      };

      medicaoRepository.findOne.mockResolvedValue(mockMedicao);
      atesteRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockMedicao.id, semJustificativaDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('deve retornar ateste por ID', async () => {
      atesteRepository.findOne.mockResolvedValue(mockAteste);

      const result = await service.findOne(mockAteste.id);

      expect(result).toEqual(mockAteste);
      expect(atesteRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAteste.id },
      });
    });

    it('deve lançar erro se ateste não existe', async () => {
      atesteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByMedicao', () => {
    it('deve retornar ateste por medição', async () => {
      atesteRepository.findOne.mockResolvedValue(mockAteste);

      const result = await service.findByMedicao(mockMedicao.id);

      expect(result).toEqual(mockAteste);
      expect(atesteRepository.findOne).toHaveBeenCalledWith({
        where: { medicaoId: mockMedicao.id },
      });
    });

    it('deve retornar null se medição não tem ateste', async () => {
      atesteRepository.findOne.mockResolvedValue(null);

      const result = await service.findByMedicao(mockMedicao.id);

      expect(result).toBeNull();
    });
  });
});
