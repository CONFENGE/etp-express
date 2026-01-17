import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * Supported document types for PageIndex indexing.
 */
export enum DocumentType {
  LEGISLATION = 'legislation',
  CONTRACT = 'contract',
  EDITAL = 'edital',
  TERMO_REFERENCIA = 'tr',
  ETP = 'etp',
  OTHER = 'other',
}

/**
 * DTO for indexing a document with PageIndex.
 *
 * @see Issue #1538 - Create PageIndex module
 */
export class IndexDocumentDto {
  @ApiProperty({
    description: 'Human-readable name for the document',
    example: 'Lei 14.133/2021 - Nova Lei de Licitações',
  })
  @IsString()
  @MaxLength(500)
  documentName: string;

  @ApiPropertyOptional({
    description: 'Path to the document file (server-side)',
    example: '/uploads/documents/lei-14133-2021.pdf',
  })
  @IsOptional()
  @IsString()
  documentPath?: string;

  @ApiPropertyOptional({
    description: 'Raw text content of the document (alternative to path)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'URL to fetch the document from',
    example:
      'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm',
  })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Type of document for specialized processing',
    enum: DocumentType,
    default: DocumentType.OTHER,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}
