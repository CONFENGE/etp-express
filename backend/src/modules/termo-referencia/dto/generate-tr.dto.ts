import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TermoReferenciaStatus } from '../../../entities/termo-referencia.entity';

/**
 * DTO de resposta para geracao de TR a partir de ETP.
 *
 * Issue #1249 - [TR-b] Implementar geracao automatica TR a partir do ETP
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export class GenerateTrResponseDto {
  @ApiProperty({
    description: 'ID do Termo de Referencia gerado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID do ETP de origem',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  etpId: string;

  @ApiProperty({
    description: 'Objeto da contratacao',
    example: 'Contratacao de servicos de desenvolvimento de software',
  })
  objeto: string;

  @ApiPropertyOptional({
    description: 'Fundamentacao legal',
    example: 'Lei 14.133/2021, art. 75, inciso II',
  })
  fundamentacaoLegal?: string;

  @ApiPropertyOptional({
    description: 'Descricao da solucao',
  })
  descricaoSolucao?: string;

  @ApiPropertyOptional({
    description: 'Requisitos da contratacao',
  })
  requisitosContratacao?: string;

  @ApiPropertyOptional({
    description: 'Modelo de execucao',
  })
  modeloExecucao?: string;

  @ApiPropertyOptional({
    description: 'Modelo de gestao',
  })
  modeloGestao?: string;

  @ApiPropertyOptional({
    description: 'Criterios de selecao',
  })
  criteriosSelecao?: string;

  @ApiPropertyOptional({
    description: 'Valor estimado',
    example: 150000.0,
  })
  valorEstimado?: number;

  @ApiPropertyOptional({
    description: 'Dotacao orcamentaria',
  })
  dotacaoOrcamentaria?: string;

  @ApiPropertyOptional({
    description: 'Prazo de vigencia em dias',
    example: 365,
  })
  prazoVigencia?: number;

  @ApiPropertyOptional({
    description: 'Obrigacoes do contratante',
  })
  obrigacoesContratante?: string;

  @ApiPropertyOptional({
    description: 'Obrigacoes da contratada',
  })
  obrigacoesContratada?: string;

  @ApiPropertyOptional({
    description: 'Sancoes e penalidades',
  })
  sancoesPenalidades?: string;

  @ApiProperty({
    description: 'Status do TR',
    enum: TermoReferenciaStatus,
    example: TermoReferenciaStatus.DRAFT,
  })
  status: TermoReferenciaStatus;

  @ApiProperty({
    description: 'Versao do documento',
    example: 1,
  })
  versao: number;

  @ApiProperty({
    description: 'Data de criacao',
    example: '2026-01-11T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Metadados da geracao (tokens usados, modelo, latencia)',
  })
  metadata?: {
    tokens?: number;
    model?: string;
    latencyMs?: number;
    aiEnhanced?: boolean;
  };
}
