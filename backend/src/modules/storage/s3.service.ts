import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
   * Upload a file to S3
   *
   * @param key - S3 object key (path)
   * @param buffer - File content as Buffer
   * @param contentType - MIME type (e.g., application/pdf)
   * @returns S3 URI (s3://bucket/key)
   * @throws Error if upload fails
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded to S3: ${key}`);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`S3 upload failed for ${key}`, error);
      throw new Error(
        `Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate a signed URL for temporary access to an S3 object.
   *
   * @param key - S3 object key (path)
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1h)
   * @returns Signed URL for download
   * @throws Error if signed URL generation fails
   *
   * @see Issue #1705 - Implement signed URL generation for sharing exports
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(
        `Generated signed URL for ${key}, expires in ${expiresIn}s`,
      );
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}`, error);
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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
   * Delete a file from S3
   *
   * @param key - S3 object key (path)
   * @throws Error if delete fails
   *
   * @see Issue #1706 - Retention policy and cleanup job for old exports
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`S3 delete failed for ${key}`, error);
      throw new Error(
        `Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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
