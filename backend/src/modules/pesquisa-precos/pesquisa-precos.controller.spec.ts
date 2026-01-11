import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PesquisaPrecosController } from './pesquisa-precos.controller';
import { PesquisaPrecosService } from './pesquisa-precos.service';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
  MetodologiaPesquisa,
} from '../../entities/pesquisa-precos.entity';
import { CreatePesquisaPrecosDto } from './dto/create-pesquisa-precos.dto';
import { UpdatePesquisaPrecosDto } from './dto/update-pesquisa-precos.dto';

describe('PesquisaPrecosController', () => {
  let controller: PesquisaPrecosController;
  let service: PesquisaPrecosService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  const mockUser = {
    id: mockUserId,
    organizationId: mockOrganizationId,
    email: 'test@example.com',
    role: 'consultant',
  };

  const mockPesquisaPrecos: Partial<PesquisaPrecos> = {
    id: 'pesq-001',
    titulo: 'Pesquisa de precos - Computadores',
    organizationId: mockOrganizationId,
    metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
    status: PesquisaPrecosStatus.DRAFT,
    versao: 1,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PesquisaPrecosController],
      providers: [
        {
          provide: PesquisaPrecosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PesquisaPrecosController>(PesquisaPrecosController);
    service = module.get<PesquisaPrecosService>(PesquisaPrecosService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a price research', async () => {
      const createDto: CreatePesquisaPrecosDto = {
        titulo: 'Nova Pesquisa',
        metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
      };

      mockService.create.mockResolvedValue(mockPesquisaPrecos);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
        mockUser.organizationId,
      );
    });
  });

  describe('findAll', () => {
    it('should return all price researches', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual([mockPesquisaPrecos]);
      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by etpId', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(mockUser, 'etp-123');

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        'etp-123',
        undefined,
        undefined,
      );
    });

    it('should filter by termoReferenciaId', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(mockUser, undefined, 'tr-123');

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        'tr-123',
        undefined,
      );
    });

    it('should filter by status', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        PesquisaPrecosStatus.COMPLETED,
      );

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        undefined,
        PesquisaPrecosStatus.COMPLETED,
      );
    });
  });

  describe('findOne', () => {
    it('should return a price research by id', async () => {
      mockService.findOne.mockResolvedValue(mockPesquisaPrecos);

      const result = await controller.findOne('pesq-001', mockUser);

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockService.findOne).toHaveBeenCalledWith(
        'pesq-001',
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        controller.findOne('non-existent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when belongs to another org', async () => {
      mockService.findOne.mockRejectedValue(new ForbiddenException());

      await expect(controller.findOne('pesq-001', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a price research', async () => {
      const updateDto: UpdatePesquisaPrecosDto = {
        titulo: 'Pesquisa Atualizada',
      };

      const updatedPesquisa = { ...mockPesquisaPrecos, ...updateDto };
      mockService.update.mockResolvedValue(updatedPesquisa);

      const result = await controller.update('pesq-001', updateDto, mockUser);

      expect(result.titulo).toBe(updateDto.titulo);
      expect(mockService.update).toHaveBeenCalledWith(
        'pesq-001',
        updateDto,
        mockUser.organizationId,
      );
    });
  });

  describe('remove', () => {
    it('should remove a price research', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('pesq-001', mockUser);

      expect(mockService.remove).toHaveBeenCalledWith(
        'pesq-001',
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
