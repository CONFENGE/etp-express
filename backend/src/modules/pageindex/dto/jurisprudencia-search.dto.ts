import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Tribunal } from '../interfaces/jurisprudencia.interface';

/**
 * DTO for jurisprudence search queries.
 *
 * Supports search by:
 * - Text (semantic search via TreeSearchService)
 * - Theme (ETP, pesquisa de precos, contratos, etc.)
 * - Tribunal (TCE-SP, TCU)
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 */
export class JurisprudenciaSearchDto {
  @ApiProperty({
    description: 'Search query (natural language or keywords)',
    example: 'dispensa de licitação valores',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by tribunal',
    enum: ['TCE-SP', 'TCU'],
    example: 'TCU',
  })
  @IsOptional()
  @IsEnum(['TCE-SP', 'TCU'] as const)
  tribunal?: Tribunal;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold (0-1)',
    minimum: 0,
    maximum: 1,
    default: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Include full content in results',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeContent?: boolean;
}

/**
 * DTO for theme-based jurisprudence search.
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 */
export class JurisprudenciaThemeSearchDto {
  @ApiProperty({
    description: 'Theme to search for',
    example: 'Lei 14.133/2021 > ETP',
    examples: [
      'Licitacao',
      'Licitacao > Dispensas e Inexigibilidades',
      'Lei 14.133/2021 > ETP',
      'Lei 14.133/2021 > Pesquisa de Precos',
      'Contratos',
      'Contratos > Formalizacao',
    ],
  })
  @IsString()
  @MinLength(3)
  theme: string;

  @ApiPropertyOptional({
    description: 'Filter by tribunal',
    enum: ['TCE-SP', 'TCU'],
  })
  @IsOptional()
  @IsEnum(['TCE-SP', 'TCU'] as const)
  tribunal?: Tribunal;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
