import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEtpDto {
  @ApiProperty({ example: 'ETP - Contratação de Serviços de TI' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Estudo técnico para contratação de desenvolvimento de software' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Contratação de empresa especializada em desenvolvimento de sistemas web' })
  @IsString()
  objeto: string;

  @ApiPropertyOptional({ example: '2023/001234' })
  @IsOptional()
  @IsString()
  numeroProcesso?: string;

  @ApiPropertyOptional({ example: 500000.00 })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  @ApiPropertyOptional({
    example: {
      orgao: 'Ministério da Economia',
      unidadeRequisitante: 'Secretaria de Tecnologia',
      responsavelTecnico: 'João Silva',
      tags: ['TI', 'Desenvolvimento'],
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
    [key: string]: any;
  };
}
