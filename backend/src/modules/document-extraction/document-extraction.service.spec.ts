import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentExtractionService } from './document-extraction.service';
import { existsSync, mkdirSync, unlinkSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { UPLOAD_DIR } from './multer.config';
import * as mammoth from 'mammoth';

// Mock fs functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock mammoth
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
  convertToHtml: jest.fn(),
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

  describe('extractFromDocx', () => {
    const mockBuffer = Buffer.from('mock docx content');

    it('should extract text and sections from DOCX buffer', async () => {
      const mockText = 'This is the document content with some words here.';
      const mockHtml =
        '<h1>Introduction</h1><p>First section content.</p><h2>Details</h2><p>Second section content.</p>';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.fullText).toBe(mockText);
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].title).toBe('Introduction');
      expect(result.sections[0].level).toBe(1);
      expect(result.sections[1].title).toBe('Details');
      expect(result.sections[1].level).toBe(2);
      expect(result.metadata.wordCount).toBe(9);
      expect(result.metadata.sectionCount).toBe(2);
    });

    it('should handle DOCX without headings', async () => {
      const mockText = 'Simple text without any headings or structure.';
      const mockHtml = '<p>Simple text without any headings or structure.</p>';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.fullText).toBe(mockText);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBeUndefined();
      expect(result.sections[0].content).toBe(mockText);
    });

    it('should create single section when no headings detected', async () => {
      const mockText = 'Document with no headings.';
      const mockHtml = '<p>Document with no headings.</p>';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toBeTruthy();
    });

    it('should skip section detection when option is false', async () => {
      const mockText = 'Test content';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer, {
        detectSections: false,
      });

      expect(mammoth.convertToHtml).not.toHaveBeenCalled();
      expect(result.sections).toHaveLength(1);
    });

    it('should calculate metadata correctly', async () => {
      // 100 words = approx 20 characters per word average
      const mockText =
        'word '.repeat(100).trim() + ' and some more words to get exact count.';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: `<p>${mockText}</p>`,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.metadata.wordCount).toBeGreaterThan(100);
      expect(result.metadata.characterCount).toBe(mockText.length);
      expect(result.metadata.pageCount).toBe(1); // ~107 words / 500 words per page = 1
    });

    it('should handle content before first heading', async () => {
      const mockHtml =
        '<p>Intro paragraph</p><h1>First Section</h1><p>Section content</p>';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: 'Intro paragraph First Section Section content',
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.sections.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw BadRequestException on extraction error', async () => {
      (mammoth.extractRawText as jest.Mock).mockRejectedValue(
        new Error('Invalid DOCX format'),
      );

      await expect(service.extractFromDocx(mockBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should decode HTML entities in extracted content', async () => {
      const mockHtml =
        '<h1>Test &amp; Demo</h1><p>Content with &lt;tags&gt; and &quot;quotes&quot;</p>';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: 'Test & Demo Content with <tags> and "quotes"',
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: mockHtml,
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.sections[0].title).toBe('Test & Demo');
      expect(result.sections[0].content).toContain('<tags>');
      expect(result.sections[0].content).toContain('"quotes"');
    });

    it('should handle empty document', async () => {
      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: '',
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: '',
        messages: [],
      });

      const result = await service.extractFromDocx(mockBuffer);

      expect(result.fullText).toBe('');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.sections).toHaveLength(1);
    });

    it('should handle mammoth warnings', async () => {
      const mockText = 'Content with warnings';

      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [{ type: 'warning', message: 'Unknown font' }],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: `<p>${mockText}</p>`,
        messages: [],
      });

      // Should not throw, just log the warning
      const result = await service.extractFromDocx(mockBuffer);
      expect(result.fullText).toBe(mockText);
    });
  });

  describe('extractFromDocxFile', () => {
    it('should read file and extract content', async () => {
      const mockBuffer = Buffer.from('mock');
      const mockText = 'File content';

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(mockBuffer);
      (mammoth.extractRawText as jest.Mock).mockResolvedValue({
        value: mockText,
        messages: [],
      });
      (mammoth.convertToHtml as jest.Mock).mockResolvedValue({
        value: `<p>${mockText}</p>`,
        messages: [],
      });

      const result = await service.extractFromDocxFile('test.docx');

      expect(readFileSync).toHaveBeenCalledWith(join(UPLOAD_DIR, 'test.docx'));
      expect(result.fullText).toBe(mockText);
    });

    it('should throw BadRequestException if file not found', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service.extractFromDocxFile('nonexistent.docx'),
      ).rejects.toThrow(BadRequestException);
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
