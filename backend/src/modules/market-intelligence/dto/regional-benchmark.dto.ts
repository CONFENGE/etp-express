import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  Min,
  Max,
  IsInt,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrgaoPorte } from '../../../entities/price-benchmark.entity';

/**
 * Risk level for price comparison.
 * Based on deviation from median benchmark.
 */
export enum PriceRisk {
  /** Within acceptable range (0-20% above median) */
  LOW = 'LOW',
  /** Attention needed (20-40% above median) */
  MEDIUM = 'MEDIUM',
  /** Alert (40-60% above median) */
  HIGH = 'HIGH',
  /** Critical - TCE may question (>60% above median) */
  CRITICAL = 'CRITICAL',
}

/**
 * Query DTO for filtering benchmarks.
 */
export class BenchmarkQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category code (e.g., CATMAT-44122)',
    example: 'CATMAT-44122',
  })
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiPropertyOptional({
    description:
      'Filter by Brazilian state (2-letter code). Use "BR" for national.',
    example: 'SP',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization size',
    enum: OrgaoPorte,
  })
  @IsOptional()
  @IsEnum(OrgaoPorte)
  orgaoPorte?: OrgaoPorte;

  @ApiPropertyOptional({
    description: 'Period in months for benchmark calculation (default: 12)',
    example: 12,
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  periodMonths?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * Price range information.
 */
export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price', example: 1500.0 })
  min: number;

  @ApiProperty({ description: 'Maximum price', example: 8500.0 })
  max: number;

  @ApiProperty({ description: '25th percentile (Q1)', example: 2800.0 })
  p25: number;

  @ApiProperty({ description: '75th percentile (Q3)', example: 4200.0 })
  p75: number;
}

/**
 * Period information.
 */
export class PeriodDto {
  @ApiProperty({ description: 'Period start date', example: '2025-01-01' })
  start: Date;

  @ApiProperty({ description: 'Period end date', example: '2026-01-01' })
  end: Date;
}

/**
 * Response DTO for benchmark data.
 */
export class BenchmarkResponseDto {
  @ApiProperty({ description: 'Benchmark record ID' })
  id: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Category code', example: 'CATMAT-44122' })
  categoryCode: string;

  @ApiProperty({ description: 'Category name', example: 'Microcomputador' })
  categoryName: string;

  @ApiProperty({
    description: 'Brazilian state (2-letter code) or "BR" for national',
    example: 'SP',
  })
  uf: string;

  @ApiProperty({ description: 'Organization size segment', enum: OrgaoPorte })
  orgaoPorte: OrgaoPorte;

  @ApiProperty({ description: 'Average price', example: 3450.0 })
  avgPrice: number;

  @ApiProperty({ description: 'Median price', example: 3200.0 })
  medianPrice: number;

  @ApiProperty({
    description: 'Price range with percentiles',
    type: PriceRangeDto,
  })
  priceRange: PriceRangeDto;

  @ApiProperty({ description: 'Standard deviation', example: 850.0 })
  stdDev: number;

  @ApiProperty({ description: 'Number of price samples', example: 245 })
  sampleCount: number;

  @ApiProperty({ description: 'Normalized unit', example: 'UN' })
  unit: string;

  @ApiProperty({ description: 'Analysis period', type: PeriodDto })
  period: PeriodDto;

  @ApiProperty({ description: 'When benchmark was last calculated' })
  updatedAt: Date;
}

/**
 * Input DTO for price comparison.
 */
export class PriceComparisonDto {
  @ApiProperty({
    description: 'Price to compare against benchmark',
    example: 5000.0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'Category ID (provide either categoryId or categoryCode)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Category code (provide either categoryId or categoryCode)',
    example: 'CATMAT-44122',
  })
  @IsOptional()
  @IsString()
  categoryCode?: string;

  @ApiProperty({
    description: 'Brazilian state (2-letter code)',
    example: 'SP',
  })
  @IsString()
  @Length(2, 2)
  uf: string;

  @ApiPropertyOptional({
    description: 'Organization size for benchmark lookup',
    enum: OrgaoPorte,
    default: OrgaoPorte.TODOS,
  })
  @IsOptional()
  @IsEnum(OrgaoPorte)
  orgaoPorte?: OrgaoPorte;
}

/**
 * Result DTO for price comparison.
 */
export class PriceComparisonResultDto {
  @ApiProperty({
    description: 'Input price that was compared',
    example: 5000.0,
  })
  inputPrice: number;

  @ApiProperty({
    description: 'Benchmark data used for comparison',
    type: BenchmarkResponseDto,
  })
  benchmark: BenchmarkResponseDto;

  @ApiProperty({
    description:
      'Deviation from median as percentage (positive = above, negative = below)',
    example: 45.5,
  })
  deviation: number;

  @ApiProperty({
    description: 'Estimated percentile where the input price falls (0-100)',
    example: 85,
  })
  percentile: number;

  @ApiProperty({ description: 'Risk classification', enum: PriceRisk })
  risk: PriceRisk;

  @ApiProperty({
    description: 'Human-readable suggestion',
    example:
      'O preço informado (R$ 5.000) está 45% acima da mediana de mercado (R$ 3.450). TCE pode questionar. Sugestão: ajustar para faixa R$ 2.800-4.200.',
  })
  suggestion: string;
}

/**
 * Regional breakdown item.
 */
export class RegionalBreakdownItemDto {
  @ApiProperty({ description: 'Brazilian state', example: 'SP' })
  uf: string;

  @ApiProperty({ description: 'State name', example: 'São Paulo' })
  stateName: string;

  @ApiProperty({ description: 'Average price in state', example: 3450.0 })
  avgPrice: number;

  @ApiProperty({ description: 'Median price in state', example: 3200.0 })
  medianPrice: number;

  @ApiProperty({ description: 'Sample count in state', example: 125 })
  sampleCount: number;

  @ApiProperty({
    description: 'Deviation from national median as percentage',
    example: 5.2,
  })
  deviationFromNational: number;
}

/**
 * Regional breakdown response.
 */
export class RegionalBreakdownResponseDto {
  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Category code', example: 'CATMAT-44122' })
  categoryCode: string;

  @ApiProperty({ description: 'Category name', example: 'Microcomputador' })
  categoryName: string;

  @ApiProperty({
    description: 'National benchmark (BR)',
    type: BenchmarkResponseDto,
  })
  national: BenchmarkResponseDto;

  @ApiProperty({
    description: 'Regional breakdown by state',
    type: [RegionalBreakdownItemDto],
  })
  regions: RegionalBreakdownItemDto[];
}

/**
 * Benchmark calculation options.
 */
export class BenchmarkCalculationOptionsDto {
  @ApiPropertyOptional({
    description: 'Specific category ID to recalculate',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Specific UF to recalculate',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @ApiPropertyOptional({
    description: 'Period in months for calculation (default: 12)',
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  periodMonths?: number;

  @ApiPropertyOptional({
    description: 'Minimum sample size required (default: 5)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minSampleSize?: number;
}

/**
 * Benchmark statistics response.
 */
export class BenchmarkStatsDto {
  @ApiProperty({ description: 'Total benchmark records', example: 1250 })
  totalBenchmarks: number;

  @ApiProperty({ description: 'Categories with benchmarks', example: 85 })
  categoriesWithBenchmarks: number;

  @ApiProperty({ description: 'States with data', example: 27 })
  statesWithData: number;

  @ApiProperty({ description: 'Total price samples', example: 15420 })
  totalSamples: number;

  @ApiProperty({ description: 'Last calculation timestamp' })
  lastCalculatedAt: Date | null;

  @ApiProperty({
    description: 'Average sample count per benchmark',
    example: 12.3,
  })
  avgSamplesPerBenchmark: number;
}
