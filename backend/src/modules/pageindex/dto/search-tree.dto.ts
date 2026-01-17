import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

/**
 * DTO for tree search operations.
 *
 * @see Issue #1538 - Create PageIndex module
 */
export class SearchTreeDto {
  @ApiProperty({
    description: 'Natural language query to search for',
    example: 'Qual o limite para dispensa de licitação?',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum depth to traverse in the tree',
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDepth?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of nodes to return',
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxResults?: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold (0-1)',
    minimum: 0,
    maximum: 1,
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Include full content in results',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeContent?: boolean;
}

/**
 * DTO for searching a specific tree by ID.
 */
export class SearchTreeByIdDto extends SearchTreeDto {
  @ApiProperty({
    description: 'UUID of the document tree to search',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  treeId: string;
}
