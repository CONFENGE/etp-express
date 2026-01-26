import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * S3Service - AWS S3 integration for export storage
 *
 * Provides methods for uploading, downloading, and managing exports in S3.
 * Configured via environment variables (AWS_REGION, AWS_S3_BUCKET, etc.)
 *
 * @see Issue #1703 - Setup S3 bucket and AWS SDK configuration
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET');

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });

    this.logger.log(
      `S3Service initialized with bucket: ${this.bucketName} in region: ${this.configService.get('AWS_REGION')}`,
    );
  }

  /**
   * Upload a file to S3 (stub - to be implemented in #1704)
   *
   * @param key - S3 object key (path)
   * @param buffer - File content as Buffer
   * @param contentType - MIME type (e.g., application/pdf)
   * @returns S3 URI (s3://bucket/key)
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    // TODO: Implement in #1704
    this.logger.debug(
      `uploadFile stub called for key: ${key}, contentType: ${contentType}, size: ${buffer.length} bytes`,
    );
    return '';
  }

  /**
   * Generate a signed URL for temporary access (stub - to be implemented in #1705)
   *
   * @param key - S3 object key (path)
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1h)
   * @returns Signed URL for download
   */
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // TODO: Implement in #1705
    this.logger.debug(
      `getSignedUrl stub called for key: ${key}, expiresIn: ${expiresIn}s`,
    );
    return '';
  }

  /**
   * Get the configured bucket name
   *
   * @returns S3 bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Check if S3 is properly configured
   *
   * @returns true if all required env vars are set
   */
  isConfigured(): boolean {
    try {
      this.configService.getOrThrow<string>('AWS_REGION');
      this.configService.getOrThrow<string>('AWS_S3_BUCKET');
      this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
      this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY');
      return true;
    } catch {
      return false;
    }
  }
}
