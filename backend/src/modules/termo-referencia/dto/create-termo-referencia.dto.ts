import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para criacao de Termo de Referencia.
 * Campos obrigatorios: etpId e objeto.
 */
export class CreateTermoReferenciaDto {
  @ApiProperty({
    description: 'ID do ETP que origina este Termo de Referencia',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  etpId: string;

  @ApiProperty({
    description: 'Definicao do objeto da contratacao',
    example: 'Contratacao de servicos de desenvolvimento de software',
  })
  @IsString()
  @MaxLength(5000)
  objeto: string;

  @ApiPropertyOptional({
    description: 'Fundamentacao legal da contratacao',
    example: 'Lei 14.133/2021, art. 75, inciso II',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fundamentacaoLegal?: string;

  @ApiPropertyOptional({
    description: 'Descricao da solucao como um todo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descricaoSolucao?: string;

  @ApiPropertyOptional({
    description: 'Requisitos da contratacao',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  requisitosContratacao?: string;

  @ApiPropertyOptional({
    description: 'Modelo de execucao do objeto',
    example: 'Execucao continuada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  modeloExecucao?: string;

  @ApiPropertyOptional({
    description: 'Modelo de gestao do contrato',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  modeloGestao?: string;

  @ApiPropertyOptional({
    description: 'Criterios de selecao do fornecedor',
    example: 'Menor preco global',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  criteriosSelecao?: string;

  @ApiPropertyOptional({
    description: 'Valor estimado da contratacao',
    example: 150000.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valorEstimado?: number;

  @ApiPropertyOptional({
    description: 'Dotacao orcamentaria',
    example: '02.031.0001.2001.339039',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dotacaoOrcamentaria?: string;

  @ApiPropertyOptional({
    description: 'Prazo de vigencia do contrato em dias',
    example: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  prazoVigencia?: number;

  @ApiPropertyOptional({
    description: 'Obrigacoes do contratante',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  obrigacoesContratante?: string;

  @ApiPropertyOptional({
    description: 'Obrigacoes da contratada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  obrigacoesContratada?: string;

  @ApiPropertyOptional({
    description: 'Sancoes e penalidades',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  sancoesPenalidades?: string;

  @ApiPropertyOptional({
    description: 'Cronograma de execucao (JSON)',
    example: { etapas: [{ nome: 'Fase 1', prazo: 30 }] },
  })
  @IsOptional()
  @IsObject()
  cronograma?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Especificacoes tecnicas detalhadas (JSON)',
  })
  @IsOptional()
  @IsObject()
  especificacoesTecnicas?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Local de entrega ou execucao',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  localExecucao?: string;

  @ApiPropertyOptional({
    description: 'Garantia contratual exigida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  garantiaContratual?: string;

  @ApiPropertyOptional({
    description: 'Condicoes de pagamento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  condicoesPagamento?: string;

  @ApiPropertyOptional({
    description: 'Regras de subcontratacao',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subcontratacao?: string;
}
