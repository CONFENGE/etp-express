import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectionType } from '../../../entities/etp-section.entity';

export class GenerateSectionDto {
  @ApiProperty({ enum: SectionType, example: SectionType.JUSTIFICATIVA })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiProperty({ example: 'Justificativa da Contratação' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example:
      'A contratação se faz necessária para modernizar os sistemas internos...',
  })
  @IsOptional()
  @IsString()
  userInput?: string;

  @ApiPropertyOptional({
    example: {
      contexto: 'Órgão público federal',
      prazo: 'urgente',
      referencias: ['Lei 14.133/2021'],
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
