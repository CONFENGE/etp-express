import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VersionsService } from './versions.service';
import { EtpVersion } from '../../entities/etp-version.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../entities/etp-section.entity';
import { DISCLAIMER } from '../../common/constants/messages';

describe('VersionsService', () => {
  let service: VersionsService;
  let versionsRepository: jest.Mocked<Repository<EtpVersion>>;
  let etpsRepository: jest.Mocked<Repository<Etp>>;
  let sectionsRepository: jest.Mocked<Repository<EtpSection>>;

  // Mock data
  const mockEtpId = 'etp-123';
  const mockVersionId = 'version-123';
  const mockUserId = 'user-123';

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    title: 'Teste ETP',
    description: 'Descrição de teste',
    objeto: 'Objeto de teste',
    status: EtpStatus.DRAFT,
    currentVersion: 1,
    metadata: { key: 'value' },
    sections: [
      {
        id: 'section-1',
        type: SectionType.INTRODUCAO,
        title: 'Introdução',
        content: 'Conteúdo introdutório',
        status: SectionStatus.GENERATED,
        order: 1,
        metadata: {},
        validationResults: null,
        userInput: '',
        systemPrompt: '',
        isRequired: true,
      } as unknown as EtpSection,
      {
        id: 'section-2',
        type: SectionType.JUSTIFICATIVA,
        title: 'Objetivos',
        content: 'Objetivos do projeto',
        status: SectionStatus.GENERATED,
        order: 2,
        metadata: {},
        validationResults: null,
        userInput: '',
        systemPrompt: '',
        isRequired: true,
      } as unknown as EtpSection,
    ],
    createdBy: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    } as any,
  };

  const mockVersion: Partial<EtpVersion> = {
    id: mockVersionId,
    versionNumber: 1,
    etpId: mockEtpId,
    changeLog: 'Versão inicial',
    createdByName: 'Test User',
    snapshot: {
      title: 'Teste ETP',
      description: 'Descrição de teste',
      objeto: 'Objeto de teste',
      status: 'draft',
      sections: [
        {
          id: 'section-1',
          type: 'introducao',
          title: 'Introdução',
          content: 'Conteúdo introdutório',
          status: 'generated',
          order: 1,
          metadata: {},
          validationResults: null,
        },
        {
          id: 'section-2',
          type: 'justificativa',
          title: 'Objetivos',
          content: 'Objetivos do projeto',
          status: 'generated',
          order: 2,
          metadata: {},
          validationResults: null,
        },
      ],
      metadata: { key: 'value' },
    },
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        {
          provide: getRepositoryToken(EtpVersion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    versionsRepository = module.get(getRepositoryToken(EtpVersion));
    etpsRepository = module.get(getRepositoryToken(Etp));
    sectionsRepository = module.get(getRepositoryToken(EtpSection));

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      // Arrange
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.findOne.mockResolvedValue(null); // No previous versions
      versionsRepository.create.mockReturnValue(mockVersion as EtpVersion);
      versionsRepository.save.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      const result = await service.createVersion(mockEtpId, 'Test changelog');

      // Assert
      expect(etpsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        relations: ['sections', 'createdBy'],
      });
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          etpId: mockEtpId,
          versionNumber: 1,
          changeLog: 'Test changelog',
          createdByName: 'Test User',
          snapshot: expect.objectContaining({
            title: mockEtp.title,
            description: mockEtp.description,
            objeto: mockEtp.objeto,
            status: mockEtp.status,
            sections: expect.any(Array),
          }),
        }),
      );
      expect(versionsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockVersion);
    });

    it('should create version with incremented version number', async () => {
      // Arrange
      const existingVersion = { ...mockVersion, versionNumber: 2 };
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.findOne.mockResolvedValue(
        existingVersion as EtpVersion,
      );
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 3,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 3,
      } as EtpVersion);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      const result = await service.createVersion(mockEtpId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 3,
        }),
      );
      expect(result.versionNumber).toBe(3);
    });

    it('should use default changelog if not provided', async () => {
      // Arrange
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(mockVersion as EtpVersion);
      versionsRepository.save.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.createVersion(mockEtpId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeLog: 'Snapshot automático',
        }),
      );
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      etpsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createVersion(mockEtpId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createVersion(mockEtpId)).rejects.toThrow(
        `ETP ${mockEtpId} não encontrado`,
      );
    });

    it('should update ETP current version after creating version', async () => {
      // Arrange
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(mockVersion as EtpVersion);
      versionsRepository.save.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.createVersion(mockEtpId);

      // Assert
      expect(etpsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentVersion: 1,
        }),
      );
    });

    it('should create snapshot with all ETP sections', async () => {
      // Arrange
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(mockVersion as EtpVersion);
      versionsRepository.save.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.createVersion(mockEtpId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({
                id: 'section-1',
                type: 'introducao',
                title: 'Introdução',
              }),
              expect.objectContaining({
                id: 'section-2',
                type: 'justificativa',
                title: 'Objetivos',
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getVersions', () => {
    it('should return all versions for an ETP ordered by version number descending', async () => {
      // Arrange
      const mockVersions = [
        { ...mockVersion, versionNumber: 2 },
        { ...mockVersion, versionNumber: 1 },
      ] as EtpVersion[];
      versionsRepository.find.mockResolvedValue(mockVersions);

      // Act
      const result = await service.getVersions(mockEtpId);

      // Assert
      expect(versionsRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId },
        order: { versionNumber: 'DESC' },
      });
      expect(result).toEqual(mockVersions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no versions exist', async () => {
      // Arrange
      versionsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getVersions(mockEtpId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getVersion', () => {
    it('should return a specific version by ID', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(mockVersion as EtpVersion);

      // Act
      const result = await service.getVersion(mockVersionId);

      // Assert
      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockVersionId },
      });
      expect(result).toEqual(mockVersion);
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getVersion(mockVersionId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getVersion(mockVersionId)).rejects.toThrow(
        `Versão ${mockVersionId} não encontrada`,
      );
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and return differences', async () => {
      // Arrange
      const version1 = { ...mockVersion, versionNumber: 1 } as EtpVersion;
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        versionNumber: 2,
        snapshot: {
          ...mockVersion.snapshot,
          title: 'Teste ETP Modificado',
          status: 'in_progress',
        },
      } as EtpVersion;

      versionsRepository.findOne
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
      );

      // Assert
      expect(result).toHaveProperty('version1');
      expect(result).toHaveProperty('version2');
      expect(result).toHaveProperty('differences');
      expect(result.version1.versionNumber).toBe(1);
      expect(result.version2.versionNumber).toBe(2);
      expect(result.differences.metadata).toHaveProperty('title');
      expect(result.differences.metadata.title).toEqual({
        old: 'Teste ETP',
        new: 'Teste ETP Modificado',
      });
      expect(result.differences.metadata).toHaveProperty('status');
    });

    it('should detect added sections', async () => {
      // Arrange
      const version1 = { ...mockVersion } as EtpVersion;
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        snapshot: {
          ...mockVersion.snapshot!,
          sections: [
            ...mockVersion.snapshot!.sections,
            {
              id: 'section-3',
              type: 'estimativa_valor',
              title: 'Orçamento',
              content: 'Detalhes orçamentários',
              status: 'generated',
              order: 3,
              metadata: {},
              validationResults: null,
            },
          ],
        },
      } as EtpVersion;

      versionsRepository.findOne
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
      );

      // Assert
      expect(result.differences.sections.added).toHaveLength(1);
      expect(result.differences.sections.added[0]).toEqual({
        id: 'section-3',
        type: 'estimativa_valor',
        title: 'Orçamento',
      });
    });

    it('should detect removed sections', async () => {
      // Arrange
      const version1 = { ...mockVersion } as EtpVersion;
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        snapshot: {
          ...mockVersion.snapshot!,
          sections: [mockVersion.snapshot!.sections[0]], // Only first section
        },
      } as EtpVersion;

      versionsRepository.findOne
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
      );

      // Assert
      expect(result.differences.sections.removed).toHaveLength(1);
      expect(result.differences.sections.removed[0]).toEqual({
        id: 'section-2',
        type: 'justificativa',
        title: 'Objetivos',
      });
    });

    it('should detect modified sections', async () => {
      // Arrange
      const version1 = { ...mockVersion } as EtpVersion;
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        snapshot: {
          ...mockVersion.snapshot!,
          sections: [
            {
              ...(mockVersion.snapshot!.sections[0] as any),
              title: 'Introdução Modificada',
              status: 'approved',
            },
            mockVersion.snapshot!.sections[1],
          ],
        },
      } as EtpVersion;

      versionsRepository.findOne
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
      );

      // Assert
      expect(result.differences.sections.modified).toHaveLength(1);
      expect(result.differences.sections.modified[0]).toMatchObject({
        id: 'section-1',
        type: 'introducao',
        changes: {
          title: {
            old: 'Introdução',
            new: 'Introdução Modificada',
          },
          status: {
            old: 'generated',
            new: 'approved',
          },
        },
      });
    });

    it('should include disclaimer in comparison result', async () => {
      // Arrange
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion as EtpVersion)
        .mockResolvedValueOnce(mockVersion as EtpVersion);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        mockVersionId,
      );

      // Assert
      expect(result.disclaimer).toBe(DISCLAIMER);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a version successfully', async () => {
      // Arrange
      const versionToRestore = { ...mockVersion } as EtpVersion;
      const currentEtp = {
        ...mockEtp,
        title: 'Título Atual',
        status: EtpStatus.IN_PROGRESS,
      } as Etp;

      versionsRepository.findOne.mockResolvedValue(versionToRestore);
      etpsRepository.findOne.mockResolvedValue(currentEtp);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      sectionsRepository.delete.mockResolvedValue({ affected: 2 } as any);
      sectionsRepository.create.mockImplementation(
        (data) => data as EtpSection,
      );
      sectionsRepository.save.mockResolvedValue([] as any);
      etpsRepository.save.mockResolvedValue({
        ...mockEtp,
        title: versionToRestore.snapshot.title,
      } as Etp);

      // Act
      const result = await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(versionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockVersionId },
      });
      expect(etpsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        relations: ['sections'],
      });
      expect(result.title).toBe(versionToRestore.snapshot.title);
    });

    it('should create backup before restoring', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      sectionsRepository.delete.mockResolvedValue({ affected: 2 } as any);
      sectionsRepository.create.mockImplementation(
        (data) => data as EtpSection,
      );
      sectionsRepository.save.mockResolvedValue([] as any);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      // Verify that createVersion was called (backup creation)
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeLog: expect.stringContaining('Backup antes de restaurar'),
        }),
      );
    });

    it('should delete current sections before restoring', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      sectionsRepository.delete.mockResolvedValue({ affected: 2 } as any);
      sectionsRepository.create.mockImplementation(
        (data) => data as EtpSection,
      );
      sectionsRepository.save.mockResolvedValue([] as any);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(sectionsRepository.delete).toHaveBeenCalledWith({
        etpId: mockEtpId,
      });
    });

    it('should restore sections from snapshot', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      sectionsRepository.delete.mockResolvedValue({ affected: 2 } as any);
      sectionsRepository.create.mockImplementation(
        (data) => data as EtpSection,
      );
      sectionsRepository.save.mockResolvedValue([] as any);
      etpsRepository.save.mockResolvedValue(mockEtp as Etp);

      // Act
      await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(sectionsRepository.create).toHaveBeenCalledTimes(2);
      expect(sectionsRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            etpId: mockEtpId,
            type: SectionType.INTRODUCAO,
            title: 'Introdução',
          }),
          expect.objectContaining({
            etpId: mockEtpId,
            type: SectionType.JUSTIFICATIVA,
            title: 'Objetivos',
          }),
        ]),
      );
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when ETP not found during restore', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(mockVersion as EtpVersion);
      etpsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(`ETP ${mockEtpId} não encontrado`);
    });

    it('should restore all ETP metadata fields', async () => {
      // Arrange
      const modifiedSnapshot = {
        ...mockVersion.snapshot,
        title: 'Restored Title',
        description: 'Restored Description',
        objeto: 'Restored Object',
        metadata: { restored: true },
      };

      versionsRepository.findOne.mockResolvedValue({
        ...mockVersion,
        snapshot: modifiedSnapshot,
      } as EtpVersion);
      etpsRepository.findOne.mockResolvedValue(mockEtp as Etp);
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as EtpVersion);
      sectionsRepository.delete.mockResolvedValue({ affected: 2 } as any);
      sectionsRepository.create.mockImplementation(
        (data) => data as EtpSection,
      );
      sectionsRepository.save.mockResolvedValue([] as any);
      etpsRepository.save.mockResolvedValue({
        ...mockEtp,
        title: 'Restored Title',
        description: 'Restored Description',
        objeto: 'Restored Object',
        metadata: { restored: true },
      } as Etp);

      // Act
      const result = await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(etpsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Restored Title',
          description: 'Restored Description',
          objeto: 'Restored Object',
          metadata: { restored: true },
        }),
      );
      expect(result.title).toBe('Restored Title');
    });
  });
});
