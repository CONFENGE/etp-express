import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EtpsController } from './etps.controller';
import { EtpsService } from './etps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EtpStatus } from '../../entities/etp.entity';
import { CreateEtpDto } from './dto/create-etp.dto';
import { UpdateEtpDto } from './dto/update-etp.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('EtpsController', () => {
  let controller: EtpsController;
  let service: EtpsService;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';

  const mockEtp = {
    id: mockEtpId,
    createdById: mockUserId,
    title: 'Test ETP',
    description: 'Test Description',
    status: EtpStatus.DRAFT,
    objeto: 'Contratação de serviços de TI',
    metadata: { orgao: 'CONFENGE' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockEtp],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockStatistics = {
    total: 10,
    byStatus: {
      [EtpStatus.DRAFT]: 5,
      [EtpStatus.IN_PROGRESS]: 3,
      [EtpStatus.REVIEW]: 2,
      [EtpStatus.COMPLETED]: 0,
      [EtpStatus.ARCHIVED]: 0,
    },
    recentActivity: [],
  };

  const mockEtpsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getStatistics: jest.fn(),
    findOne: jest.fn(),
    findOneMinimal: jest.fn(),
    findOneWithSections: jest.fn(),
    findOneWithVersions: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtpsController],
      providers: [
        {
          provide: EtpsService,
          useValue: mockEtpsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<EtpsController>(EtpsController);
    service = module.get<EtpsService>(EtpsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createEtpDto: CreateEtpDto = {
      title: 'New ETP',
      description: 'New Description',
      objeto: 'Contratação de serviços',
      metadata: { orgao: 'CONFENGE' },
    };

    it('should create a new ETP', async () => {
      // Arrange
      const newEtp = { ...mockEtp, ...createEtpDto };
      mockEtpsService.create.mockResolvedValue(newEtp);

      // Act
      const result = await controller.create(createEtpDto, mockUserId);

      // Assert
      expect(service.create).toHaveBeenCalledWith(createEtpDto, mockUserId);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(newEtp);
      expect(result.data.title).toBe(createEtpDto.title);
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should return ETP with createdById from CurrentUser decorator', async () => {
      // Arrange
      const newEtp = { ...mockEtp, createdById: mockUserId };
      mockEtpsService.create.mockResolvedValue(newEtp);

      // Act
      const result = await controller.create(createEtpDto, mockUserId);

      // Assert
      expect(result.data.createdById).toBe(mockUserId);
      expect(service.create).toHaveBeenCalledWith(createEtpDto, mockUserId);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockEtpsService.create.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.create(createEtpDto, mockUserId);

      // Assert
      expect(result).toHaveProperty('disclaimer');
      expect(result.disclaimer).toContain(
        'Lembre-se de verificar todas as informações',
      );
    });
  });

  describe('findAll', () => {
    const paginationDto: PaginationDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of ETPs', async () => {
      // Arrange
      mockEtpsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(paginationDto, mockUserId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(paginationDto, mockUserId);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
    });

    it('should pass pagination parameters to service', async () => {
      // Arrange
      mockEtpsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(paginationDto, mockUserId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
        mockUserId,
      );
    });

    it('should filter ETPs by userId', async () => {
      // Arrange
      mockEtpsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(paginationDto, mockUserId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(paginationDto, mockUserId);
    });
  });

  describe('getStatistics', () => {
    it('should return ETP statistics for user', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(mockUserId);

      // Assert
      expect(service.getStatistics).toHaveBeenCalledWith(mockUserId);
      expect(service.getStatistics).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockStatistics);
      expect(result.data.total).toBe(10);
      expect(result.disclaimer).toBeDefined();
    });

    it('should return statistics by status', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(mockUserId);

      // Assert
      expect(result.data.byStatus).toBeDefined();
      expect(result.data.byStatus[EtpStatus.DRAFT]).toBe(5);
      expect(result.data.byStatus[EtpStatus.IN_PROGRESS]).toBe(3);
    });

    it('should include disclaimer in statistics response', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('findOne', () => {
    it('should return a single ETP by ID', async () => {
      // Arrange
      mockEtpsService.findOneWithSections.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.findOne(mockEtpId, mockUserId);

      // Assert
      expect(service.findOneWithSections).toHaveBeenCalledWith(
        mockEtpId,
        mockUserId,
      );
      expect(service.findOneWithSections).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockEtp);
      expect(result.data.id).toBe(mockEtpId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      mockEtpsService.findOneWithSections.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.findOne('invalid-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.findOne('invalid-id', mockUserId),
      ).rejects.toThrow('ETP não encontrado');
    });

    it('should throw ForbiddenException when user does not own the ETP', async () => {
      // Arrange
      mockEtpsService.findOneWithSections.mockRejectedValue(
        new ForbiddenException('Você não tem permissão para acessar este ETP'),
      );

      // Act & Assert
      await expect(controller.findOne(mockEtpId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockEtpsService.findOneWithSections.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.findOne(mockEtpId, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('update', () => {
    const updateEtpDto: UpdateEtpDto = {
      title: 'Updated ETP',
      description: 'Updated Description',
    };

    it('should update an ETP', async () => {
      // Arrange
      const updatedEtp = { ...mockEtp, ...updateEtpDto };
      mockEtpsService.update.mockResolvedValue(updatedEtp);

      // Act
      const result = await controller.update(
        mockEtpId,
        updateEtpDto,
        mockUserId,
      );

      // Assert
      expect(service.update).toHaveBeenCalledWith(
        mockEtpId,
        updateEtpDto,
        mockUserId,
      );
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(updatedEtp);
      expect(result.data.title).toBe('Updated ETP');
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      mockEtpsService.update.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.update('invalid-id', updateEtpDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the ETP', async () => {
      // Arrange
      mockEtpsService.update.mockRejectedValue(
        new ForbiddenException(
          'Você não tem permissão para atualizar este ETP',
        ),
      );

      // Act & Assert
      await expect(
        controller.update(mockEtpId, updateEtpDto, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    const newStatus = EtpStatus.REVIEW;

    it('should update ETP status', async () => {
      // Arrange
      const updatedEtp = { ...mockEtp, status: newStatus };
      mockEtpsService.updateStatus.mockResolvedValue(updatedEtp);

      // Act
      const result = await controller.updateStatus(
        mockEtpId,
        newStatus,
        mockUserId,
      );

      // Assert
      expect(service.updateStatus).toHaveBeenCalledWith(
        mockEtpId,
        newStatus,
        mockUserId,
      );
      expect(service.updateStatus).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(updatedEtp);
      expect(result.data.status).toBe(newStatus);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      mockEtpsService.updateStatus.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.updateStatus('invalid-id', newStatus, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the ETP', async () => {
      // Arrange
      mockEtpsService.updateStatus.mockRejectedValue(
        new ForbiddenException(
          'Você não tem permissão para atualizar este ETP',
        ),
      );

      // Act & Assert
      await expect(
        controller.updateStatus(mockEtpId, newStatus, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      const updatedEtp = { ...mockEtp, status: newStatus };
      mockEtpsService.updateStatus.mockResolvedValue(updatedEtp);

      // Act
      const result = await controller.updateStatus(
        mockEtpId,
        newStatus,
        mockUserId,
      );

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('remove', () => {
    it('should delete an ETP', async () => {
      // Arrange
      mockEtpsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(mockEtpId, mockUserId);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(mockEtpId, mockUserId);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('ETP deletado com sucesso');
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      mockEtpsService.remove.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      );

      // Act & Assert
      await expect(controller.remove('invalid-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the ETP', async () => {
      // Arrange
      mockEtpsService.remove.mockRejectedValue(
        new ForbiddenException('Você não tem permissão para deletar este ETP'),
      );

      // Act & Assert
      await expect(controller.remove(mockEtpId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include disclaimer in delete response', async () => {
      // Arrange
      mockEtpsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(mockEtpId, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });
});
