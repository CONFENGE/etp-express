import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * StorageModule - AWS S3 integration
 *
 * Provides S3Service for export storage and retrieval.
 * Configured via environment variables (AWS_REGION, AWS_S3_BUCKET, etc.)
 *
 * @see Issue #1703 - Setup S3 bucket and AWS SDK configuration
 * @see Issue #1704 - Automatic S3 upload after export generation
 */
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule {}
