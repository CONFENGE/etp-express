/**
 * Formatos de exportação suportados pelo sistema.
 * Usado em ExportMetadata e ExportService.
 *
 * Related:
 * - Issue #1704 - Automatic S3 upload after export generation
 * - TD-010.3 - DB-NEW-05: Extract ExportFormat enum
 */
export enum ExportFormat {
  /** Exportação em PDF */
  PDF = 'pdf',
  /** Exportação em Microsoft Word (DOCX) */
  DOCX = 'docx',
  /** Exportação em JSON */
  JSON = 'json',
  /** Exportação em XML (usado para integração com TCE) */
  XML = 'xml',
}
