/**
 * Export Cleanup Processor Tests
 *
 * Tests for automatic cleanup of old export files from S3.
 *
 * @see Issue #1706 - Retention policy and cleanup job for old exports
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ExportCleanupProcessor } from './export-cleanup.processor';
import { ExportMetadata } from './entities/export-metadata.entity';
import { S3Service } from '../storage/s3.service';
import {
  ExportCleanupJobData,
  ExportCleanupJobResult,
} from './export-cleanup.types';

describe('ExportCleanupProcessor', () => {
  let processor: ExportCleanupProcessor;
  let exportMetadataRepository: jest.Mocked<Repository<ExportMetadata>>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
    };

    const mockS3Service = {
      isConfigured: jest.fn().mockReturnValue(true),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportCleanupProcessor,
        {
          provide: getRepositoryToken(ExportMetadata),
          useValue: mockRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    processor = module.get<ExportCleanupProcessor>(ExportCleanupProcessor);
    exportMetadataRepository = module.get(getRepositoryToken(ExportMetadata));
    s3Service = module.get(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should delete old exports successfully', async () => {
      const oldExport: Partial<ExportMetadata> = {
        id: 'export-1',
        s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
        format: 'pdf',
        createdAt: new Date('2023-01-01'),
      };

      // Mock the query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([oldExport as ExportMetadata]),
      };
      exportMetadataRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: false,
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      const result: ExportCleanupJobResult = await processor.process(job);

      expect(result.deletedCount).toBe(1);
      expect(result.s3DeletedCount).toBe(1);
      expect(result.deletedIds).toEqual(['export-1']);
      expect(result.errors).toEqual([]);
      expect(s3Service.deleteFile).toHaveBeenCalledWith(oldExport.s3Key);
      expect(exportMetadataRepository.remove).toHaveBeenCalledWith(oldExport);
    });

    it('should perform dry run without deleting', async () => {
      const oldExport: Partial<ExportMetadata> = {
        id: 'export-1',
        s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
        format: 'pdf',
        createdAt: new Date('2023-01-01'),
      };

      // Mock the query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([oldExport as ExportMetadata]),
      };
      exportMetadataRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: true,
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      const result: ExportCleanupJobResult = await processor.process(job);

      expect(result.deletedCount).toBe(1);
      expect(result.s3DeletedCount).toBe(0);
      expect(result.deletedIds).toEqual(['export-1']);
      expect(result.dryRun).toBe(true);
      expect(s3Service.deleteFile).not.toHaveBeenCalled();
      expect(exportMetadataRepository.remove).not.toHaveBeenCalled();
    });

    it('should filter by organizationId when provided', async () => {
      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: false,
        organizationId: 'org-123',
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      await processor.process(job);

      expect(
        exportMetadataRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('export.organizationId = :organizationId', {
        organizationId: 'org-123',
      });
    });

    it('should handle S3 deletion errors gracefully', async () => {
      const oldExport: Partial<ExportMetadata> = {
        id: 'export-1',
        s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
        format: 'pdf',
        createdAt: new Date('2023-01-01'),
      };

      // Mock the query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([oldExport as ExportMetadata]),
      };
      exportMetadataRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      s3Service.deleteFile.mockRejectedValue(new Error('S3 access denied'));

      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: false,
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      const result: ExportCleanupJobResult = await processor.process(job);

      expect(result.deletedCount).toBe(1);
      expect(result.s3DeletedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('S3 access denied');
      // Should still delete from DB even if S3 fails
      expect(exportMetadataRepository.remove).toHaveBeenCalledWith(oldExport);
    });

    it('should return early when no old exports found', async () => {
      // Mock empty result
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      exportMetadataRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: false,
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      const result: ExportCleanupJobResult = await processor.process(job);

      expect(result.deletedCount).toBe(0);
      expect(result.s3DeletedCount).toBe(0);
      expect(result.deletedIds).toEqual([]);
      expect(s3Service.deleteFile).not.toHaveBeenCalled();
      expect(exportMetadataRepository.remove).not.toHaveBeenCalled();
    });

    it('should skip S3 deletion when S3 is not configured', async () => {
      s3Service.isConfigured.mockReturnValue(false);

      const oldExport: Partial<ExportMetadata> = {
        id: 'export-1',
        s3Key: 'exports/org/etp/1.0/pdf/2024-01-01.pdf',
        format: 'pdf',
        createdAt: new Date('2023-01-01'),
      };

      // Mock the query builder chain
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([oldExport as ExportMetadata]),
      };
      exportMetadataRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const jobData: ExportCleanupJobData = {
        retentionDays: 90,
        dryRun: false,
      };

      const job = {
        id: 'job-1',
        data: jobData,
      } as Job<ExportCleanupJobData>;

      const result: ExportCleanupJobResult = await processor.process(job);

      expect(result.deletedCount).toBe(1);
      expect(result.s3DeletedCount).toBe(0);
      expect(s3Service.deleteFile).not.toHaveBeenCalled();
      expect(exportMetadataRepository.remove).toHaveBeenCalledWith(oldExport);
    });
  });
});
