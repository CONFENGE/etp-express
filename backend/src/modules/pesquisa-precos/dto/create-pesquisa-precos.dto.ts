import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  IsDateString,
  MaxLength,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MetodologiaPesquisa,
  FonteConsultada,
  ItemPesquisado,
} from '../../../entities/pesquisa-precos.entity';

/**
 * DTO para fonte consultada na pesquisa de precos.
 */
export class FonteConsultadaDto implements FonteConsultada {
  @ApiProperty({
    description: 'Tipo da fonte conforme IN 65/2021',
    enum: MetodologiaPesquisa,
    example: MetodologiaPesquisa.PAINEL_PRECOS,
  })
  @IsEnum(MetodologiaPesquisa)
  tipo: MetodologiaPesquisa;

  @ApiProperty({
    description: 'Nome ou identificador da fonte',
    example: 'Painel de Precos Gov.br',
  })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({
    description: 'Data da consulta (YYYY-MM-DD)',
    example: '2026-01-11',
  })
  @IsDateString()
  dataConsulta: string;

  @ApiPropertyOptional({
    description: 'URL ou referencia da fonte',
    example: 'https://paineldeprecos.planejamento.gov.br/',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referencia?: string;

  @ApiPropertyOptional({
    description: 'Observacoes sobre a consulta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}

/**
 * DTO para preco coletado de uma fonte.
 */
export class PrecoColetadoDto {
  @ApiProperty({
    description: 'Nome da fonte do preco',
    example: 'Empresa ABC Ltda',
  })
  @IsString()
  @MaxLength(255)
  fonte: string;

  @ApiProperty({
    description: 'Valor do preco coletado',
    example: 150.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;

  @ApiProperty({
    description: 'Data da coleta (YYYY-MM-DD)',
    example: '2026-01-11',
  })
  @IsDateString()
  data: string;

  @ApiPropertyOptional({
    description: 'Observacao sobre o preco',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}

/**
 * DTO para item pesquisado com precos.
 */
export class ItemPesquisadoDto implements Omit<ItemPesquisado, 'precos'> {
  @ApiPropertyOptional({
    description: 'Codigo do item (CATMAT, CATSER)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @ApiProperty({
    description: 'Descricao do item',
    example: 'Computador desktop Core i7 16GB RAM 512GB SSD',
  })
  @IsString()
  @MaxLength(500)
  descricao: string;

  @ApiProperty({
    description: 'Unidade de medida',
    example: 'unidade',
  })
  @IsString()
  @MaxLength(50)
  unidade: string;

  @ApiProperty({
    description: 'Quantidade estimada',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  quantidade: number;

  @ApiProperty({
    description: 'Precos coletados de cada fonte',
    type: [PrecoColetadoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrecoColetadoDto)
  precos: PrecoColetadoDto[];

  @ApiPropertyOptional({
    description: 'Preco adotado para a pesquisa',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoAdotado?: number;

  @ApiPropertyOptional({
    description: 'Justificativa da escolha do preco',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justificativaPreco?: string;
}

/**
 * DTO para criacao de Pesquisa de Precos.
 *
 * @see IN SEGES/ME n 65/2021
 */
export class CreatePesquisaPrecosDto {
  @ApiProperty({
    description: 'Titulo da pesquisa de precos',
    example: 'Pesquisa de precos - Computadores desktop para o setor de TI',
  })
  @IsString()
  @MaxLength(255)
  titulo: string;

  @ApiPropertyOptional({
    description: 'ID do ETP vinculado (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  etpId?: string;

  @ApiPropertyOptional({
    description: 'ID do Termo de Referencia vinculado (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  termoReferenciaId?: string;

  @ApiPropertyOptional({
    description: 'Descricao do objeto da pesquisa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Numero do processo administrativo',
    example: '12345/2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroProcesso?: string;

  @ApiPropertyOptional({
    description: 'Metodologia principal conforme IN 65/2021',
    enum: MetodologiaPesquisa,
    default: MetodologiaPesquisa.PAINEL_PRECOS,
  })
  @IsOptional()
  @IsEnum(MetodologiaPesquisa)
  metodologia?: MetodologiaPesquisa;

  @ApiPropertyOptional({
    description: 'Metodologias complementares',
    type: [String],
    enum: MetodologiaPesquisa,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetodologiaPesquisa, { each: true })
  metodologiasComplementares?: MetodologiaPesquisa[];

  @ApiPropertyOptional({
    description: 'Justificativa da metodologia escolhida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  justificativaMetodologia?: string;

  @ApiPropertyOptional({
    description: 'Lista de fontes consultadas',
    type: [FonteConsultadaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FonteConsultadaDto)
  fontesConsultadas?: FonteConsultadaDto[];

  @ApiPropertyOptional({
    description: 'Lista de itens pesquisados',
    type: [ItemPesquisadoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPesquisadoDto)
  itens?: ItemPesquisadoDto[];

  @ApiPropertyOptional({
    description: 'Criterio de aceitabilidade de precos',
    example: 'menor_preco',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  criterioAceitabilidade?: string;

  @ApiPropertyOptional({
    description: 'Justificativa do criterio de aceitabilidade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificativaCriterio?: string;

  @ApiPropertyOptional({
    description: 'Mapa comparativo de precos (estrutura JSON)',
  })
  @IsOptional()
  @IsObject()
  mapaComparativo?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Data de validade dos precos (YYYY-MM-DD)',
    example: '2026-04-11',
  })
  @IsOptional()
  @IsDateString()
  dataValidade?: string;
}
