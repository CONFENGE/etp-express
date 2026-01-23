import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OcorrenciaService } from './ocorrencia.service';
import {
  Ocorrencia,
  OcorrenciaTipo,
  OcorrenciaGravidade,
  OcorrenciaStatus,
} from '../../../entities/ocorrencia.entity';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { User } from '../../../entities/user.entity';
import { CreateOcorrenciaDto } from '../dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from '../dto/update-ocorrencia.dto';

describe('OcorrenciaService', () => {
  let service: OcorrenciaService;
  let ocorrenciaRepository: jest.Mocked<Repository<Ocorrencia>>;
  let contratoRepository: jest.Mocked<Repository<Contrato>>;

  // Mock users
  const mockFiscal: User = {
    id: 'user-fiscal',
    name: 'João Silva',
    email: 'fiscal@prefeitura.test',
  } as User;

  const mockGestor: User = {
    id: 'user-gestor',
    name: 'Maria Santos',
    email: 'gestor@prefeitura.test',
  } as User;

  const mockOtherUser: User = {
    id: 'user-other',
    name: 'Carlos Oliveira',
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
    gestorResponsavelId: mockGestor.id,
    gestorResponsavel: mockGestor,
    status: ContratoStatus.EM_EXECUCAO,
  } as Contrato;

  // Mock ocorrência
  const mockOcorrencia: Ocorrencia = {
    id: 'ocorrencia-123',
    contratoId: mockContrato.id,
    contrato: mockContrato,
    tipo: OcorrenciaTipo.ATRASO,
    gravidade: OcorrenciaGravidade.MEDIA,
    dataOcorrencia: new Date('2024-01-15'),
    descricao:
      'Atraso de 5 dias na entrega do lote 3 de materiais conforme cronograma aprovado',
    acaoCorretiva: null,
    prazoResolucao: null,
    status: OcorrenciaStatus.ABERTA,
    registradoPorId: mockFiscal.id,
    registradoPor: mockFiscal,
  } as Ocorrencia;

  beforeEach(async () => {
    const mockOcorrenciaRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockContratoRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcorrenciaService,
        {
          provide: getRepositoryToken(Ocorrencia),
          useValue: mockOcorrenciaRepo,
        },
        {
          provide: getRepositoryToken(Contrato),
          useValue: mockContratoRepo,
        },
      ],
    }).compile();

    service = module.get<OcorrenciaService>(OcorrenciaService);
    ocorrenciaRepository = module.get(getRepositoryToken(Ocorrencia));
    contratoRepository = module.get(getRepositoryToken(Contrato));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateOcorrenciaDto = {
      tipo: OcorrenciaTipo.ATRASO,
      gravidade: OcorrenciaGravidade.MEDIA,
      dataOcorrencia: new Date('2024-01-15'),
      descricao:
        'Atraso de 5 dias na entrega do lote 3 de materiais conforme cronograma aprovado',
    };

    it('should create ocorrencia successfully when fiscal creates it', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      ocorrenciaRepository.create.mockReturnValue(mockOcorrencia);
      ocorrenciaRepository.save.mockResolvedValue(mockOcorrencia);

      const result = await service.create(
        mockContrato.id,
        createDto,
        mockFiscal.id,
      );

      expect(contratoRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContrato.id },
      });
      expect(ocorrenciaRepository.create).toHaveBeenCalledWith({
        contratoId: mockContrato.id,
        tipo: createDto.tipo,
        gravidade: createDto.gravidade,
        dataOcorrencia: createDto.dataOcorrencia,
        descricao: createDto.descricao,
        acaoCorretiva: undefined,
        prazoResolucao: undefined,
        registradoPorId: mockFiscal.id,
      });
      expect(ocorrenciaRepository.save).toHaveBeenCalledWith(mockOcorrencia);
      expect(result).toEqual(mockOcorrencia);
    });

    it('should create ocorrencia successfully when gestor creates it', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      ocorrenciaRepository.create.mockReturnValue(mockOcorrencia);
      ocorrenciaRepository.save.mockResolvedValue(mockOcorrencia);

      const result = await service.create(
        mockContrato.id,
        createDto,
        mockGestor.id,
      );

      expect(result).toEqual(mockOcorrencia);
    });

    it('should throw NotFoundException when contrato does not exist', async () => {
      contratoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockContrato.id, createDto, mockFiscal.id),
      ).rejects.toThrow(NotFoundException);

      expect(contratoRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContrato.id },
      });
    });

    it('should throw ForbiddenException when user is not fiscal or gestor', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);

      await expect(
        service.create(mockContrato.id, createDto, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when gravidade is CRITICA without acaoCorretiva', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);

      const criticaDto: CreateOcorrenciaDto = {
        ...createDto,
        gravidade: OcorrenciaGravidade.CRITICA,
        // acaoCorretiva ausente
      };

      await expect(
        service.create(mockContrato.id, criticaDto, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
      expect(contratoRepository.findOne).toHaveBeenCalled();
    });

    it('should create successfully when gravidade is CRITICA with acaoCorretiva', async () => {
      contratoRepository.findOne.mockResolvedValue(mockContrato);
      const criticaWithAction: Ocorrencia = {
        ...mockOcorrencia,
        gravidade: OcorrenciaGravidade.CRITICA,
        acaoCorretiva: 'Notificação formal ao contratado',
      };
      ocorrenciaRepository.create.mockReturnValue(criticaWithAction);
      ocorrenciaRepository.save.mockResolvedValue(criticaWithAction);

      const criticaDto: CreateOcorrenciaDto = {
        ...createDto,
        gravidade: OcorrenciaGravidade.CRITICA,
        acaoCorretiva: 'Notificação formal ao contratado',
      };

      const result = await service.create(
        mockContrato.id,
        criticaDto,
        mockFiscal.id,
      );

      expect(result).toEqual(criticaWithAction);
      expect(ocorrenciaRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAllByContrato', () => {
    it('should return all ocorrencias for a contrato ordered by date DESC', async () => {
      const ocorrencias = [mockOcorrencia];
      ocorrenciaRepository.find.mockResolvedValue(ocorrencias);

      const result = await service.findAllByContrato(mockContrato.id);

      expect(ocorrenciaRepository.find).toHaveBeenCalledWith({
        where: { contratoId: mockContrato.id },
        order: { dataOcorrencia: 'DESC' },
      });
      expect(result).toEqual(ocorrencias);
    });
  });

  describe('findOne', () => {
    it('should return ocorrencia when it exists', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);

      const result = await service.findOne(mockOcorrencia.id);

      expect(ocorrenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOcorrencia.id },
      });
      expect(result).toEqual(mockOcorrencia);
    });

    it('should throw NotFoundException when ocorrencia does not exist', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateOcorrenciaDto = {
      status: OcorrenciaStatus.EM_ANALISE,
    };

    it('should update ocorrencia successfully when fiscal updates it', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);
      const updatedOcorrencia = { ...mockOcorrencia, ...updateDto };
      ocorrenciaRepository.save.mockResolvedValue(updatedOcorrencia);

      const result = await service.update(
        mockOcorrencia.id,
        updateDto,
        mockFiscal.id,
      );

      expect(ocorrenciaRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(OcorrenciaStatus.EM_ANALISE);
    });

    it('should update ocorrencia successfully when gestor updates it', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);
      const updatedOcorrencia = { ...mockOcorrencia, ...updateDto };
      ocorrenciaRepository.save.mockResolvedValue(updatedOcorrencia);

      const result = await service.update(
        mockOcorrencia.id,
        updateDto,
        mockGestor.id,
      );

      expect(result.status).toBe(OcorrenciaStatus.EM_ANALISE);
    });

    it('should throw ForbiddenException when user is not fiscal or gestor', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);

      await expect(
        service.update(mockOcorrencia.id, updateDto, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when changing to CRITICA without acaoCorretiva', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);

      const criticaUpdate: UpdateOcorrenciaDto = {
        gravidade: OcorrenciaGravidade.CRITICA,
        // sem acaoCorretiva
      };

      await expect(
        service.update(mockOcorrencia.id, criticaUpdate, mockFiscal.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update successfully when adding acaoCorretiva to CRITICA', async () => {
      const criticaOcorrencia: Ocorrencia = {
        ...mockOcorrencia,
        gravidade: OcorrenciaGravidade.CRITICA,
        acaoCorretiva: null,
      };
      ocorrenciaRepository.findOne.mockResolvedValue(criticaOcorrencia);
      const updatedCritica = {
        ...criticaOcorrencia,
        acaoCorretiva: 'Notificação formal',
      };
      ocorrenciaRepository.save.mockResolvedValue(updatedCritica);

      const updateWithAction: UpdateOcorrenciaDto = {
        acaoCorretiva: 'Notificação formal',
      };

      const result = await service.update(
        mockOcorrencia.id,
        updateWithAction,
        mockFiscal.id,
      );

      expect(result.acaoCorretiva).toBe('Notificação formal');
    });
  });

  describe('remove', () => {
    it('should remove ocorrencia successfully when fiscal removes it', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);
      ocorrenciaRepository.remove.mockResolvedValue(mockOcorrencia);

      await service.remove(mockOcorrencia.id, mockFiscal.id);

      expect(ocorrenciaRepository.remove).toHaveBeenCalledWith(mockOcorrencia);
    });

    it('should remove ocorrencia successfully when gestor removes it', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);
      ocorrenciaRepository.remove.mockResolvedValue(mockOcorrencia);

      await service.remove(mockOcorrencia.id, mockGestor.id);

      expect(ocorrenciaRepository.remove).toHaveBeenCalledWith(mockOcorrencia);
    });

    it('should throw ForbiddenException when user is not fiscal or gestor', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(mockOcorrencia);

      await expect(
        service.remove(mockOcorrencia.id, mockOtherUser.id),
      ).rejects.toThrow(ForbiddenException);

      expect(ocorrenciaRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ocorrencia does not exist', async () => {
      ocorrenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', mockFiscal.id),
      ).rejects.toThrow(NotFoundException);

      expect(ocorrenciaRepository.remove).not.toHaveBeenCalled();
    });
  });
});
