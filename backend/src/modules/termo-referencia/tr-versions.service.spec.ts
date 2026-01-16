import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrVersionsService } from './tr-versions.service';
import { TermoReferenciaVersion } from '../../entities/termo-referencia-version.entity';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { DISCLAIMER } from '../../common/constants/messages';

describe('TrVersionsService', () => {
  let service: TrVersionsService;
  let versionsRepository: jest.Mocked<Repository<TermoReferenciaVersion>>;
  let trRepository: jest.Mocked<Repository<TermoReferencia>>;

  // Mock data
  const mockTrId = 'tr-123';
  const mockVersionId = 'version-123';
  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';

  const mockTr: Partial<TermoReferencia> = {
    id: mockTrId,
    objeto: 'Objeto de teste',
    fundamentacaoLegal: 'Lei 14.133/2021',
    descricaoSolucao: 'Descricao da solucao',
    requisitosContratacao: 'Requisitos',
    modeloExecucao: 'Modelo de execucao',
    modeloGestao: 'Modelo de gestao',
    criteriosSelecao: 'Criterios',
    valorEstimado: 100000,
    dotacaoOrcamentaria: 'Dotacao',
    prazoVigencia: 12,
    obrigacoesContratante: 'Obrigacoes do contratante',
    obrigacoesContratada: 'Obrigacoes da contratada',
    sancoesPenalidades: 'Sancoes',
    cronograma: { fase1: 'Janeiro' },
    especificacoesTecnicas: { item1: 'Especificacao' },
    localExecucao: 'Brasilia-DF',
    garantiaContratual: '5%',
    condicoesPagamento: 'Mensal',
    subcontratacao: 'Nao permitida',
    status: TermoReferenciaStatus.DRAFT,
    currentVersion: 1,
    organizationId: mockOrgId,
    createdBy: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    } as any,
  };

  const mockSnapshot = {
    objeto: 'Objeto de teste',
    fundamentacaoLegal: 'Lei 14.133/2021',
    descricaoSolucao: 'Descricao da solucao',
    requisitosContratacao: 'Requisitos',
    modeloExecucao: 'Modelo de execucao',
    modeloGestao: 'Modelo de gestao',
    criteriosSelecao: 'Criterios',
    valorEstimado: 100000,
    dotacaoOrcamentaria: 'Dotacao',
    prazoVigencia: 12,
    obrigacoesContratante: 'Obrigacoes do contratante',
    obrigacoesContratada: 'Obrigacoes da contratada',
    sancoesPenalidades: 'Sancoes',
    cronograma: { fase1: 'Janeiro' },
    especificacoesTecnicas: { item1: 'Especificacao' },
    localExecucao: 'Brasilia-DF',
    garantiaContratual: '5%',
    condicoesPagamento: 'Mensal',
    subcontratacao: 'Nao permitida',
    status: 'draft',
  };

  const mockVersion: Partial<TermoReferenciaVersion> = {
    id: mockVersionId,
    versionNumber: 1,
    termoReferenciaId: mockTrId,
    changeLog: 'Versao inicial',
    createdByName: 'Test User',
    snapshot: mockSnapshot,
    createdAt: new Date('2024-01-01'),
    termoReferencia: { organizationId: mockOrgId } as TermoReferencia,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrVersionsService,
        {
          provide: getRepositoryToken(TermoReferenciaVersion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrVersionsService>(TrVersionsService);
    versionsRepository = module.get(getRepositoryToken(TermoReferenciaVersion));
    trRepository = module.get(getRepositoryToken(TermoReferencia));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVersion', () => {
    it('should create a new version successfully', async () => {
      // Arrange
      trRepository.findOne.mockResolvedValue(mockTr as TermoReferencia);
      versionsRepository.findOne.mockResolvedValue(null); // No previous versions
      versionsRepository.create.mockReturnValue(
        mockVersion as TermoReferenciaVersion,
      );
      versionsRepository.save.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      const result = await service.createVersion(mockTrId, 'Test changelog');

      // Assert
      expect(trRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTrId },
        relations: ['createdBy'],
      });
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          termoReferenciaId: mockTrId,
          versionNumber: 1,
          changeLog: 'Test changelog',
          createdByName: 'Test User',
          snapshot: expect.objectContaining({
            objeto: mockTr.objeto,
            fundamentacaoLegal: mockTr.fundamentacaoLegal,
            status: mockTr.status,
          }),
        }),
      );
      expect(versionsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockVersion);
    });

    it('should create version with incremented version number', async () => {
      // Arrange
      const existingVersion = { ...mockVersion, versionNumber: 2 };
      trRepository.findOne.mockResolvedValue(mockTr as TermoReferencia);
      versionsRepository.findOne.mockResolvedValue(
        existingVersion as TermoReferenciaVersion,
      );
      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 3,
      } as TermoReferenciaVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 3,
      } as TermoReferenciaVersion);
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      const result = await service.createVersion(mockTrId);

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
      trRepository.findOne.mockResolvedValue(mockTr as TermoReferencia);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(
        mockVersion as TermoReferenciaVersion,
      );
      versionsRepository.save.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      await service.createVersion(mockTrId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeLog: 'Snapshot automatico',
        }),
      );
    });

    it('should throw NotFoundException when TR not found', async () => {
      // Arrange
      trRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createVersion(mockTrId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createVersion(mockTrId)).rejects.toThrow(
        `Termo de Referencia ${mockTrId} nao encontrado`,
      );
    });

    it('should update TR current version after creating version', async () => {
      // Arrange
      trRepository.findOne.mockResolvedValue(mockTr as TermoReferencia);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(
        mockVersion as TermoReferenciaVersion,
      );
      versionsRepository.save.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      await service.createVersion(mockTrId);

      // Assert
      expect(trRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentVersion: 1,
        }),
      );
    });

    it('should create snapshot with all TR fields', async () => {
      // Arrange
      trRepository.findOne.mockResolvedValue(mockTr as TermoReferencia);
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(
        mockVersion as TermoReferenciaVersion,
      );
      versionsRepository.save.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      await service.createVersion(mockTrId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: expect.objectContaining({
            objeto: mockTr.objeto,
            fundamentacaoLegal: mockTr.fundamentacaoLegal,
            descricaoSolucao: mockTr.descricaoSolucao,
            requisitosContratacao: mockTr.requisitosContratacao,
            modeloExecucao: mockTr.modeloExecucao,
            modeloGestao: mockTr.modeloGestao,
            criteriosSelecao: mockTr.criteriosSelecao,
            valorEstimado: mockTr.valorEstimado,
            dotacaoOrcamentaria: mockTr.dotacaoOrcamentaria,
            prazoVigencia: mockTr.prazoVigencia,
            obrigacoesContratante: mockTr.obrigacoesContratante,
            obrigacoesContratada: mockTr.obrigacoesContratada,
            sancoesPenalidades: mockTr.sancoesPenalidades,
            cronograma: mockTr.cronograma,
            especificacoesTecnicas: mockTr.especificacoesTecnicas,
            localExecucao: mockTr.localExecucao,
            garantiaContratual: mockTr.garantiaContratual,
            condicoesPagamento: mockTr.condicoesPagamento,
            subcontratacao: mockTr.subcontratacao,
            status: mockTr.status,
          }),
        }),
      );
    });

    it('should use Sistema as author when createdBy is null', async () => {
      // Arrange
      const trWithoutCreator = { ...mockTr, createdBy: null };
      trRepository.findOne.mockResolvedValue(
        trWithoutCreator as unknown as TermoReferencia,
      );
      versionsRepository.findOne.mockResolvedValue(null);
      versionsRepository.create.mockReturnValue(
        mockVersion as TermoReferenciaVersion,
      );
      versionsRepository.save.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      await service.createVersion(mockTrId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByName: 'Sistema',
        }),
      );
    });
  });

  describe('getVersions', () => {
    it('should return all versions for a TR ordered by version number descending', async () => {
      // Arrange
      const mockVersions = [
        { ...mockVersion, versionNumber: 2 },
        { ...mockVersion, versionNumber: 1 },
      ] as TermoReferenciaVersion[];
      versionsRepository.find.mockResolvedValue(mockVersions);

      // Act
      const result = await service.getVersions(mockTrId);

      // Assert
      expect(versionsRepository.find).toHaveBeenCalledWith({
        where: { termoReferenciaId: mockTrId },
        order: { versionNumber: 'DESC' },
      });
      expect(result).toEqual(mockVersions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no versions exist', async () => {
      // Arrange
      versionsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getVersions(mockTrId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getVersion', () => {
    it('should return a specific version by ID', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );

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
        `Versao ${mockVersionId} nao encontrada`,
      );
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and return differences', async () => {
      // Arrange
      const version1 = { ...mockVersion, versionNumber: 1 };
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        versionNumber: 2,
        snapshot: {
          ...mockSnapshot,
          objeto: 'Objeto modificado',
          valorEstimado: 200000,
        },
        termoReferencia: { organizationId: mockOrgId } as TermoReferencia,
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(version1 as TermoReferenciaVersion)
        .mockResolvedValueOnce(version2 as TermoReferenciaVersion);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
        mockOrgId,
      );

      // Assert
      expect(result).toHaveProperty('version1');
      expect(result).toHaveProperty('version2');
      expect(result).toHaveProperty('differences');
      expect(result.version1.versionNumber).toBe(1);
      expect(result.version2.versionNumber).toBe(2);
      expect(result.differences).toHaveProperty('objeto');
      expect(result.differences.objeto).toEqual({
        old: 'Objeto de teste',
        new: 'Objeto modificado',
      });
      expect(result.differences).toHaveProperty('valorEstimado');
      expect(result.differences.valorEstimado).toEqual({
        old: 100000,
        new: 200000,
      });
    });

    it('should return empty differences when versions are identical', async () => {
      // Arrange
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion)
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        mockVersionId,
        mockOrgId,
      );

      // Assert
      expect(Object.keys(result.differences)).toHaveLength(0);
    });

    it('should detect JSONB field differences (cronograma)', async () => {
      // Arrange
      const version1 = { ...mockVersion };
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        snapshot: {
          ...mockSnapshot,
          cronograma: { fase1: 'Fevereiro', fase2: 'Marco' },
        },
        termoReferencia: { organizationId: mockOrgId } as TermoReferencia,
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(version1 as TermoReferenciaVersion)
        .mockResolvedValueOnce(version2 as TermoReferenciaVersion);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        'version-456',
        mockOrgId,
      );

      // Assert
      expect(result.differences).toHaveProperty('cronograma');
      expect(result.differences.cronograma).toEqual({
        old: { fase1: 'Janeiro' },
        new: { fase1: 'Fevereiro', fase2: 'Marco' },
      });
    });

    it('should include disclaimer in comparison result', async () => {
      // Arrange
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion)
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion);

      // Act
      const result = await service.compareVersions(
        mockVersionId,
        mockVersionId,
        mockOrgId,
      );

      // Assert
      expect(result.disclaimer).toBe(DISCLAIMER);
    });

    it('should throw NotFoundException when version1 not found', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.compareVersions(mockVersionId, 'version-456', mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when version2 not found', async () => {
      // Arrange
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion)
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.compareVersions(mockVersionId, 'version-456', mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for IDOR attempt on version2', async () => {
      // Arrange
      const version1 = { ...mockVersion };
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        termoReferencia: {
          organizationId: 'different-org-id',
        } as TermoReferencia,
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(version1 as TermoReferenciaVersion)
        .mockResolvedValueOnce(version2 as TermoReferenciaVersion);

      // Act & Assert
      await expect(
        service.compareVersions(mockVersionId, 'version-456', mockOrgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with correct message for IDOR attempt', async () => {
      // Arrange
      const version1 = { ...mockVersion };
      const version2 = {
        ...mockVersion,
        id: 'version-456',
        termoReferencia: {
          organizationId: 'different-org-id',
        } as TermoReferencia,
      };

      versionsRepository.findOne
        .mockResolvedValueOnce(version1 as TermoReferenciaVersion)
        .mockResolvedValueOnce(version2 as TermoReferenciaVersion);

      // Act & Assert
      await expect(
        service.compareVersions(mockVersionId, 'version-456', mockOrgId),
      ).rejects.toThrow('Voce nao tem permissao para acessar esta versao');
    });
  });

  describe('restoreVersion', () => {
    it('should restore a version successfully', async () => {
      // Arrange
      const versionToRestore = { ...mockVersion };
      const currentTr = {
        ...mockTr,
        objeto: 'Objeto Atual',
        valorEstimado: 150000,
      };

      // First call for getVersion, second for createVersion backup
      versionsRepository.findOne
        .mockResolvedValueOnce(versionToRestore as TermoReferenciaVersion)
        .mockResolvedValueOnce(null); // No previous version for backup

      trRepository.findOne
        .mockResolvedValueOnce(currentTr as TermoReferencia) // For restoreVersion
        .mockResolvedValueOnce(currentTr as TermoReferencia); // For createVersion backup

      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);
      trRepository.save.mockResolvedValue({
        ...mockTr,
        objeto: versionToRestore.snapshot!.objeto,
      } as TermoReferencia);

      // Act
      const result = await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(result.objeto).toBe(versionToRestore.snapshot!.objeto);
    });

    it('should create backup before restoring', async () => {
      // Arrange
      versionsRepository.findOne
        .mockResolvedValueOnce(mockVersion as TermoReferenciaVersion)
        .mockResolvedValueOnce(null);

      trRepository.findOne
        .mockResolvedValueOnce(mockTr as TermoReferencia)
        .mockResolvedValueOnce(mockTr as TermoReferencia);

      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);
      trRepository.save.mockResolvedValue(mockTr as TermoReferencia);

      // Act
      await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(versionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeLog: expect.stringContaining('Backup antes de restaurar'),
        }),
      );
    });

    it('should restore all TR fields from snapshot', async () => {
      // Arrange
      const modifiedSnapshot = {
        ...mockSnapshot,
        objeto: 'Restored Object',
        valorEstimado: 250000,
        localExecucao: 'Sao Paulo-SP',
      };

      versionsRepository.findOne
        .mockResolvedValueOnce({
          ...mockVersion,
          snapshot: modifiedSnapshot,
        } as TermoReferenciaVersion)
        .mockResolvedValueOnce(null);

      trRepository.findOne
        .mockResolvedValueOnce(mockTr as TermoReferencia)
        .mockResolvedValueOnce(mockTr as TermoReferencia);

      versionsRepository.create.mockReturnValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);
      versionsRepository.save.mockResolvedValue({
        ...mockVersion,
        versionNumber: 2,
      } as TermoReferenciaVersion);

      const savedTr = {
        ...mockTr,
        objeto: 'Restored Object',
        valorEstimado: 250000,
        localExecucao: 'Sao Paulo-SP',
      };
      trRepository.save.mockResolvedValue(savedTr as TermoReferencia);

      // Act
      const result = await service.restoreVersion(mockVersionId, mockUserId);

      // Assert
      expect(trRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          objeto: 'Restored Object',
          valorEstimado: 250000,
          localExecucao: 'Sao Paulo-SP',
        }),
      );
      expect(result.objeto).toBe('Restored Object');
    });

    it('should throw NotFoundException when version not found', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when TR not found during restore', async () => {
      // Arrange
      versionsRepository.findOne.mockResolvedValue(
        mockVersion as TermoReferenciaVersion,
      );
      trRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.restoreVersion(mockVersionId, mockUserId),
      ).rejects.toThrow(
        `Termo de Referencia ${mockTrId} nao encontrado`,
      );
    });
  });
});
