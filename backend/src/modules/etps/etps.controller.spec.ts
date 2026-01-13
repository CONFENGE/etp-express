import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { EtpsController } from './etps.controller';
import { EtpsService } from './etps.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResourceOwnershipGuard } from '../../common/guards/resource-ownership.guard';
import { DemoUserEtpLimitGuard } from '../../common/guards/demo-user-etp-limit.guard';
import { EtpStatus } from '../../entities/etp.entity';
import { CreateEtpDto } from './dto/create-etp.dto';
import { UpdateEtpDto } from './dto/update-etp.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('EtpsController', () => {
  let controller: EtpsController;
  let service: EtpsService;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockOrganizationId = 'org-789';

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
    findOneWithSectionsNoAuth: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateDirect: jest.fn(),
    updateStatusDirect: jest.fn(),
    remove: jest.fn(),
    removeDirect: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = { id: mockUserId, organizationId: mockOrganizationId };
      return true;
    }),
  };

  // Mock ResourceOwnershipGuard - validation is tested in resource-ownership.guard.spec.ts
  const mockResourceOwnershipGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock DemoUserEtpLimitGuard - validation is tested in demo-user-etp-limit.guard.spec.ts
  const mockDemoUserEtpLimitGuard = {
    canActivate: jest.fn(() => true),
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
      .useValue(mockJwtAuthGuard)
      .overrideGuard(ResourceOwnershipGuard)
      .useValue(mockResourceOwnershipGuard)
      .overrideGuard(DemoUserEtpLimitGuard)
      .useValue(mockDemoUserEtpLimitGuard)
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
      const result = await controller.create(
        createEtpDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(service.create).toHaveBeenCalledWith(
        createEtpDto,
        mockUserId,
        mockOrganizationId,
      );
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
      const result = await controller.create(
        createEtpDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result.data.createdById).toBe(mockUserId);
      expect(service.create).toHaveBeenCalledWith(
        createEtpDto,
        mockUserId,
        mockOrganizationId,
      );
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockEtpsService.create.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.create(
        createEtpDto,
        mockUserId,
        mockOrganizationId,
      );

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
      const result = await controller.findAll(
        paginationDto,
        mockOrganizationId,
        mockUserId,
      );

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(
        paginationDto,
        mockOrganizationId,
        mockUserId,
      );
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
    });

    it('should pass pagination parameters to service', async () => {
      // Arrange
      mockEtpsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(paginationDto, mockOrganizationId, mockUserId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
        mockOrganizationId,
        mockUserId,
      );
    });

    it('should filter ETPs by userId', async () => {
      // Arrange
      mockEtpsService.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.findAll(paginationDto, mockOrganizationId, mockUserId);

      // Assert
      expect(service.findAll).toHaveBeenCalledWith(
        paginationDto,
        mockOrganizationId,
        mockUserId,
      );
    });

    // SECURITY TESTS (Issue #1326)
    it('should throw UnauthorizedException when userId is missing (Issue #1326)', async () => {
      // Act & Assert - Controller validates userId before calling service
      await expect(
        controller.findAll(paginationDto, mockOrganizationId, null as any),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.findAll(paginationDto, mockOrganizationId, undefined as any),
      ).rejects.toThrow(UnauthorizedException);

      // Service should NOT be called when validation fails
      expect(service.findAll).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when organizationId is missing (Issue #1326)', async () => {
      // Act & Assert - Controller validates organizationId before calling service
      await expect(
        controller.findAll(paginationDto, null as any, mockUserId),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.findAll(paginationDto, undefined as any, mockUserId),
      ).rejects.toThrow(UnauthorizedException);

      // Service should NOT be called when validation fails
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return ETP statistics for user', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(
        mockOrganizationId,
        mockUserId,
      );

      // Assert
      expect(service.getStatistics).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
      );
      expect(service.getStatistics).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockStatistics);
      expect(result.data.total).toBe(10);
      expect(result.disclaimer).toBeDefined();
    });

    it('should return statistics by status', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(
        mockOrganizationId,
        mockUserId,
      );

      // Assert
      expect(result.data.byStatus).toBeDefined();
      expect(result.data.byStatus[EtpStatus.DRAFT]).toBe(5);
      expect(result.data.byStatus[EtpStatus.IN_PROGRESS]).toBe(3);
    });

    it('should include disclaimer in statistics response', async () => {
      // Arrange
      mockEtpsService.getStatistics.mockResolvedValue(mockStatistics);

      // Act
      const result = await controller.getStatistics(
        mockOrganizationId,
        mockUserId,
      );

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    // SECURITY TESTS (Issue #1326)
    it('should throw UnauthorizedException when userId is missing (Issue #1326)', async () => {
      // Act & Assert - Controller validates userId before calling service
      await expect(
        controller.getStatistics(mockOrganizationId, null as any),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.getStatistics(mockOrganizationId, undefined as any),
      ).rejects.toThrow(UnauthorizedException);

      // Service should NOT be called when validation fails
      expect(service.getStatistics).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when organizationId is missing (Issue #1326)', async () => {
      // Act & Assert - Controller validates organizationId before calling service
      await expect(
        controller.getStatistics(null as any, mockUserId),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.getStatistics(undefined as any, mockUserId),
      ).rejects.toThrow(UnauthorizedException);

      // Service should NOT be called when validation fails
      expect(service.getStatistics).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    // Note: Authorization is now handled by @RequireOwnership decorator/guard
    // The ETP is pre-validated and injected via @Resource() decorator
    // Tests here verify controller logic with pre-validated resource

    it('should return a single ETP by ID', async () => {
      // Arrange - ETP is pre-validated by guard, service loads with sections
      const etpWithSections = { ...mockEtp, sections: [] };
      mockEtpsService.findOneWithSectionsNoAuth.mockResolvedValue(
        etpWithSections,
      );

      // Act - Controller receives pre-validated ETP from guard
      const result = await controller.findOne(mockEtp as any);

      // Assert
      expect(service.findOneWithSectionsNoAuth).toHaveBeenCalledWith(mockEtpId);
      expect(service.findOneWithSectionsNoAuth).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(etpWithSections);
      expect(result.data.id).toBe(mockEtpId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockEtpsService.findOneWithSectionsNoAuth.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.findOne(mockEtp as any);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    // Note: NotFoundException and ForbiddenException tests are now covered by
    // ResourceOwnershipGuard tests (resource-ownership.guard.spec.ts)
  });

  describe('update', () => {
    // Note: Authorization is now handled by @RequireOwnership decorator/guard
    // The ETP is pre-validated and injected via @Resource() decorator

    const updateEtpDto: UpdateEtpDto = {
      title: 'Updated ETP',
      description: 'Updated Description',
    };

    it('should update an ETP', async () => {
      // Arrange - ETP is pre-validated by guard
      const updatedEtp = { ...mockEtp, ...updateEtpDto };
      mockEtpsService.updateDirect.mockResolvedValue(updatedEtp);

      // Act - Controller receives pre-validated ETP from guard
      const result = await controller.update(
        updateEtpDto,
        mockEtp as any,
        mockUserId,
      );

      // Assert
      expect(service.updateDirect).toHaveBeenCalledWith(
        mockEtp,
        updateEtpDto,
        mockUserId,
      );
      expect(service.updateDirect).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(updatedEtp);
      expect(result.data.title).toBe('Updated ETP');
      expect(result.disclaimer).toBeDefined();
    });

    // Note: NotFoundException and ForbiddenException tests are now covered by
    // ResourceOwnershipGuard tests (resource-ownership.guard.spec.ts)
  });

  describe('updateStatus', () => {
    // Note: Authorization is now handled by @RequireOwnership decorator/guard
    // The ETP is pre-validated and injected via @Resource() decorator

    const newStatus = EtpStatus.REVIEW;

    it('should update ETP status', async () => {
      // Arrange - ETP is pre-validated by guard
      const updatedEtp = { ...mockEtp, status: newStatus };
      mockEtpsService.updateStatusDirect.mockResolvedValue(updatedEtp);

      // Act - Controller receives pre-validated ETP from guard
      const result = await controller.updateStatus(
        newStatus,
        mockEtp as any,
        mockUserId,
      );

      // Assert
      expect(service.updateStatusDirect).toHaveBeenCalledWith(
        mockEtp,
        newStatus,
        mockUserId,
      );
      expect(service.updateStatusDirect).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(updatedEtp);
      expect(result.data.status).toBe(newStatus);
      expect(result.disclaimer).toBeDefined();
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      const updatedEtp = { ...mockEtp, status: newStatus };
      mockEtpsService.updateStatusDirect.mockResolvedValue(updatedEtp);

      // Act
      const result = await controller.updateStatus(
        newStatus,
        mockEtp as any,
        mockUserId,
      );

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    // Note: NotFoundException and ForbiddenException tests are now covered by
    // ResourceOwnershipGuard tests (resource-ownership.guard.spec.ts)
  });

  describe('remove', () => {
    // Note: Authorization is now handled by @RequireOwnership decorator/guard
    // The ETP is pre-validated and injected via @Resource() decorator

    it('should delete an ETP', async () => {
      // Arrange - ETP is pre-validated by guard
      mockEtpsService.removeDirect.mockResolvedValue(undefined);

      // Act - Controller receives pre-validated ETP from guard
      const result = await controller.remove(mockEtp as any, mockUserId);

      // Assert
      expect(service.removeDirect).toHaveBeenCalledWith(mockEtp, mockUserId);
      expect(service.removeDirect).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('ETP deletado com sucesso');
      expect(result.disclaimer).toBeDefined();
    });

    it('should include disclaimer in delete response', async () => {
      // Arrange
      mockEtpsService.removeDirect.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(mockEtp as any, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    // Note: NotFoundException and ForbiddenException tests are now covered by
    // ResourceOwnershipGuard tests (resource-ownership.guard.spec.ts)
  });
});
