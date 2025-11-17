import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DISCLAIMER } from '../../common/constants/messages';

describe('VersionsController', () => {
  let controller: VersionsController;
  let service: VersionsService;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockVersionId = 'version-789';

  const mockVersion = {
    id: mockVersionId,
    etpId: mockEtpId,
    versionNumber: 1,
    changeLog: 'Initial version',
    snapshot: {
      title: 'Test ETP',
      sections: [],
    },
    createdById: mockUserId,
    createdAt: new Date(),
  };

  const mockEtp = {
    id: mockEtpId,
    title: 'Restored ETP',
    description: 'Restored from version',
    status: 'draft',
  };

  const mockComparison = {
    version1: {
      id: mockVersion.id,
      versionNumber: mockVersion.versionNumber,
      createdAt: mockVersion.createdAt,
    },
    version2: {
      id: 'version-890',
      versionNumber: 2,
      createdAt: new Date(),
    },
    differences: {
      metadata: { title: { old: 'Old Title', new: 'New Title' } },
      sections: {
        added: [],
        removed: [],
        modified: [],
      },
    },
    disclaimer: DISCLAIMER,
  };

  const mockVersionsService = {
    createVersion: jest.fn(),
    getVersions: jest.fn(),
    getVersion: jest.fn(),
    compareVersions: jest.fn(),
    restoreVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        {
          provide: VersionsService,
          useValue: mockVersionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<VersionsController>(VersionsController);
    service = module.get<VersionsService>(VersionsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createVersion', () => {
    const changeLog = 'Updated justificativa section';

    it('should create a new version', async () => {
      // Arrange
      const versionWithChangeLog = { ...mockVersion, changeLog };
      mockVersionsService.createVersion.mockResolvedValue(versionWithChangeLog);

      // Act
      const result = await controller.createVersion(
        mockEtpId,
        changeLog,
        mockUserId,
      );

      // Assert
      expect(service.createVersion).toHaveBeenCalledWith(
        mockEtpId,
        changeLog,
        mockUserId,
      );
      expect(service.createVersion).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(versionWithChangeLog);
      expect(result.data.changeLog).toBe(changeLog);
      expect(result.disclaimer).toBeDefined();
    });

    it('should create version without changeLog', async () => {
      // Arrange
      const versionWithoutLog = { ...mockVersion, changeLog: undefined };
      mockVersionsService.createVersion.mockResolvedValue(versionWithoutLog);

      // Act
      const result = await controller.createVersion(
        mockEtpId,
        undefined,
        mockUserId,
      );

      // Assert
      expect(service.createVersion).toHaveBeenCalledWith(
        mockEtpId,
        undefined,
        mockUserId,
      );
      expect(result.data).toEqual(versionWithoutLog);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      // Arrange
      mockVersionsService.createVersion.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      );

      // Act & Assert
      await expect(
        controller.createVersion('invalid-id', changeLog, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockVersionsService.createVersion.mockResolvedValue(mockVersion);

      // Act
      const result = await controller.createVersion(
        mockEtpId,
        changeLog,
        mockUserId,
      );

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getVersions', () => {
    it('should return list of versions for an ETP', async () => {
      // Arrange
      const versions = [
        mockVersion,
        { ...mockVersion, id: 'version-890', versionNumber: 2 },
      ];
      mockVersionsService.getVersions.mockResolvedValue(versions);

      // Act
      const result = await controller.getVersions(mockEtpId);

      // Assert
      expect(service.getVersions).toHaveBeenCalledWith(mockEtpId);
      expect(service.getVersions).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(versions);
      expect(result.data.length).toBe(2);
      expect(result.disclaimer).toBeDefined();
    });

    it('should return empty array when ETP has no versions', async () => {
      // Arrange
      mockVersionsService.getVersions.mockResolvedValue([]);

      // Act
      const result = await controller.getVersions(mockEtpId);

      // Assert
      expect(result.data).toEqual([]);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockVersionsService.getVersions.mockResolvedValue([mockVersion]);

      // Act
      const result = await controller.getVersions(mockEtpId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('getVersion', () => {
    it('should return a specific version by ID', async () => {
      // Arrange
      mockVersionsService.getVersion.mockResolvedValue(mockVersion);

      // Act
      const result = await controller.getVersion(mockVersionId);

      // Assert
      expect(service.getVersion).toHaveBeenCalledWith(mockVersionId);
      expect(service.getVersion).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockVersion);
      expect(result.data.id).toBe(mockVersionId);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      mockVersionsService.getVersion.mockRejectedValue(
        new NotFoundException('Versão não encontrada'),
      );

      // Act & Assert
      await expect(controller.getVersion('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include disclaimer in response', async () => {
      // Arrange
      mockVersionsService.getVersion.mockResolvedValue(mockVersion);

      // Act
      const result = await controller.getVersion(mockVersionId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });

  describe('compareVersions', () => {
    const version1Id = 'version-789';
    const version2Id = 'version-890';

    it('should compare two versions', async () => {
      // Arrange
      mockVersionsService.compareVersions.mockResolvedValue(mockComparison);

      // Act
      const result = await controller.compareVersions(version1Id, version2Id);

      // Assert
      expect(service.compareVersions).toHaveBeenCalledWith(
        version1Id,
        version2Id,
      );
      expect(service.compareVersions).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockComparison);
      expect(result.differences).toBeDefined();
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      mockVersionsService.compareVersions.mockRejectedValue(
        new NotFoundException('Versão não encontrada'),
      );

      // Act & Assert
      await expect(
        controller.compareVersions('invalid-1', 'invalid-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return differences between versions', async () => {
      // Arrange
      mockVersionsService.compareVersions.mockResolvedValue(mockComparison);

      // Act
      const result = await controller.compareVersions(version1Id, version2Id);

      // Assert
      expect(result.differences).toBeDefined();
      expect(result.differences.metadata).toBeDefined();
      expect(result.differences.sections).toBeDefined();
      expect(result.differences.sections.added).toBeDefined();
      expect(result.differences.sections.removed).toBeDefined();
      expect(result.differences.sections.modified).toBeDefined();
    });
  });

  describe('restoreVersion', () => {
    it('should restore ETP to a previous version', async () => {
      // Arrange
      mockVersionsService.restoreVersion.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(service.restoreVersion).toHaveBeenCalledWith(
        mockVersionId,
        mockUserId,
      );
      expect(service.restoreVersion).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockEtp);
      expect(result.message).toBe('Versão restaurada com sucesso');
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      mockVersionsService.restoreVersion.mockRejectedValue(
        new NotFoundException('Versão não encontrada'),
      );

      // Act & Assert
      await expect(
        controller.restoreVersion('invalid-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include success message in restore response', async () => {
      // Arrange
      mockVersionsService.restoreVersion.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(result.message).toBeDefined();
      expect(result.message).toBe('Versão restaurada com sucesso');
    });

    it('should include disclaimer in restore response', async () => {
      // Arrange
      mockVersionsService.restoreVersion.mockResolvedValue(mockEtp);

      // Act
      const result = await controller.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });
  });
});
