import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
    clone: jest.fn().mockReturnThis(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtpsService,
        {
          provide: getRepositoryToken(Etp),
          useValue: mockRepository,
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
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdEtp);
      expect(result).toEqual(createdEtp);
      expect(result.status).toBe(EtpStatus.DRAFT);
      expect(result.completionPercentage).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return paginated ETPs filtered by organizationId and userId (Issue #1326)', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockEtps = [mockEtp, { ...mockEtp, id: 'etp-456' }];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockEtps, 2]);

      const result = await service.findAll(
        paginationDto,
        mockOrganizationId,
        mockUser1Id,
      );

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('etp');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'etp.createdBy',
        'user',
      );
      // SECURITY: Must filter by both organizationId AND userId
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser1Id },
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

    it('should always filter by userId to prevent data leakage (Issue #1326)', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockEtps = [mockEtp];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockEtps, 1]);

      await service.findAll(paginationDto, mockOrganizationId, mockUser1Id);

      // SECURITY (Issue #1326): userId filter is ALWAYS applied
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser1Id },
      );
    });

    it('should handle pagination correctly on page 2', async () => {
      const paginationDto: PaginationDto = { page: 2, limit: 5 };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(paginationDto, mockOrganizationId, mockUser1Id);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should not return ETPs from other users in same organization (Issue #1326)', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };

      // User 2 queries - should only get their own ETPs
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(paginationDto, mockOrganizationId, mockUser2Id);

      // SECURITY: Query must filter by user2's ID, not showing user1's ETPs
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser2Id },
      );
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
    it('should set completion to 0% when ETP has no sections', async () => {
      const etpWithoutSections = {
        ...mockEtp,
        sections: [],
      } as Etp;

      mockRepository.findOne.mockResolvedValue(etpWithoutSections);
      mockRepository.save.mockResolvedValue({
        ...etpWithoutSections,
        completionPercentage: 0,
      });

      await service.updateCompletionPercentage('etp-123', mockOrganizationId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123', organizationId: mockOrganizationId },
        relations: ['sections'],
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ completionPercentage: 0 }),
      );
    });

    it('should calculate completion percentage based on section status', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [
          { status: SectionStatus.APPROVED },
          { status: SectionStatus.GENERATED },
          { status: SectionStatus.PENDING },
          { status: SectionStatus.REVIEWED },
        ],
      } as any;

      mockRepository.findOne.mockResolvedValue(etpWithSections);
      mockRepository.save.mockResolvedValue({
        ...etpWithSections,
        completionPercentage: 75,
      });

      await service.updateCompletionPercentage('etp-123', mockOrganizationId);

      // 3 completed (approved, generated, reviewed) out of 4 = 75%
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ completionPercentage: 75 }),
      );
    });

    it('should return early when ETP not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.updateCompletionPercentage(
        'non-existent',
        mockOrganizationId,
      );

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return early when ETP belongs to different organization (Issue #758)', async () => {
      // ETP exists but belongs to different organization
      mockRepository.findOne.mockResolvedValue(null);

      await service.updateCompletionPercentage('etp-123', mockOrganization2Id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123', organizationId: mockOrganization2Id },
        relations: ['sections'],
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    // Issue #1331: Auto-sync status tests
    describe('status auto-sync (Issue #1331)', () => {
      it('should auto-transition from DRAFT to IN_PROGRESS when completion > 0%', async () => {
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.DRAFT,
          sections: [
            { status: SectionStatus.GENERATED },
            { status: SectionStatus.PENDING },
          ],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // 1 completed out of 2 = 50%, should auto-transition to IN_PROGRESS
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 50,
            status: EtpStatus.IN_PROGRESS,
          }),
        );
      });

      it('should auto-transition from DRAFT to IN_PROGRESS when completion = 100%', async () => {
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.DRAFT,
          sections: [
            { status: SectionStatus.APPROVED },
            { status: SectionStatus.GENERATED },
          ],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // 2 completed out of 2 = 100%, should auto-transition to IN_PROGRESS
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 100,
            status: EtpStatus.IN_PROGRESS,
          }),
        );
      });

      it('should NOT change status when already IN_PROGRESS and completion = 100%', async () => {
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.IN_PROGRESS,
          sections: [
            { status: SectionStatus.APPROVED },
            { status: SectionStatus.REVIEWED },
          ],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // Already IN_PROGRESS, should remain IN_PROGRESS (not auto-complete)
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 100,
            status: EtpStatus.IN_PROGRESS,
          }),
        );
      });

      it('should NOT change status when already COMPLETED', async () => {
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.COMPLETED,
          sections: [
            { status: SectionStatus.APPROVED },
            { status: SectionStatus.REVIEWED },
          ],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // Already COMPLETED, should remain COMPLETED
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 100,
            status: EtpStatus.COMPLETED,
          }),
        );
      });

      it('should NOT change status when completion = 0% (no sections completed)', async () => {
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.DRAFT,
          sections: [
            { status: SectionStatus.PENDING },
            { status: SectionStatus.GENERATING },
          ],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // 0% completion, should remain DRAFT
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 0,
            status: EtpStatus.DRAFT,
          }),
        );
      });

      it('should NOT change status when no sections exist', async () => {
        const etpWithoutSections = {
          ...mockEtp,
          status: EtpStatus.DRAFT,
          sections: [],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithoutSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        // No sections = 0% completion, should remain DRAFT
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            completionPercentage: 0,
            status: EtpStatus.DRAFT,
          }),
        );
      });

      it('should log status transition when auto-sync occurs', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'log');
        const etpWithSections = {
          ...mockEtp,
          status: EtpStatus.DRAFT,
          sections: [{ status: SectionStatus.GENERATED }],
        } as any;

        mockRepository.findOne.mockResolvedValue(etpWithSections);
        mockRepository.save.mockImplementation((etp) => Promise.resolve(etp));

        await service.updateCompletionPercentage('etp-123', mockOrganizationId);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'auto-transitioned from DRAFT to IN_PROGRESS',
          ),
        );
      });
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
    it('should return statistics filtered by organizationId and userId (Issue #1326)', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: 'draft', count: '5' },
        { status: 'in_progress', count: '3' },
        { status: 'completed', count: '2' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: '67.5' });

      const result = await service.getStatistics(
        mockOrganizationId,
        mockUser1Id,
      );

      // SECURITY (Issue #1326): Must filter by both organizationId AND userId
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser1Id },
      );
      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual({
        draft: 5,
        in_progress: 3,
        completed: 2,
      });
      expect(result.averageCompletion).toBe('67.50');
    });

    it('should always filter statistics by userId to prevent data leakage (Issue #1326)', async () => {
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

      // SECURITY (Issue #1326): userId filter is ALWAYS applied
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser1Id },
      );
      expect(result.total).toBe(5);
    });

    it('should handle 0 average completion when no ETPs exist', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: null });

      const result = await service.getStatistics(
        mockOrganizationId,
        mockUser1Id,
      );

      expect(result.total).toBe(0);
      expect(result.averageCompletion).toBe('0.00');
    });

    it('should not include ETPs from other users in statistics (Issue #1326)', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: 'draft', count: '2' },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgCompletion: '0.0' });

      // User 2 queries - should only get their own stats
      await service.getStatistics(mockOrganizationId, mockUser2Id);

      // SECURITY: Query must filter by user2's ID, not showing user1's stats
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser2Id },
      );
    });
  });

  describe('getSuccessRate (Issue #1363)', () => {
    it('should return success rate with trend for current period', async () => {
      // Mock for current period: 15 total, 10 completed
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(15) // currentTotal
        .mockResolvedValueOnce(10) // currentCompleted
        .mockResolvedValueOnce(12) // previousTotal
        .mockResolvedValueOnce(6); // previousCompleted

      const result = await service.getSuccessRate(
        mockOrganizationId,
        mockUser1Id,
        30,
      );

      // Current rate: 10/15 * 100 = 66.67%
      // Previous rate: 6/12 * 100 = 50%
      // Trend: 66.67 - 50 = +16.67 (up)
      expect(result.rate).toBeCloseTo(66.7, 1);
      expect(result.trend).toBe('up');
      expect(result.completedCount).toBe(10);
      expect(result.totalCount).toBe(15);
      expect(result.previousRate).toBeCloseTo(50, 1);
    });

    it('should return stable trend when rate difference is less than 1%', async () => {
      // Mock rates that are very close
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(100) // currentTotal
        .mockResolvedValueOnce(70) // currentCompleted (70%)
        .mockResolvedValueOnce(100) // previousTotal
        .mockResolvedValueOnce(70); // previousCompleted (70%)

      const result = await service.getSuccessRate(
        mockOrganizationId,
        mockUser1Id,
        30,
      );

      expect(result.trend).toBe('stable');
    });

    it('should return down trend when current rate is lower', async () => {
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(20) // currentTotal
        .mockResolvedValueOnce(8) // currentCompleted (40%)
        .mockResolvedValueOnce(20) // previousTotal
        .mockResolvedValueOnce(12); // previousCompleted (60%)

      const result = await service.getSuccessRate(
        mockOrganizationId,
        mockUser1Id,
        30,
      );

      expect(result.trend).toBe('down');
      expect(result.rate).toBeCloseTo(40, 1);
      expect(result.previousRate).toBeCloseTo(60, 1);
    });

    it('should return 0% rate when no ETPs exist in current period', async () => {
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(0) // currentTotal
        .mockResolvedValueOnce(0) // currentCompleted
        .mockResolvedValueOnce(5) // previousTotal
        .mockResolvedValueOnce(3); // previousCompleted

      const result = await service.getSuccessRate(
        mockOrganizationId,
        mockUser1Id,
        30,
      );

      expect(result.rate).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should filter by organizationId and userId (Issue #1326)', async () => {
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      await service.getSuccessRate(mockOrganizationId, mockUser1Id, 30);

      // SECURITY: Must filter by both organizationId AND userId
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdById = :userId',
        { userId: mockUser1Id },
      );
    });

    it('should use custom period days parameter', async () => {
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      // Use 7 days period instead of default 30
      await service.getSuccessRate(mockOrganizationId, mockUser1Id, 7);

      // Verify that andWhere was called with date filter
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.createdAt >= :periodStart',
        expect.objectContaining({
          periodStart: expect.any(Date),
        }),
      );
    });
  });
});
