import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  Inject,
  forwardRef,
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
import { PDFParse } from 'pdf-parse';
import { UPLOAD_DIR } from './multer.config';
import {
  ExtractedDocument,
  ExtractedSection,
  ExtractionOptions,
} from './interfaces';
import { PageIndexService } from '../pageindex/pageindex.service';
import { TreeBuilderService } from '../pageindex/services/tree-builder.service';
import { DocumentType } from '../pageindex/dto/index-document.dto';
import { DocumentTreeStatus } from '../../entities/document-tree.entity';

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
 * - Text extraction from PDF files (using pdf-parse)
 * - Section detection based on headings
 */
@Injectable()
export class DocumentExtractionService implements OnModuleInit {
  private readonly logger = new Logger(DocumentExtractionService.name);

  constructor(
    @Inject(forwardRef(() => PageIndexService))
    private readonly pageIndexService: PageIndexService,
    @Inject(forwardRef(() => TreeBuilderService))
    private readonly treeBuilderService: TreeBuilderService,
  ) {}

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
   * Extract text from a PDF file buffer.
   *
   * @param buffer - The PDF file buffer
   * @param options - Extraction options (detectSections not applicable for PDF)
   * @returns ExtractedDocument with fullText, sections, and metadata
   * @throws BadRequestException if extraction fails (corrupted, password-protected, etc.)
   */
  async extractFromPdf(
    buffer: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: ExtractionOptions = {},
  ): Promise<ExtractedDocument> {
    let parser: PDFParse | null = null;

    try {
      this.logger.log('Starting PDF text extraction...');

      // Create parser with buffer data (pdf-parse v2 API)
      parser = new PDFParse({ data: buffer });

      // Extract text and info in parallel
      const [textResult, infoResult] = await Promise.all([
        parser.getText(),
        parser.getInfo(),
      ]);

      const fullText = textResult.text || '';

      // Check if PDF has text content (might be image-only)
      if (!fullText.trim()) {
        this.logger.warn(
          'PDF contains no extractable text (may be image-only or scanned)',
        );
        throw new BadRequestException(
          'PDF contains no extractable text. The document may contain only images or be a scanned document without OCR.',
        );
      }

      // PDF doesn't have structured headings like DOCX, so we attempt
      // to detect sections by common patterns (numbered headings, ALL CAPS lines)
      const sections = this.parseSectionsFromPdfText(fullText);

      // If no sections detected, create a single section with all content
      if (sections.length === 0) {
        sections.push({ content: fullText.trim() });
      }

      // Calculate metadata
      const wordCount = this.countWords(fullText);
      const characterCount = fullText.length;
      // Use actual page count from PDF metadata (infoResult.total)
      const pageCount =
        infoResult.total || Math.ceil(wordCount / WORDS_PER_PAGE);

      this.logger.log(
        `PDF extraction complete: ${wordCount} words, ${pageCount} pages, ${sections.length} sections`,
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
      // Handle specific pdf-parse errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check for password-protected PDF
      if (
        errorMessage.includes('password') ||
        errorMessage.includes('encrypted') ||
        errorMessage.includes('PasswordException')
      ) {
        this.logger.error('PDF is password-protected:', error);
        throw new BadRequestException(
          'PDF file is password-protected. Please provide an unprotected document.',
        );
      }

      // Check for corrupted PDF
      if (
        errorMessage.includes('Invalid PDF') ||
        errorMessage.includes('PDF structure') ||
        errorMessage.includes('InvalidPDFException')
      ) {
        this.logger.error('PDF is corrupted:', error);
        throw new BadRequestException(
          'PDF file is corrupted or invalid. Please provide a valid PDF document.',
        );
      }

      this.logger.error('PDF extraction failed:', error);
      throw new BadRequestException(
        `Failed to extract text from PDF file: ${errorMessage}`,
      );
    } finally {
      // Clean up parser resources
      if (parser) {
        try {
          await parser.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Extract text from a PDF file stored in the upload directory.
   *
   * @param filename - The filename in the upload directory
   * @param options - Extraction options
   * @returns ExtractedDocument with fullText, sections, and metadata
   * @throws BadRequestException if file not found or extraction fails
   */
  async extractFromPdfFile(
    filename: string,
    options: ExtractionOptions = {},
  ): Promise<ExtractedDocument> {
    const filePath = this.getFilePath(filename);

    if (!existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filename}`);
    }

    const buffer = readFileSync(filePath);
    return this.extractFromPdf(buffer, options);
  }

  /**
   * Parse sections from PDF text by detecting common heading patterns.
   * Looks for numbered sections (1., 1.1., etc.) and ALL CAPS lines.
   */
  private parseSectionsFromPdfText(text: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    const lines = text.split('\n');

    let currentSection: ExtractedSection | null = null;
    let contentBuffer: string[] = [];

    // Pattern for numbered sections (1., 1.1., 1.1.1., etc.)
    const numberedSectionPattern = /^(\d+(?:\.\d+)*\.?)\s+(.+)$/;
    // Pattern for ALL CAPS headers (at least 3 words, all uppercase)
    const capsHeaderPattern = /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,})$/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let isHeading = false;
      let headingTitle = '';
      let headingLevel: number | undefined;

      // Check for numbered section
      const numberedMatch = trimmedLine.match(numberedSectionPattern);
      if (numberedMatch) {
        isHeading = true;
        headingTitle = `${numberedMatch[1]} ${numberedMatch[2]}`;
        // Calculate level based on number of dots
        headingLevel = (numberedMatch[1].match(/\./g) || []).length + 1;
      }

      // Check for ALL CAPS header (only if not already matched)
      if (!isHeading) {
        const capsMatch = trimmedLine.match(capsHeaderPattern);
        if (
          capsMatch &&
          trimmedLine === trimmedLine.toUpperCase() &&
          trimmedLine.split(/\s+/).length >= 2
        ) {
          isHeading = true;
          headingTitle = trimmedLine;
          headingLevel = 1;
        }
      }

      if (isHeading) {
        // Save previous section if exists
        if (currentSection || contentBuffer.length > 0) {
          const content = contentBuffer.join('\n').trim();
          if (currentSection) {
            currentSection.content = content;
            sections.push(currentSection);
          } else if (content) {
            sections.push({ content });
          }
          contentBuffer = [];
        }

        // Start new section
        currentSection = {
          title: headingTitle,
          content: '',
          level: headingLevel,
        };
      } else {
        contentBuffer.push(trimmedLine);
      }
    }

    // Add last section
    if (currentSection || contentBuffer.length > 0) {
      const content = contentBuffer.join('\n').trim();
      if (currentSection) {
        currentSection.content = content;
        sections.push(currentSection);
      } else if (content) {
        sections.push({ content });
      }
    }

    return sections;
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
   * Process uploaded document with PageIndex asynchronously.
   *
   * This method creates a pending DocumentTree entry and processes the file
   * in the background to generate hierarchical tree structure.
   *
   * @param filename - The uploaded filename
   * @param originalName - Original filename from upload
   * @returns Promise with tree ID and initial status
   *
   * @see Issue #1543 - feat(document-extraction): Gerar tree structure com PageIndex em uploads
   */
  async processWithPageIndex(
    filename: string,
    originalName: string,
  ): Promise<{ treeId: string; status: string }> {
    const filePath = this.getFilePath(filename);

    if (!existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filename}`);
    }

    // Determine document type (default to OTHER for generic PDFs/DOCX)
    const documentType = DocumentType.OTHER;

    try {
      // Create pending DocumentTree entry
      const result = await this.pageIndexService.createDocumentTree({
        documentName: originalName,
        documentPath: filePath,
        documentType,
      });

      // Process asynchronously (non-blocking)
      this.processDocumentAsync(result.treeId, filePath, documentType).catch(
        (error) => {
          this.logger.error(
            `Async processing failed for tree ${result.treeId}:`,
            error,
          );
        },
      );

      return {
        treeId: result.treeId,
        status: result.status,
      };
    } catch (error) {
      this.logger.error('Failed to create DocumentTree entry:', error);
      throw new BadRequestException(
        `Failed to process document with PageIndex: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process document tree asynchronously (background task).
   *
   * @param treeId - DocumentTree ID to update
   * @param filePath - Path to the document file
   * @param documentType - Type of document (PDF or DOCX)
   */
  private async processDocumentAsync(
    treeId: string,
    filePath: string,
    _documentType: DocumentType,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting async PageIndex processing for tree ${treeId}...`,
      );

      // Update status to PROCESSING
      await this.pageIndexService.updateDocumentTreeStatus(
        treeId,
        DocumentTreeStatus.PROCESSING,
      );

      // Generate tree structure
      const buildResult = await this.treeBuilderService.buildTree(filePath);

      const processingTimeMs = Date.now() - startTime;

      // Update DocumentTree with results
      await this.pageIndexService.updateDocumentTreeWithResult(treeId, {
        treeStructure: buildResult.tree,
        nodeCount: buildResult.nodeCount,
        maxDepth: buildResult.maxDepth,
        processingTimeMs,
        status: DocumentTreeStatus.INDEXED,
        indexedAt: new Date(),
        metadata: {
          pageCount: 0,
          wordCount: 0,
        },
      });

      this.logger.log(
        `PageIndex processing complete for tree ${treeId}: ${buildResult.nodeCount} nodes, ${buildResult.maxDepth} depth, ${processingTimeMs}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `PageIndex processing failed for tree ${treeId}:`,
        error,
      );

      // Update status to ERROR
      await this.pageIndexService.updateDocumentTreeStatus(
        treeId,
        DocumentTreeStatus.ERROR,
        errorMessage,
      );
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
