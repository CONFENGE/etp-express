import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Tipo de contratacao para contexto da justificativa.
 */
export enum TipoContratacao {
  OBRAS = 'OBRAS',
  SERVICOS = 'SERVICOS',
  MATERIAIS = 'MATERIAIS',
  TI = 'TI',
  CONSULTORIA = 'CONSULTORIA',
  OUTRO = 'OUTRO',
}

/**
 * DTO para solicitacao de geracao de justificativa de metodologia.
 *
 * @see IN SEGES/ME n 65/2021 - Art. 7
 * @see Issue #1258 - [Pesquisa-d] Justificativa automatica de metodologia
 */
export class GerarJustificativaDto {
  @ApiPropertyOptional({
    description: 'Tipo de contratacao para contextualizacao',
    enum: TipoContratacao,
    example: TipoContratacao.MATERIAIS,
  })
  @IsOptional()
  @IsEnum(TipoContratacao)
  tipoContratacao?: TipoContratacao;

  @ApiPropertyOptional({
    description: 'Valor estimado da contratacao em reais',
    example: 150000.0,
  })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  @ApiPropertyOptional({
    description: 'Objeto da contratacao para contextualizacao',
    example: 'Aquisicao de equipamentos de informatica',
  })
  @IsOptional()
  @IsString()
  objeto?: string;

  @ApiPropertyOptional({
    description: 'Criterio de aceitabilidade de precos a ser utilizado',
    example: 'mediana',
    enum: ['media', 'mediana', 'menor_preco'],
  })
  @IsOptional()
  @IsString()
  criterioAceitabilidade?: 'media' | 'mediana' | 'menor_preco';
}

/**
 * DTO de resposta da geracao de justificativa.
 */
export class JustificativaGeradaDto {
  @ApiProperty({
    description: 'ID da pesquisa de precos',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  pesquisaId: string;

  @ApiProperty({
    description: 'Texto da justificativa gerada',
    example:
      'A pesquisa de precos foi realizada em conformidade com a IN SEGES/ME n 65/2021...',
  })
  justificativa: string;

  @ApiProperty({
    description: 'Fontes utilizadas na justificativa',
    example: ['SINAPI', 'PNCP'],
  })
  fontesUtilizadas: string[];

  @ApiProperty({
    description: 'Artigos da IN 65/2021 referenciados',
    example: ['Art. 5, III', 'Art. 5, II', 'Art. 6'],
  })
  artigosReferenciados: string[];

  @ApiProperty({
    description: 'Indica se a pesquisa foi atualizada',
    example: true,
  })
  pesquisaAtualizada: boolean;

  @ApiProperty({
    description: 'Duracao da geracao em milissegundos',
    example: 150,
  })
  duracaoMs: number;
}
