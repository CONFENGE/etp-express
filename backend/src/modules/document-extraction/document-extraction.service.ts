import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  mkdirSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import * as mammoth from 'mammoth';
import { UPLOAD_DIR } from './multer.config';
import {
  ExtractedDocument,
  ExtractedSection,
  ExtractionOptions,
} from './interfaces';

/**
 * Maximum age for uploaded files before cleanup (in milliseconds)
 * Default: 1 hour
 */
const FILE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Average words per page (used for page count estimation)
 */
const WORDS_PER_PAGE = 500;

/**
 * Service for managing uploaded documents, file cleanup, and text extraction.
 *
 * Features:
 * - Automatic cleanup of files older than 1 hour
 * - File path validation
 * - Upload directory management
 * - Text extraction from DOCX files (using mammoth)
 * - Section detection based on headings
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
   * Extract text and structured content from a DOCX file buffer.
   *
   * @param buffer - The DOCX file buffer
   * @param options - Extraction options
   * @returns ExtractedDocument with fullText, sections, and metadata
   * @throws BadRequestException if extraction fails
   */
  async extractFromDocx(
    buffer: Buffer,
    options: ExtractionOptions = {},
  ): Promise<ExtractedDocument> {
    const { detectSections = true } = options;

    try {
      this.logger.log('Starting DOCX text extraction...');

      // Extract raw text from DOCX
      const textResult = await mammoth.extractRawText({ buffer });
      const fullText = textResult.value;

      // Extract HTML to parse headings for section detection
      let sections: ExtractedSection[] = [];

      if (detectSections) {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        sections = this.parseSectionsFromHtml(htmlResult.value);
      }

      // If no sections were detected, create a single section with all content
      if (sections.length === 0) {
        sections = [{ content: fullText }];
      }

      // Calculate metadata
      const wordCount = this.countWords(fullText);
      const characterCount = fullText.length;
      const pageCount = Math.ceil(wordCount / WORDS_PER_PAGE);

      // Log any warnings from mammoth
      if (textResult.messages && textResult.messages.length > 0) {
        for (const msg of textResult.messages) {
          this.logger.warn(`Mammoth warning: ${msg.message}`);
        }
      }

      this.logger.log(
        `DOCX extraction complete: ${wordCount} words, ${sections.length} sections`,
      );

      return {
        fullText,
        sections,
        metadata: {
          wordCount,
          pageCount,
          sectionCount: sections.length,
          characterCount,
        },
      };
    } catch (error) {
      this.logger.error('DOCX extraction failed:', error);
      throw new BadRequestException(
        `Failed to extract text from DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract text from a DOCX file stored in the upload directory.
   *
   * @param filename - The filename in the upload directory
   * @param options - Extraction options
   * @returns ExtractedDocument with fullText, sections, and metadata
   * @throws BadRequestException if file not found or extraction fails
   */
  async extractFromDocxFile(
    filename: string,
    options: ExtractionOptions = {},
  ): Promise<ExtractedDocument> {
    const filePath = this.getFilePath(filename);

    if (!existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filename}`);
    }

    const buffer = readFileSync(filePath);
    return this.extractFromDocx(buffer, options);
  }

  /**
   * Parse sections from HTML output by detecting headings.
   * Headings (h1-h6) create new sections with their content following.
   */
  private parseSectionsFromHtml(html: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];

    // Regular expression to match heading tags and their content
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;

    // Split content by headings
    const parts = html.split(headingRegex);

    // parts array structure: [before-first-heading, level, title, content-after, level, title, ...]

    // Content before any heading (if exists)
    if (parts[0] && parts[0].trim()) {
      const preContent = this.stripHtml(parts[0]);
      if (preContent.trim()) {
        sections.push({ content: preContent.trim() });
      }
    }

    // Process heading-content pairs
    for (let i = 1; i < parts.length; i += 3) {
      const level = parseInt(parts[i], 10);
      const title = this.stripHtml(parts[i + 1] || '');
      const contentHtml = parts[i + 2] || '';
      const content = this.stripHtml(contentHtml);

      if (title || content.trim()) {
        sections.push({
          title: title || undefined,
          content: content.trim(),
          level: level || undefined,
        });
      }
    }

    return sections;
  }

  /**
   * Remove HTML tags and decode entities from a string.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Decode ampersand
      .replace(/&lt;/g, '<') // Decode less than
      .replace(/&gt;/g, '>') // Decode greater than
      .replace(/&quot;/g, '"') // Decode quotes
      .replace(/&#39;/g, "'") // Decode apostrophe
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Count words in a text string.
   */
  private countWords(text: string): number {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length;
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
