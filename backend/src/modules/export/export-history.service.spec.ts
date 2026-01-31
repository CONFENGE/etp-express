/**
 * Export Service Tests - Export History
 *
 * Tests for export history API endpoint with pagination and filtering.
 *
 * @see Issue #1707 - API endpoint to list export history for an ETP
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ExportService } from './export.service';
import { ExportMetadata } from './entities/export-metadata.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { S3Service } from '../storage/s3.service';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Mock fs and child_process for Chromium detection (required for ExportService initialization)
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  accessSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.requireActual('fs').readFileSync,
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('ExportService - getExportHistory', () => {
  let service: ExportService;
  let exportMetadataRepository: jest.Mocked<Repository<ExportMetadata>>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    // Setup default fs mocks for service initialization
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('templates') || path.includes('.hbs')) {
        return jest.requireActual('fs').existsSync(path);
      }
      return false;
    });
    (fs.accessSync as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (execSync as jest.Mock).mockReturnValue('');

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const mockRepository = {
      ...mockQueryBuilder,
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockS3Service = {
      isConfigured: jest.fn().mockReturnValue(true),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/signed-url'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(ExportMetadata),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {},
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    exportMetadataRepository = module.get(getRepositoryToken(ExportMetadata));
    s3Service = module.get(S3Service);

    // Reset the mocks after service initialization
    jest.clearAllMocks();
  });

  describe('getExportHistory', () => {
    it('should return paginated export history', async () => {
      const mockExports: Partial<ExportMetadata>[] = [
        {
          id: 'export-1',
          etpId: 'etp-123',
          format: 'pdf',
          s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'export-2',
          etpId: 'etp-123',
          format: 'docx',
          s3Key: 'exports/org/etp/1.0/docx/2024-01-02.docx',
          createdAt: new Date('2024-01-02'),
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockExports),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      const result = await service.getExportHistory('etp-123', 'org-123', 1, 10);

      expect(result.exports).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.exports[0].downloadUrl).toBe(
        'https://s3.example.com/signed-url',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'export.etpId = :etpId',
        {
          etpId: 'etp-123',
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'etp.organizationId = :organizationId',
        { organizationId: 'org-123' },
      );
    });

    it('should filter by format when provided', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      await service.getExportHistory('etp-123', 'org-123', 1, 10, 'pdf');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'export.format = :format',
        { format: 'pdf' },
      );
    });

    it('should handle pagination correctly', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(25),
        getMany: jest.fn().mockResolvedValue([]),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      const result = await service.getExportHistory('etp-123', 'org-123', 2, 10);

      expect(result.totalPages).toBe(3);
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should enforce maximum limit of 100', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      const result = await service.getExportHistory(
        'etp-123',
        'org-123',
        1,
        200, // Request more than max
      );

      expect(result.limit).toBe(100);
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should not include download URLs when S3 is not configured', async () => {
      s3Service.isConfigured.mockReturnValue(false);

      const mockExports: Partial<ExportMetadata>[] = [
        {
          id: 'export-1',
          etpId: 'etp-123',
          format: 'pdf',
          s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
          createdAt: new Date('2024-01-01'),
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(mockExports),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      const result = await service.getExportHistory('etp-123', 'org-123', 1, 10);

      expect(result.exports[0].downloadUrl).toBeUndefined();
      expect(s3Service.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should handle signed URL generation errors gracefully', async () => {
      s3Service.getSignedUrl.mockRejectedValue(new Error('S3 access denied'));

      const mockExports: Partial<ExportMetadata>[] = [
        {
          id: 'export-1',
          etpId: 'etp-123',
          format: 'pdf',
          s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
          createdAt: new Date('2024-01-01'),
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(mockExports),
      };

      exportMetadataRepository.createQueryBuilder = jest.fn(
        () => queryBuilder as any,
      );

      const result = await service.getExportHistory('etp-123', 'org-123', 1, 10);

      // Should still return the export without download URL
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].downloadUrl).toBeUndefined();
    });
  });
});
