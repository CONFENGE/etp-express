import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload directory for temporary file storage.
 * Files are automatically cleaned up after 1 hour.
 */
export const UPLOAD_DIR = join(process.cwd(), 'tmp', 'uploads');

/**
 * Maximum file size allowed: 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Allowed MIME types for document upload
 */
export const ALLOWED_MIME_TYPES = [
 'application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/**
 * File filter to validate uploaded files
 * @throws BadRequestException if file type is not allowed
 */
export const fileFilter = (
 _req: Express.Request,
 file: Express.Multer.File,
 callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
 const ext = extname(file.originalname).toLowerCase();

 if (!ALLOWED_EXTENSIONS.includes(ext)) {
 return callback(
 new BadRequestException(
 `Tipo de arquivo não permitido. Apenas ${ALLOWED_EXTENSIONS.join(', ')} são aceitos.`,
 ),
 false,
 );
 }

 if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
 return callback(
 new BadRequestException(
 `MIME type não permitido: ${file.mimetype}. Apenas PDF e DOCX são aceitos.`,
 ),
 false,
 );
 }

 callback(null, true);
};

/**
 * Multer disk storage configuration
 * - Creates upload directory if it doesn't exist
 * - Generates unique filename with UUID
 */
export const storage = diskStorage({
 destination: (_req, _file, callback) => {
 // Ensure upload directory exists
 if (!existsSync(UPLOAD_DIR)) {
 mkdirSync(UPLOAD_DIR, { recursive: true });
 }
 callback(null, UPLOAD_DIR);
 },
 filename: (_req, file, callback) => {
 // Generate unique filename: uuid + original extension
 const uniqueId = uuidv4();
 const ext = extname(file.originalname).toLowerCase();
 const filename = `${uniqueId}${ext}`;
 callback(null, filename);
 },
});

/**
 * Multer configuration for document uploads
 *
 * Features:
 * - 10MB max file size
 * - Only .pdf and .docx allowed
 * - Unique filename generation
 * - Automatic directory creation
 */
export const multerConfig: MulterOptions = {
 storage,
 fileFilter,
 limits: {
 fileSize: MAX_FILE_SIZE,
 files: 1, // Only one file per request
 },
};
