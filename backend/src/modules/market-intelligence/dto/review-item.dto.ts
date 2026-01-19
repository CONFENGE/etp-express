import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for reviewing and correcting a normalized contract item.
 *
 * Used by ItemNormalizationController.reviewItem() endpoint.
 * Allows admin/system_admin users to manually correct:
 * - Category assignment (using categoryCode)
 * - Normalized description
 *
 * @see Issue #1606 - Manual review API
 * @see NormalizedContractItem entity
 */
export class ReviewItemDto {
  /**
   * New category code to assign (e.g., CATMAT-44122, CATSER-10391).
   * If provided, the item's category will be updated to match.
   */
  @ApiPropertyOptional({
    description:
      'New category code to assign (e.g., CATMAT-44122, CATSER-10391)',
    example: 'CATMAT-44122',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  categoryCode?: string;

  /**
   * Corrected normalized description.
   * If provided, updates the item's normalizedDescription field.
   */
  @ApiPropertyOptional({
    description: 'Corrected normalized description',
    example: 'PAPEL A4 BRANCO 75G/M2 RESMA 500 FOLHAS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  normalizedDescription?: string;

  /**
   * Optional review notes explaining the correction.
   */
  @ApiPropertyOptional({
    description: 'Optional review notes explaining the correction',
    example:
      'Reclassificado de CATSER para CATMAT - item é material de consumo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}

/**
 * Response DTO for normalization statistics.
 *
 * @see Issue #1606 - Manual review API
 */
export class NormalizationStatsDto {
  @ApiProperty({
    description: 'Total number of normalized items',
    example: 1500,
  })
  total: number;

  @ApiProperty({
    description: 'Number of items manually reviewed',
    example: 250,
  })
  reviewed: number;

  @ApiProperty({
    description: 'Number of items pending review',
    example: 1250,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of items with low confidence (< 0.7)',
    example: 180,
  })
  lowConfidence: number;

  @ApiProperty({
    description: 'Review accuracy rate (reviewed / total)',
    example: 0.167,
  })
  accuracy: number;

  @ApiProperty({
    description: 'Average confidence score across all items',
    example: 0.82,
  })
  averageConfidence: number;
}

/**
 * Query parameters for pending review items endpoint.
 *
 * @see Issue #1606 - Manual review API
 */
export class PendingReviewQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of items to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold',
    example: 0,
    default: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Maximum confidence threshold',
    example: 0.7,
    default: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  maxConfidence?: number;

  @ApiPropertyOptional({
    description: 'Filter by category type (CATMAT or CATSER)',
    example: 'CATMAT',
  })
  @IsOptional()
  @IsString()
  categoryType?: 'CATMAT' | 'CATSER';
}

/**
 * Query parameters for categories list endpoint.
 */
export class CategoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category type (CATMAT or CATSER)',
    example: 'CATMAT',
  })
  @IsOptional()
  @IsString()
  type?: 'CATMAT' | 'CATSER';

  @ApiPropertyOptional({
    description: 'Search term for category name or code',
    example: 'papel',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of categories to return',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  limit?: number;
}
