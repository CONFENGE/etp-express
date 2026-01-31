/**
 * Export Cleanup Types
 *
 * Type definitions for the export retention cleanup job.
 *
 * @module modules/export/export-cleanup
 * @see Issue #1706 - Retention policy and cleanup job for old exports
 */

export const EXPORT_CLEANUP_QUEUE = 'export-cleanup';
export const EXPORT_CLEANUP_JOB = 'cleanup-old-exports';

/**
 * Job data for export cleanup
 */
export interface ExportCleanupJobData {
  /**
   * Retention period in days
   */
  retentionDays: number;

  /**
   * Dry run mode - logs what would be deleted without actually deleting
   */
  dryRun?: boolean;

  /**
   * Organization ID filter (optional) - if provided, only clean exports for this org
   */
  organizationId?: string;
}

/**
 * Result of cleanup job execution
 */
export interface ExportCleanupJobResult {
  /**
   * Number of export records deleted
   */
  deletedCount: number;

  /**
   * Number of S3 objects deleted
   */
  s3DeletedCount: number;

  /**
   * IDs of deleted export records
   */
  deletedIds: string[];

  /**
   * Any errors encountered (non-fatal)
   */
  errors: string[];

  /**
   * Dry run mode - if true, nothing was actually deleted
   */
  dryRun: boolean;
}
