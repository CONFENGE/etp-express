import { Test, TestingModule } from '@nestjs/testing';
import { DocumentExtractionService } from './document-extraction.service';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { UPLOAD_DIR } from './multer.config';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('DocumentExtractionService', () => {
  let service: DocumentExtractionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentExtractionService],
    }).compile();

    service = module.get<DocumentExtractionService>(DocumentExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create upload directory if it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      service.onModuleInit();

      expect(mkdirSync).toHaveBeenCalledWith(UPLOAD_DIR, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      service.onModuleInit();

      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getFilePath', () => {
    it('should return full path for filename', () => {
      const filename = 'test-file.pdf';
      const result = service.getFilePath(filename);

      expect(result).toBe(join(UPLOAD_DIR, filename));
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = service.fileExists('test.pdf');

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(join(UPLOAD_DIR, 'test.pdf'));
    });

    it('should return false if file does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = service.fileExists('nonexistent.pdf');

      expect(result).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete file and return true', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = service.deleteFile('test.pdf');

      expect(result).toBe(true);
      expect(unlinkSync).toHaveBeenCalledWith(join(UPLOAD_DIR, 'test.pdf'));
    });

    it('should return false if file does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = service.deleteFile('nonexistent.pdf');

      expect(result).toBe(false);
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should return false if deletion fails', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = service.deleteFile('test.pdf');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOldFiles', () => {
    const { readdirSync } = jest.requireMock('fs');

    beforeEach(() => {
      (existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should skip cleanup if upload directory does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await service.cleanupOldFiles();

      expect(readdirSync).not.toHaveBeenCalled();
    });

    it('should delete files older than 1 hour', async () => {
      const oldFileTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const recentFileTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago

      readdirSync.mockReturnValue(['old-file.pdf', 'recent-file.pdf']);
      (statSync as jest.Mock)
        .mockReturnValueOnce({ mtimeMs: oldFileTime })
        .mockReturnValueOnce({ mtimeMs: recentFileTime });

      await service.cleanupOldFiles();

      // Only old file should be deleted
      expect(unlinkSync).toHaveBeenCalledTimes(1);
      expect(unlinkSync).toHaveBeenCalledWith(join(UPLOAD_DIR, 'old-file.pdf'));
    });

    it('should not delete recent files', async () => {
      const recentFileTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago

      readdirSync.mockReturnValue(['recent-file.pdf']);
      (statSync as jest.Mock).mockReturnValue({ mtimeMs: recentFileTime });

      await service.cleanupOldFiles();

      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during cleanup', async () => {
      readdirSync.mockReturnValue(['error-file.pdf']);
      (statSync as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot read file');
      });

      // Should not throw
      await expect(service.cleanupOldFiles()).resolves.toBeUndefined();
    });
  });

  describe('getUploadStats', () => {
    const { readdirSync } = jest.requireMock('fs');

    it('should return zero stats if directory does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = service.getUploadStats();

      expect(result).toEqual({ fileCount: 0, totalSizeBytes: 0 });
    });

    it('should return correct file count and total size', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      readdirSync.mockReturnValue(['file1.pdf', 'file2.docx']);
      (statSync as jest.Mock)
        .mockReturnValueOnce({ size: 1000 })
        .mockReturnValueOnce({ size: 2000 });

      const result = service.getUploadStats();

      expect(result).toEqual({
        fileCount: 2,
        totalSizeBytes: 3000,
      });
    });

    it('should handle stat errors gracefully', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      readdirSync.mockReturnValue(['file1.pdf', 'corrupted.pdf']);
      (statSync as jest.Mock)
        .mockReturnValueOnce({ size: 1000 })
        .mockImplementationOnce(() => {
          throw new Error('Cannot read');
        });

      const result = service.getUploadStats();

      expect(result).toEqual({
        fileCount: 2,
        totalSizeBytes: 1000, // Only counts the successful one
      });
    });
  });
});
