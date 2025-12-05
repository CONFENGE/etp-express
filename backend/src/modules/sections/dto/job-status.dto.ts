import { ApiProperty } from '@nestjs/swagger';

/**
 * Job Status DTO
 *
 * Response format for job status queries.
 * Provides real-time updates on async section generation progress.
 *
 * @see #186 - Async queue processing
 * @see #391 - Job Status API
 */
export class JobStatusDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: '12345-abcde-67890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Current job status',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'unknown'],
    example: 'active',
  })
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';

  @ApiProperty({
    description: 'Job progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiProperty({
    description: 'Section data (available when completed)',
    required: false,
    nullable: true,
  })
  result?: any;

  @ApiProperty({
    description: 'Error message (available when failed)',
    required: false,
    nullable: true,
    example: 'OpenAI API timeout',
  })
  error?: string;

  @ApiProperty({
    description: 'Job creation timestamp (ISO 8601)',
    example: '2025-12-05T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Job completion timestamp (ISO 8601)',
    required: false,
    nullable: true,
    example: '2025-12-05T10:31:30Z',
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Job processing start timestamp (ISO 8601)',
    required: false,
    nullable: true,
    example: '2025-12-05T10:30:05Z',
  })
  processedOn?: Date;

  @ApiProperty({
    description: 'Failure reason (available when failed)',
    required: false,
    nullable: true,
    example: 'Circuit breaker open: too many OpenAI failures',
  })
  failedReason?: string;

  @ApiProperty({
    description: 'Number of retry attempts made',
    example: 0,
    minimum: 0,
  })
  attemptsMade?: number;

  @ApiProperty({
    description: 'Maximum number of retry attempts allowed',
    example: 3,
  })
  attemptsMax?: number;
}
