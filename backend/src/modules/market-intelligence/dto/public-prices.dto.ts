import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemCategoryType } from '../../../entities/item-category.entity';

/**
 * DTO for public price search query.
 * Used in GET /api/v1/prices/search endpoint.
 */
export class PublicPriceSearchDto {
  @ApiProperty({
    description: 'Search query for item description (full-text search)',
    example: 'microcomputador',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by category code (CATMAT/CATSER)',
    example: 'CATMAT-44122',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Maximum results to return (max 100)',
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

  @ApiPropertyOptional({
    description: 'Pagination offset (for result skipping)',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

/**
 * Individual search result item.
 */
export class PublicPriceSearchResultDto {
  @ApiProperty({
    description: 'Item ID (normalized contract item)',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  id: string;

  @ApiProperty({
    description: 'Normalized item description',
    example: 'Microcomputador Intel Core i5 8GB RAM 256GB SSD',
  })
  description: string;

  @ApiProperty({
    description: 'Category code (CATMAT/CATSER)',
    example: 'CATMAT-44122',
  })
  categoryCode: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Microcomputador',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Unit price in BRL',
    example: 3200.0,
  })
  price: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'UN',
  })
  unit: string;

  @ApiProperty({
    description: 'Contract signature date',
    example: '2025-11-15T00:00:00.000Z',
  })
  contractDate: Date;

  @ApiProperty({
    description: 'Brazilian state of the contracting agency (2-letter code)',
    example: 'SP',
  })
  uf: string;

  @ApiProperty({
    description: 'Relevance score (0-1) based on text similarity',
    example: 0.92,
    minimum: 0,
    maximum: 1,
  })
  similarity: number;
}

/**
 * Response DTO for search endpoint.
 */
export class PublicPriceSearchResponseDto {
  @ApiProperty({
    description: 'List of search results',
    type: [PublicPriceSearchResultDto],
  })
  data: PublicPriceSearchResultDto[];

  @ApiProperty({
    description: 'Total number of results (before pagination)',
    example: 234,
  })
  total: number;

  @ApiProperty({
    description: 'Results limit applied',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Offset applied',
    example: 0,
  })
  offset: number;
}

/**
 * Individual category item for public API.
 */
export class PublicCategoryDto {
  @ApiProperty({
    description: 'Category UUID',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Category code (CATMAT/CATSER)',
    example: 'CATMAT-44122',
  })
  code: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Microcomputador',
  })
  name: string;

  @ApiProperty({
    description: 'Category type',
    enum: ItemCategoryType,
    example: ItemCategoryType.CATMAT,
  })
  type: ItemCategoryType;

  @ApiProperty({
    description: 'Number of benchmarks available for this category',
    example: 156,
  })
  benchmarkCount: number;

  @ApiProperty({
    description: 'Whether category is active for queries',
    example: true,
  })
  active: boolean;
}

/**
 * Response DTO for categories endpoint.
 */
export class PublicCategoriesResponseDto {
  @ApiProperty({
    description: 'List of categories with price data available',
    type: [PublicCategoryDto],
  })
  data: PublicCategoryDto[];

  @ApiProperty({
    description: 'Total number of categories',
    example: 245,
  })
  total: number;
}
