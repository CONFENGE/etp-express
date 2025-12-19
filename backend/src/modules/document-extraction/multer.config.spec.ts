import { BadRequestException } from '@nestjs/common';
import {
  fileFilter,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR,
} from './multer.config';

describe('Multer Configuration', () => {
  describe('Constants', () => {
    it('should have correct MAX_FILE_SIZE (10MB)', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should have UPLOAD_DIR defined', () => {
      expect(UPLOAD_DIR).toContain('tmp');
      expect(UPLOAD_DIR).toContain('uploads');
    });

    it('should allow PDF and DOCX extensions', () => {
      expect(ALLOWED_EXTENSIONS).toContain('.pdf');
      expect(ALLOWED_EXTENSIONS).toContain('.docx');
      expect(ALLOWED_EXTENSIONS).toHaveLength(2);
    });

    it('should allow correct MIME types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(ALLOWED_MIME_TYPES).toHaveLength(2);
    });
  });

  describe('fileFilter', () => {
    const mockRequest = {} as Express.Request;

    describe('Valid files', () => {
      it('should accept PDF files', () => {
        const file = {
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it('should accept DOCX files', () => {
        const file = {
          originalname: 'document.docx',
          mimetype:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it('should accept PDF with uppercase extension', () => {
        const file = {
          originalname: 'document.PDF',
          mimetype: 'application/pdf',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });
    });

    describe('Invalid extensions', () => {
      it('should reject .txt files', () => {
        const file = {
          originalname: 'document.txt',
          mimetype: 'text/plain',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
        const error = callback.mock.calls[0][0] as BadRequestException;
        expect(error.message).toContain('.pdf');
        expect(error.message).toContain('.docx');
      });

      it('should reject .exe files', () => {
        const file = {
          originalname: 'malware.exe',
          mimetype: 'application/octet-stream',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
      });

      it('should reject .doc files (old Word format)', () => {
        const file = {
          originalname: 'document.doc',
          mimetype: 'application/msword',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
      });
    });

    describe('MIME type validation', () => {
      it('should reject wrong MIME type even with correct extension', () => {
        const file = {
          originalname: 'document.pdf',
          mimetype: 'text/plain', // Wrong MIME type
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
        const error = callback.mock.calls[0][0] as BadRequestException;
        expect(error.message).toContain('MIME type');
      });

      it('should reject application/octet-stream for PDF extension', () => {
        const file = {
          originalname: 'document.pdf',
          mimetype: 'application/octet-stream',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle files with multiple dots in name', () => {
        const file = {
          originalname: 'my.document.final.v2.pdf',
          mimetype: 'application/pdf',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it('should reject files with no extension', () => {
        const file = {
          originalname: 'document',
          mimetype: 'application/octet-stream',
        } as Express.Multer.File;

        const callback = jest.fn();
        fileFilter(mockRequest, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
      });
    });
  });
});
