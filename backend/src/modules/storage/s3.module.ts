import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';

/**
 * S3Module - AWS S3 integration module
 *
 * Provides S3Service for export storage functionality.
 * Requires AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY env vars.
 *
 * @see Issue #1703 - Setup S3 bucket and AWS SDK configuration
 */
@Module({
  imports: [ConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
