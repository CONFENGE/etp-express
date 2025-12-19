import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Request DTO for converting an analyzed document to ETP.
 */
export class ConvertToEtpDto {
 @ApiPropertyOptional({
 description:
 'Custom title for the ETP (optional, will be extracted from document if not provided)',
 example: 'ETP - Contratação de Serviços de TI',
 })
 @IsOptional()
 @IsString()
 title?: string;

 @ApiPropertyOptional({
 description: 'Additional metadata to include in the ETP',
 example: {
 unidadeRequisitante: 'Secretaria de Tecnologia',
 responsavelTecnico: 'João Silva',
 },
 })
 @IsOptional()
 @IsObject()
 metadata?: Record<string, unknown>;
}

/**
 * Response DTO for document to ETP conversion.
 */
export class ConvertToEtpResponseDto {
 @ApiProperty({
 description: 'ID of the created ETP',
 example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
 })
 etpId: string;

 @ApiProperty({
 description: 'Title of the created ETP',
 example: 'ETP - Contratação de Serviços de TI',
 })
 title: string;

 @ApiProperty({
 description: 'Status of the created ETP',
 example: 'draft',
 })
 status: string;

 @ApiProperty({
 description: 'Number of sections created from the document',
 example: 8,
 })
 sectionsCount: number;

 @ApiProperty({
 description: 'Number of sections mapped to known ETP types',
 example: 6,
 })
 mappedSectionsCount: number;

 @ApiProperty({
 description: 'Number of sections created as custom type',
 example: 2,
 })
 customSectionsCount: number;

 @ApiProperty({
 description: 'Timestamp of conversion',
 example: '2024-12-14T15:30:00.000Z',
 })
 convertedAt: Date;

 @ApiProperty({
 description: 'Success message',
 example: 'Documento convertido para ETP com sucesso.',
 })
 message: string;
}
