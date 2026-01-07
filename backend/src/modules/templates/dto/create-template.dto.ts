import {
  IsString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EtpTemplateType } from '../../../entities/etp-template.entity';

/**
 * DTO para prompts de IA do template.
 */
export class TemplatePromptDto {
  @ApiProperty({ example: 'JUSTIFICATIVA' })
  @IsString()
  sectionType: string;

  @ApiProperty({
    example:
      'Você é um especialista em contratações públicas de obras de engenharia...',
  })
  @IsString()
  systemPrompt: string;

  @ApiProperty({
    example:
      'Gere a justificativa para a contratação de {objeto} considerando {contexto}',
  })
  @IsString()
  userPromptTemplate: string;
}

/**
 * DTO para criação de template de ETP.
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
export class CreateTemplateDto {
  @ApiProperty({
    example: 'Template para Obras de Engenharia',
    description: 'Nome do template (max: 200 caracteres)',
  })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(200, { message: 'Nome deve ter no máximo 200 caracteres' })
  name: string;

  @ApiProperty({
    example: 'OBRAS',
    description: 'Tipo de contratação',
    enum: EtpTemplateType,
  })
  @IsEnum(EtpTemplateType, {
    message: 'Tipo deve ser OBRAS, TI, SERVICOS ou MATERIAIS',
  })
  type: EtpTemplateType;

  @ApiProperty({
    example:
      'Template otimizado para contratações de obras de engenharia, incluindo campos específicos como ART/RRT e cronograma físico-financeiro.',
    description: 'Descrição detalhada do template',
  })
  @IsString()
  @MinLength(10, { message: 'Descrição deve ter no mínimo 10 caracteres' })
  description: string;

  @ApiProperty({
    example: ['objeto', 'justificativa', 'memorial_descritivo', 'cronograma'],
    description: 'Lista de campos obrigatórios',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Deve haver ao menos um campo obrigatório' })
  requiredFields: string[];

  @ApiPropertyOptional({
    example: ['art_rrt', 'planilha_orcamentaria'],
    description: 'Lista de campos opcionais',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalFields?: string[];

  @ApiProperty({
    example: ['IDENTIFICACAO', 'OBJETO', 'JUSTIFICATIVA', 'REQUISITOS'],
    description: 'Seções padrão do template',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Deve haver ao menos uma seção padrão' })
  defaultSections: string[];

  @ApiPropertyOptional({
    example: [
      {
        sectionType: 'JUSTIFICATIVA',
        systemPrompt: 'Você é especialista em obras...',
        userPromptTemplate: 'Gere justificativa para {objeto}',
      },
    ],
    description: 'Prompts de IA específicos para cada seção',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplatePromptDto)
  prompts?: TemplatePromptDto[];

  @ApiPropertyOptional({
    example: ['Lei 14.133/2021', 'SINAPI', 'SICRO'],
    description: 'Referências legais relevantes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  legalReferences?: string[];

  @ApiPropertyOptional({
    example: ['SINAPI', 'SICRO'],
    description: 'Fontes de preços preferenciais',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priceSourcesPreferred?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Se o template está ativo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
