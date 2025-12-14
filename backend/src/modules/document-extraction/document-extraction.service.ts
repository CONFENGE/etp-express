import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { existsSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UPLOAD_DIR } from './multer.config';

/**
 * Maximum age for uploaded files before cleanup (in milliseconds)
 * Default: 1 hour
 */
const FILE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Service for managing uploaded documents and file cleanup.
 *
 * Features:
 * - Automatic cleanup of files older than 1 hour
 * - File path validation
 * - Upload directory management
 */
@Injectable()
export class DocumentExtractionService implements OnModuleInit {
  private readonly logger = new Logger(DocumentExtractionService.name);

  /**
   * Initialize upload directory on module start
   */
  onModuleInit(): void {
    this.ensureUploadDirectory();
    this.logger.log(`Upload directory initialized: ${UPLOAD_DIR}`);
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
      this.logger.log(`Created upload directory: ${UPLOAD_DIR}`);
    }
  }

  /**
   * Get the full path for an uploaded file
   * @param filename - The filename (without path)
   * @returns Full file path
   */
  getFilePath(filename: string): string {
    return join(UPLOAD_DIR, filename);
  }

  /**
   * Check if a file exists in the upload directory
   * @param filename - The filename to check
   * @returns true if file exists
   */
  fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    return existsSync(filePath);
  }

  /**
   * Delete a specific file from the upload directory
   * @param filename - The filename to delete
   * @returns true if file was deleted, false if it didn't exist
   */
  deleteFile(filename: string): boolean {
    const filePath = this.getFilePath(filename);

    if (!existsSync(filePath)) {
      this.logger.warn(`File not found for deletion: ${filename}`);
      return false;
    }

    try {
      unlinkSync(filePath);
      this.logger.log(`Deleted file: ${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Automatic cleanup of old files (runs every hour)
   * Deletes files older than FILE_MAX_AGE_MS (1 hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldFiles(): Promise<void> {
    this.logger.log('Starting cleanup of old uploaded files...');

    if (!existsSync(UPLOAD_DIR)) {
      this.logger.log('Upload directory does not exist, skipping cleanup');
      return;
    }

    const now = Date.now();
    let deletedCount = 0;
    let errorCount = 0;

    try {
      const files = readdirSync(UPLOAD_DIR);

      for (const file of files) {
        const filePath = join(UPLOAD_DIR, file);

        try {
          const stats = statSync(filePath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > FILE_MAX_AGE_MS) {
            unlinkSync(filePath);
            deletedCount++;
            this.logger.debug(
              `Deleted old file: ${file} (age: ${Math.round(fileAge / 60000)}min)`,
            );
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error processing file ${file}:`, error);
        }
      }

      this.logger.log(
        `Cleanup completed: ${deletedCount} files deleted, ${errorCount} errors, ${files.length - deletedCount - errorCount} files remaining`,
      );
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Get upload statistics
   * @returns Object with file count and total size
   */
  getUploadStats(): { fileCount: number; totalSizeBytes: number } {
    if (!existsSync(UPLOAD_DIR)) {
      return { fileCount: 0, totalSizeBytes: 0 };
    }

    const files = readdirSync(UPLOAD_DIR);
    let totalSize = 0;

    for (const file of files) {
      try {
        const stats = statSync(join(UPLOAD_DIR, file));
        totalSize += stats.size;
      } catch {
        // Ignore files that can't be read
      }
    }

    return {
      fileCount: files.length,
      totalSizeBytes: totalSize,
    };
  }
}
