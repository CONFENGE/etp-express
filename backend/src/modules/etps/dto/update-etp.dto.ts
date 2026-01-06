import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EtpStatus } from '../../../entities/etp.entity';
import { ResponsavelTecnicoDto } from './create-etp.dto';

export class UpdateEtpDto {
  @ApiPropertyOptional({
    example: 'ETP - Contratação de Serviços de TI (Atualizado)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada do estudo técnico' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Objeto atualizado da contratação' })
  @IsOptional()
  @IsString()
  objeto?: string;

  @ApiPropertyOptional({ example: '2023/001234' })
  @IsOptional()
  @IsString()
  numeroProcesso?: string;

  @ApiPropertyOptional({ example: 550000.0 })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  @ApiPropertyOptional({ enum: EtpStatus })
  @IsOptional()
  @IsEnum(EtpStatus)
  status?: EtpStatus;

  @ApiPropertyOptional({
    example: {
      orgao: 'Ministério da Economia',
      tags: ['TI', 'Desenvolvimento', 'Urgente'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    orgao?: string;
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: unknown;
  };

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
}
