import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Length,
  IsEnum,
  MaxLength,
  IsInt,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AlertLevel } from '../../../entities/overprice-alert.entity';

/**
 * DTO for checking a price against benchmarks.
 */
export class CheckPriceDto {
  @ApiProperty({
    description: 'Price to check against benchmark',
    example: 5000.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({
    description: 'Item description for context',
    example: 'Microcomputador Desktop Intel Core i5',
  })
  @IsString()
  @MaxLength(500)
  itemDescription: string;

  @ApiProperty({
    description: 'Brazilian state (2-letter code)',
    example: 'SP',
  })
  @IsString()
  @Length(2, 2)
  uf: string;

  @ApiPropertyOptional({
    description: 'Category ID for precise benchmark lookup',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Category code (CATMAT/CATSER)',
    example: 'CATMAT-44122',
  })
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({
    description: 'Item code for reference',
    example: 'CATMAT-44122-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemCode?: string;

  @ApiPropertyOptional({
    description: 'ETP ID to associate the alert with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  etpId?: string;

  @ApiPropertyOptional({
    description: 'Whether to persist the alert to database',
    example: true,
    default: true,
  })
  @IsOptional()
  persistAlert?: boolean;
}

/**
 * Response DTO for price check result.
 */
export class CheckPriceResponseDto {
  @ApiProperty({
    description: 'Alert ID (if persisted)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  alertId?: string;

  @ApiProperty({
    description: 'Input price that was checked',
    example: 5000.0,
  })
  informedPrice: number;

  @ApiProperty({
    description: 'Median price from benchmark',
    example: 3450.0,
  })
  medianPrice: number;

  @ApiProperty({
    description: 'Percentage above median (negative if below)',
    example: 44.93,
  })
  percentageAbove: number;

  @ApiProperty({
    description: 'Alert classification level',
    enum: AlertLevel,
    example: AlertLevel.WARNING,
  })
  alertLevel: AlertLevel;

  @ApiProperty({
    description: 'Human-readable suggestion message',
    example:
      'O preço informado (R$ 5.000,00) está 44.93% acima da mediana de mercado (R$ 3.450,00). TCE pode questionar. Sugestão: ajustar para faixa R$ 2.800,00-R$ 4.200,00.',
  })
  suggestion: string;

  @ApiProperty({
    description: 'Suggested price range - lower bound',
    example: 2800.0,
  })
  suggestedPriceLow: number;

  @ApiProperty({
    description: 'Suggested price range - upper bound',
    example: 4200.0,
  })
  suggestedPriceHigh: number;

  @ApiProperty({
    description: 'Number of samples used in the benchmark',
    example: 245,
  })
  benchmarkSampleCount: number;

  @ApiProperty({
    description: 'Benchmark UF used',
    example: 'SP',
  })
  benchmarkUf: string;

  @ApiProperty({
    description: 'Whether the alert was persisted',
    example: true,
  })
  persisted: boolean;

  @ApiProperty({
    description: 'Whether benchmark data was available',
    example: true,
  })
  benchmarkAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Category information if matched',
  })
  category?: {
    id: string;
    code: string;
    name: string;
  };
}

/**
 * DTO for acknowledging an alert.
 */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({
    description: 'Optional justification note',
    example:
      'Preço justificado por especificações técnicas superiores ao padrão de mercado.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/**
 * DTO for listing alerts.
 */
export class ListAlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by ETP ID',
  })
  @IsOptional()
  @IsUUID()
  etpId?: string;

  @ApiPropertyOptional({
    description: 'Filter by alert level',
    enum: AlertLevel,
  })
  @IsOptional()
  @IsEnum(AlertLevel)
  alertLevel?: AlertLevel;

  @ApiPropertyOptional({
    description: 'Filter acknowledged status (true/false)',
  })
  @IsOptional()
  acknowledged?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * Response DTO for alert details.
 */
export class AlertResponseDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Associated ETP ID' })
  etpId?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Category code' })
  categoryCode?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Item code' })
  itemCode?: string;

  @ApiProperty({ description: 'Item description' })
  itemDescription: string;

  @ApiProperty({ description: 'Informed price' })
  informedPrice: number;

  @ApiProperty({ description: 'Median benchmark price' })
  medianPrice: number;

  @ApiProperty({ description: 'Percentage above median' })
  percentageAbove: number;

  @ApiProperty({ description: 'Alert level', enum: AlertLevel })
  alertLevel: AlertLevel;

  @ApiProperty({ description: 'Suggestion message' })
  suggestion: string;

  @ApiProperty({ description: 'Brazilian state' })
  uf: string;

  @ApiProperty({ description: 'Suggested price range - lower' })
  suggestedPriceLow: number;

  @ApiProperty({ description: 'Suggested price range - upper' })
  suggestedPriceHigh: number;

  @ApiProperty({ description: 'Benchmark sample count' })
  benchmarkSampleCount: number;

  @ApiPropertyOptional({ description: 'Acknowledgment timestamp' })
  acknowledgedAt?: Date;

  @ApiPropertyOptional({ description: 'User who acknowledged' })
  acknowledgedBy?: string;

  @ApiPropertyOptional({ description: 'Acknowledgment note' })
  acknowledgeNote?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;
}

/**
 * Response DTO for paginated alert list.
 */
export class AlertListResponseDto {
  @ApiProperty({ description: 'List of alerts', type: [AlertResponseDto] })
  data: AlertResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}

/**
 * Alert summary statistics.
 */
export class AlertSummaryDto {
  @ApiProperty({ description: 'Total alerts' })
  totalAlerts: number;

  @ApiProperty({ description: 'Alerts by level' })
  byLevel: {
    ok: number;
    attention: number;
    warning: number;
    critical: number;
  };

  @ApiProperty({ description: 'Acknowledged count' })
  acknowledged: number;

  @ApiProperty({ description: 'Pending acknowledgment count' })
  pending: number;

  @ApiProperty({ description: 'Average percentage above median' })
  avgPercentageAbove: number;
}

/**
 * Alert threshold configuration.
 */
export class AlertThresholdsDto {
  @ApiProperty({
    description: 'Threshold for ATTENTION level (percentage)',
    example: 20,
  })
  attention: number;

  @ApiProperty({
    description: 'Threshold for WARNING level (percentage)',
    example: 40,
  })
  warning: number;

  @ApiProperty({
    description: 'Threshold for CRITICAL level (percentage)',
    example: 60,
  })
  critical: number;
}
