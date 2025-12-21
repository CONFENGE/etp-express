import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AuditAction } from '../../../entities/audit-log.entity';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class ExportAuditLogsDto {
  @ApiPropertyOptional({
    enum: ExportFormat,
    description: 'Export format (csv or json)',
    default: ExportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    enum: AuditAction,
    description: 'Filter by action type',
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Maximum number of records to export (default: 10000)',
    default: 10000,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50000)
  limit?: number = 10000;
}
