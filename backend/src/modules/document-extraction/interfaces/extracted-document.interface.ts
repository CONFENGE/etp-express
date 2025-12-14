/**
 * Represents a section extracted from a document.
 * Sections are detected by heading styles in DOCX files.
 */
export interface ExtractedSection {
  /** Section title (from heading) - undefined if content has no heading */
  title?: string;
  /** Section content (text following the heading) */
  content: string;
  /** Heading level (1-6 for h1-h6 headings) - undefined if no heading */
  level?: number;
}

/**
 * Metadata about the extracted document.
 */
export interface ExtractedDocumentMetadata {
  /** Total word count in the document */
  wordCount: number;
  /** Estimated page count (based on ~500 words per page) */
  pageCount: number;
  /** Number of sections detected */
  sectionCount: number;
  /** Character count */
  characterCount: number;
}

/**
 * Result of text extraction from a document (DOCX or PDF).
 * This interface is used by the ETPAnalysisService to analyze existing ETPs.
 */
export interface ExtractedDocument {
  /** Full text content of the document, preserving paragraph breaks */
  fullText: string;
  /** Sections detected in the document (by headings for DOCX) */
  sections: ExtractedSection[];
  /** Document metadata (word count, page count, etc.) */
  metadata: ExtractedDocumentMetadata;
}

/**
 * Options for document extraction.
 */
export interface ExtractionOptions {
  /** Whether to preserve whitespace formatting */
  preserveWhitespace?: boolean;
  /** Whether to attempt section detection */
  detectSections?: boolean;
}
