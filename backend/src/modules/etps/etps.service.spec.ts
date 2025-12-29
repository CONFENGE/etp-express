import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { EtpsService } from './etps.service';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { SectionStatus } from '../../entities/etp-section.entity';
import { CreateEtpDto } from './dto/create-etp.dto';
import { UpdateEtpDto } from './dto/update-etp.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('EtpsService', () => {
  let service: EtpsService;
  let repository: Repository<Etp>;

  const mockUser1Id = 'user-123';
  const mockUser2Id = 'user-456';
  const mockOrganizationId = 'org-789';
  const mockOrganization2Id = 'org-999';

  const mockEtp: Partial<Etp> = {
    id: 'etp-123',
    title: 'ETP de Teste',
    description: 'Descrição',
    objeto: 'Aquisição de equipamentos',
    numeroProcesso: '12345/2025',
    valorEstimado: 100000,
    status: EtpStatus.DRAFT,
    createdById: mockUser1Id,
    organizationId: mockOrganizationId,
    currentVersion: 1,
    completionPercentage: 0,
    metadata: {},
    sections: [],
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  // Mock QueryRunner for ACID transactions (Issue #1057)
  const mockQueryRunnerQueryBuilder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockQueryRunnerManager = {
    createQueryBuilder: jest.fn(() => mockQueryRunnerQueryBuilder),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: mockQueryRunnerManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtpsService,
        {
          provide: getRepositoryToken(Etp),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<EtpsService>(EtpsService);
    repository = module.get<Repository<Etp>>(getRepositoryToken(Etp));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ETP with default values', async () => {
      const createDto: CreateEtpDto = {
        objeto: 'Aquisição de 50 notebooks',
        title: 'ETP Notebooks',
        metadata: { orgao: 'Secretaria de TI' },
      };

      const createdEtp = {
        ...createDto,
        id: 'new-etp-id',
        createdById: mockUser1Id,
        organizationId: mockOrganizationId,
        status: EtpStatus.DRAFT,
        currentVersion: 1,
        completionPercentage: 0,
      };

      mockRepository.create.mockReturnValue(createdEtp);
      mockRepository.save.mockResolvedValue(createdEtp);

      const result = await service.create(
        createDto,
        mockUser1Id,
        mockOrganizationId,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: mockUser1Id,
        organizationId: mockOrganizationId,
        status: EtpStatus.DRAFT,
        currentVersion: 1,
        completionPercentage: 0,
        sections: [],
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdEtp);
      expect(result).toEqual(createdEtp);
      expect(result.status).toBe(EtpStatus.DRAFT);
      expect(result.completionPercentage).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return paginated ETPs without user filter', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockEtps = [mockEtp, { ...mockEtp, id: 'etp-456' }];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockEtps, 2]);

      const result = await service.findAll(paginationDto, mockOrganizationId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('etp');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'etp.createdBy',
        'user',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'etp.updatedAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.data).toEqual(mockEtps);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter ETPs by userId when provided', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockEtps = [mockEtp];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockEtps, 1]);

      await service.findAll(paginationDto, mockOrganizationId, mockUser1Id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
    });

    it('should handle pagination correctly on page 2', async () => {
      const paginationDto: PaginationDto = { page: 2, limit: 5 };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(paginationDto, mockOrganizationId);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return ETP with all relations', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOne('etp-123', mockOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        relations: ['createdBy', 'sections', 'versions'],
        order: {
          sections: { order: 'ASC' },
          versions: { createdAt: 'DESC' },
        },
      });
      expect(result).toEqual(mockEtp);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne('non-existent', mockOrganizationId),
      ).rejects.toThrow('ETP com ID non-existent não encontrado');
    });

    it('should throw ForbiddenException when user attempts to access ETP owned by another user', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.findOne('etp-123', mockOrganization2Id, mockUser2Id),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');

      expect(loggerSpy).toHaveBeenCalledWith(
        `Organization ${mockOrganization2Id} attempted to access ETP etp-123 from organization ${mockOrganizationId}`,
      );
    });

    it('should not log warning when user accesses own ETP', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await service.findOne('etp-123', mockOrganizationId, mockUser1Id);

      expect(loggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('findOneMinimal', () => {
    it('should return ETP with only user relation', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneMinimal(
        'etp-123',
        mockOrganizationId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        relations: ['createdBy'],
      });
      expect(result).toEqual(mockEtp);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneMinimal('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOneMinimal('non-existent', mockOrganizationId),
      ).rejects.toThrow('ETP com ID non-existent não encontrado');
    });

    it('should throw ForbiddenException when user attempts to access ETP owned by another user', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.findOneMinimal('etp-123', mockOrganization2Id, mockUser2Id),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');

      expect(loggerSpy).toHaveBeenCalledWith(
        `Organization ${mockOrganization2Id} attempted to access ETP etp-123 from organization ${mockOrganizationId}`,
      );
    });

    it('should allow owner to access ETP', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneMinimal(
        'etp-123',
        mockOrganizationId,
        mockUser1Id,
      );

      expect(result).toEqual(mockEtp);
    });
  });

  describe('findOneWithSections', () => {
    it('should return ETP with user and sections relations', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneWithSections(
        'etp-123',
        mockOrganizationId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        relations: ['createdBy', 'sections'],
        order: {
          sections: { order: 'ASC' },
        },
      });
      expect(result).toEqual(mockEtp);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneWithSections('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user attempts to access ETP owned by another user', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.findOneWithSections(
          'etp-123',
          mockOrganization2Id,
          mockUser2Id,
        ),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');
    });

    it('should allow owner to access ETP', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneWithSections(
        'etp-123',
        mockOrganizationId,
        mockUser1Id,
      );

      expect(result).toEqual(mockEtp);
    });
  });

  describe('findOneWithVersions', () => {
    it('should return ETP with user and versions relations', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneWithVersions(
        'etp-123',
        mockOrganizationId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        relations: ['createdBy', 'versions'],
        order: {
          versions: { createdAt: 'DESC' },
        },
      });
      expect(result).toEqual(mockEtp);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneWithVersions('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user attempts to access ETP owned by another user', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.findOneWithVersions(
          'etp-123',
          mockOrganization2Id,
          mockUser2Id,
        ),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');
    });

    it('should allow owner to access ETP', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      const result = await service.findOneWithVersions(
        'etp-123',
        mockOrganizationId,
        mockUser1Id,
      );

      expect(result).toEqual(mockEtp);
    });
  });

  describe('update', () => {
    it('should update ETP when user is owner', async () => {
      const updateDto: UpdateEtpDto = {
        title: 'ETP Atualizado',
        objeto: 'Novo objeto',
      };

      mockRepository.findOne.mockResolvedValue(mockEtp);
      mockRepository.save.mockResolvedValue({ ...mockEtp, ...updateDto });

      const result = await service.update(
        'etp-123',
        updateDto,
        mockUser1Id,
        mockOrganizationId,
      );

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('ETP Atualizado');
      expect(result.objeto).toBe('Novo objeto');
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const updateDto: UpdateEtpDto = { title: 'ETP Atualizado' };

      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.update('etp-123', updateDto, mockUser2Id, mockOrganization2Id),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('etp-123', updateDto, mockUser2Id, mockOrganization2Id),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', {}, mockUser1Id, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update ETP status when user is owner', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);
      mockRepository.save.mockResolvedValue({
        ...mockEtp,
        status: EtpStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus(
        'etp-123',
        EtpStatus.IN_PROGRESS,
        mockUser1Id,
        mockOrganizationId,
      );

      expect(result.status).toBe(EtpStatus.IN_PROGRESS);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.updateStatus(
          'etp-123',
          EtpStatus.IN_PROGRESS,
          mockUser2Id,
          mockOrganization2Id,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateStatus(
          'etp-123',
          EtpStatus.IN_PROGRESS,
          mockUser2Id,
          mockOrganization2Id,
        ),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');
    });
  });

  describe('updateCompletionPercentage', () => {
    beforeEach(() => {
      // Reset queryRunner mocks for each test
      jest.clearAllMocks();
    });

    it('should use ACID transaction with pessimistic lock (Issue #1057)', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [
          { status: SectionStatus.APPROVED },
          { status: SectionStatus.PENDING },
        ],
      } as any;

      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(etpWithSections);

      await service.updateCompletionPercentage('etp-123', mockOrganizationId);

      // Verify transaction lifecycle
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // Verify pessimistic lock was used
      expect(mockQueryRunnerQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );

      // Verify commit and release
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should set completion to 0% when ETP has no sections', async () => {
      const etpWithoutSections = {
        ...mockEtp,
        sections: [],
      } as Etp;

      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(etpWithoutSections);

      await service.updateCompletionPercentage('etp-123', mockOrganizationId);

      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Etp,
        'etp-123',
        { completionPercentage: 0 },
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should calculate completion percentage based on APPROVED sections only', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [
          { status: SectionStatus.APPROVED },
          { status: SectionStatus.GENERATED },
          { status: SectionStatus.PENDING },
          { status: SectionStatus.REVIEWED },
        ],
      } as any;

      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(etpWithSections);

      await service.updateCompletionPercentage('etp-123', mockOrganizationId);

      // Only 1 APPROVED out of 4 = 25%
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Etp,
        'etp-123',
        { completionPercentage: 25 },
      );
    });

    it('should rollback and return early when ETP not found', async () => {
      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(null);

      await service.updateCompletionPercentage(
        'non-existent',
        mockOrganizationId,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunnerManager.update).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback and return early when ETP belongs to different organization (Issue #758)', async () => {
      // ETP exists but belongs to different organization - query returns null
      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(null);

      await service.updateCompletionPercentage('etp-123', mockOrganization2Id);

      expect(mockQueryRunnerQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganization2Id },
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunnerManager.update).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error and rethrow', async () => {
      const testError = new Error('Database error');
      mockQueryRunnerQueryBuilder.getOne.mockRejectedValue(testError);

      await expect(
        service.updateCompletionPercentage('etp-123', mockOrganizationId),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle concurrent updates correctly with pessimistic locking', async () => {
      // This test verifies that the implementation uses pessimistic locking
      // which prevents race conditions when multiple section updates happen simultaneously
      const etpWith4Sections = {
        ...mockEtp,
        sections: [
          { status: SectionStatus.APPROVED },
          { status: SectionStatus.APPROVED },
          { status: SectionStatus.PENDING },
          { status: SectionStatus.PENDING },
        ],
      } as any;

      mockQueryRunnerQueryBuilder.getOne.mockResolvedValue(etpWith4Sections);

      // Simulate concurrent updates with Promise.all
      await Promise.all([
        service.updateCompletionPercentage('etp-123', mockOrganizationId),
        service.updateCompletionPercentage('etp-123', mockOrganizationId),
      ]);

      // Both calls should use pessimistic_write lock
      expect(mockQueryRunnerQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(mockQueryRunnerQueryBuilder.setLock).toHaveBeenCalledTimes(2);

      // Both should commit successfully (in real DB, second would wait for first lock to release)
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(2);

      // Verify correct percentage: 2 APPROVED out of 4 = 50%
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Etp,
        'etp-123',
        { completionPercentage: 50 },
      );
    });
  });

  describe('remove', () => {
    it('should delete ETP when user is owner', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);
      mockRepository.remove.mockResolvedValue(mockEtp);

      await service.remove('etp-123', mockUser1Id, mockOrganizationId);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockEtp);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockRepository.findOne.mockResolvedValue(mockEtp);

      await expect(
        service.remove('etp-123', mockUser2Id, mockOrganization2Id),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove('etp-123', mockUser2Id, mockOrganization2Id),
      ).rejects.toThrow('Você não tem permissão para acessar este ETP');
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', mockUser1Id, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics without user filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: 'draft', count: '5' },
        { status: 'in_progress', count: '3' },
        { status: 'completed', count: '2' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: '67.5' });

      const result = await service.getStatistics(mockOrganizationId);

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({
        draft: 5,
        in_progress: 3,
        completed: 2,
      });
      expect(result.averageCompletion).toBe('67.50');
    });

    it('should filter statistics by userId when provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(5);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: 'draft', count: '3' },
        { status: 'in_progress', count: '2' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: '40.0' });

      const result = await service.getStatistics(
        mockOrganizationId,
        mockUser1Id,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(result.total).toBe(5);
    });

    it('should handle 0 average completion when no ETPs exist', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: null });

      const result = await service.getStatistics(mockOrganizationId);

      expect(result.total).toBe(0);
      expect(result.averageCompletion).toBe('0.00');
    });
  });
});
