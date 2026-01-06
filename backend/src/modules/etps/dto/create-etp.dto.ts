import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para responsável técnico do ETP.
 * Issue #1223 - Campos de Identificação
 */
export class ResponsavelTecnicoDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(200, { message: 'Nome deve ter no máximo 200 caracteres' })
  nome: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Matrícula deve ter no máximo 50 caracteres' })
  matricula?: string;
}

export class CreateEtpDto {
  @ApiProperty({ example: 'ETP - Contratação de Serviços de TI' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Estudo técnico para contratação de desenvolvimento de software',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example:
      'Contratação de empresa especializada em desenvolvimento de sistemas web',
  })
  @IsString()
  objeto: string;

  @ApiPropertyOptional({ example: '2023/001234' })
  @IsOptional()
  @IsString()
  numeroProcesso?: string;

  @ApiPropertyOptional({ example: 500000.0 })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  // ============================================
  // Campos de Identificação (Issue #1223)
  // ============================================

  @ApiPropertyOptional({ example: 'Secretaria Municipal de Tecnologia' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Órgão/Entidade deve ter no mínimo 3 caracteres' })
  @MaxLength(200, {
    message: 'Órgão/Entidade deve ter no máximo 200 caracteres',
  })
  orgaoEntidade?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Código UASG - 6 dígitos numéricos',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'UASG deve conter exatamente 6 dígitos numéricos',
  })
  uasg?: string;

  @ApiPropertyOptional({ example: 'Departamento de Infraestrutura de TI' })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Unidade demandante deve ter no máximo 200 caracteres',
  })
  unidadeDemandante?: string;

  @ApiPropertyOptional({
    example: { nome: 'João Silva', matricula: '12345' },
    description: 'Responsável técnico pela elaboração do ETP',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelTecnicoDto)
  responsavelTecnico?: ResponsavelTecnicoDto;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Data de elaboração do ETP (formato ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Data de elaboração deve estar no formato ISO 8601 (YYYY-MM-DD)',
    },
  )
  dataElaboracao?: string;

  // ============================================
  // Fim dos Campos de Identificação
  // ============================================

  @ApiPropertyOptional({
    example: {
      unidadeRequisitante: 'Secretaria de Tecnologia',
      responsavelTecnico: 'João Silva',
      tags: ['TI', 'Desenvolvimento'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: unknown;
  };
}
