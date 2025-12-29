import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EtpStatus } from '../../../entities/etp.entity';

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

  /**
   * Version number for optimistic locking (Issue #1059).
   * Must match current version in database, otherwise 409 Conflict is returned.
   * Client should send the version received from last GET request.
   */
  @ApiPropertyOptional({
    example: 1,
    description:
      'Version number for optimistic locking. Must match current DB version.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
