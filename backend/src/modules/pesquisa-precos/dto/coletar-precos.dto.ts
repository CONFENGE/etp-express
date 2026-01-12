import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  MaxLength,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MetodologiaPesquisa,
  FonteConsultada,
  ItemPesquisado,
} from '../../../entities/pesquisa-precos.entity';

/**
 * DTO para item a ser pesquisado na coleta de precos.
 */
export class ItemParaPesquisaDto {
  @ApiProperty({
    description: 'Descricao do item para pesquisa',
    example: 'Cimento Portland CP-II 50kg',
  })
  @IsString()
  @MaxLength(500)
  descricao: string;

  @ApiProperty({
    description: 'Quantidade estimada do item',
    example: 100,
  })
  @IsNumber()
  @Min(0)
  quantidade: number;

  @ApiProperty({
    description: 'Unidade de medida',
    example: 'SC',
  })
  @IsString()
  @MaxLength(50)
  unidade: string;

  @ApiPropertyOptional({
    description: 'Codigo CATMAT/CATSER do item',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;
}

/**
 * DTO para opcoes de coleta de precos.
 */
export class ColetaOptionsDto {
  @ApiPropertyOptional({
    description: 'UF para filtrar precos (default: DF)',
    example: 'DF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @ApiPropertyOptional({
    description: 'Excluir outliers na agregacao (default: true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  excluirOutliers?: boolean;

  @ApiPropertyOptional({
    description: 'Timeout por fonte em ms (default: 30000, max: 60000)',
    example: 30000,
    minimum: 5000,
    maximum: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(60000)
  timeoutMs?: number;
}

/**
 * DTO para request de coleta de precos.
 *
 * @see Issue #1415 - [Pesquisa-b4] Endpoint e testes de integracao para coleta multi-fonte
 */
export class ColetarPrecosDto {
  @ApiProperty({
    description: 'Lista de itens para pesquisar precos',
    type: [ItemParaPesquisaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemParaPesquisaDto)
  itens: ItemParaPesquisaDto[];

  @ApiPropertyOptional({
    description: 'Opcoes de coleta',
    type: ColetaOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColetaOptionsDto)
  options?: ColetaOptionsDto;
}

/**
 * DTO para resultado de coleta de um item.
 */
export class ItemColetaResultDto {
  @ApiProperty({
    description: 'Item pesquisado com precos coletados',
  })
  item: ItemPesquisado;

  @ApiProperty({
    description: 'Fontes consultadas com sucesso',
    type: [Object],
  })
  fontesConsultadas: FonteConsultada[];

  @ApiProperty({
    description: 'Total de fontes que retornaram precos',
    example: 3,
  })
  totalFontes: number;

  @ApiProperty({
    description: 'Nivel de confianca baseado em fontes e variancia',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'MEDIUM',
  })
  confianca: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({
    description: 'Metodologia sugerida baseada nas fontes',
    enum: MetodologiaPesquisa,
  })
  metodologiaSugerida: MetodologiaPesquisa;

  @ApiProperty({
    description: 'Duracao da coleta em ms',
    example: 1500,
  })
  duracaoMs: number;
}

/**
 * DTO para response da coleta de precos.
 *
 * @see Issue #1415 - [Pesquisa-b4] Endpoint e testes de integracao para coleta multi-fonte
 */
export class ColetaPrecosResultDto {
  @ApiProperty({
    description: 'ID da pesquisa de precos',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  pesquisaId: string;

  @ApiProperty({
    description: 'Resultados da coleta por item',
    type: [ItemColetaResultDto],
  })
  resultados: ItemColetaResultDto[];

  @ApiProperty({
    description: 'Total de itens processados',
    example: 5,
  })
  totalItens: number;

  @ApiProperty({
    description: 'Total de itens com precos encontrados',
    example: 4,
  })
  itensComPrecos: number;

  @ApiProperty({
    description: 'Todas as fontes consultadas consolidadas',
    type: [Object],
  })
  fontesConsolidadas: FonteConsultada[];

  @ApiProperty({
    description: 'Confianca geral da coleta',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'MEDIUM',
  })
  confiancaGeral: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({
    description: 'Duracao total da coleta em ms',
    example: 5000,
  })
  duracaoTotalMs: number;

  @ApiProperty({
    description: 'Indica se a pesquisa foi atualizada com os novos itens',
    example: true,
  })
  pesquisaAtualizada: boolean;
}
