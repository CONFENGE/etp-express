import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Interface para preco de uma fonte no mapa comparativo.
 *
 * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
 */
export class PrecoFonteMapaDto {
  @ApiProperty({
    description: 'Nome da fonte',
    example: 'SINAPI',
  })
  fonte: string;

  @ApiProperty({
    description: 'Valor do preco',
    example: 150.5,
  })
  valor: number;

  @ApiProperty({
    description: 'Data da coleta',
    example: '2026-01-11',
  })
  data: string;

  @ApiPropertyOptional({
    description: 'Indica se e outlier (fora de 2 desvios padrao)',
    example: false,
  })
  isOutlier?: boolean;
}

/**
 * Interface para item no mapa comparativo.
 *
 * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
 */
export class ItemMapaComparativoDto {
  @ApiPropertyOptional({
    description: 'Codigo do item (CATMAT, CATSER)',
    example: '123456',
  })
  codigo?: string;

  @ApiProperty({
    description: 'Descricao do item',
    example: 'Cimento Portland CP-II 50kg',
  })
  descricao: string;

  @ApiProperty({
    description: 'Unidade de medida',
    example: 'SC',
  })
  unidade: string;

  @ApiProperty({
    description: 'Quantidade estimada',
    example: 100,
  })
  quantidade: number;

  @ApiProperty({
    description: 'Precos de cada fonte',
    type: [PrecoFonteMapaDto],
  })
  fontes: PrecoFonteMapaDto[];

  @ApiProperty({
    description: 'Media dos precos (excluindo outliers)',
    example: 145.25,
  })
  media: number;

  @ApiProperty({
    description: 'Mediana dos precos',
    example: 142.0,
  })
  mediana: number;

  @ApiProperty({
    description: 'Menor preco encontrado',
    example: 135.0,
  })
  menorPreco: number;

  @ApiProperty({
    description: 'Maior preco encontrado',
    example: 165.0,
  })
  maiorPreco: number;

  @ApiProperty({
    description: 'Desvio padrao dos precos',
    example: 12.5,
  })
  desvioPadrao: number;

  @ApiProperty({
    description: 'Coeficiente de variacao (%)',
    example: 8.6,
  })
  coeficienteVariacao: number;

  @ApiProperty({
    description: 'Preco adotado/sugerido',
    example: 142.0,
  })
  precoAdotado: number;

  @ApiPropertyOptional({
    description: 'Justificativa do preco adotado',
    example: 'Adotada a mediana conforme IN SEGES/ME n 65/2021',
  })
  justificativa?: string;

  @ApiProperty({
    description: 'Valor total do item (preco adotado * quantidade)',
    example: 14200.0,
  })
  valorTotal: number;

  @ApiProperty({
    description: 'Quantidade de fontes com preco valido',
    example: 3,
  })
  quantidadeFontes: number;

  @ApiPropertyOptional({
    description: 'Quantidade de outliers excluidos',
    example: 1,
  })
  outliersExcluidos?: number;
}

/**
 * Interface para resumo do mapa comparativo.
 *
 * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
 */
export class ResumoMapaComparativoDto {
  @ApiProperty({
    description: 'Total de itens pesquisados',
    example: 10,
  })
  totalItens: number;

  @ApiProperty({
    description: 'Total de fontes consultadas',
    example: 3,
  })
  totalFontes: number;

  @ApiProperty({
    description: 'Nomes das fontes consultadas',
    example: ['SINAPI', 'SICRO', 'PNCP'],
  })
  fontes: string[];

  @ApiProperty({
    description: 'Valor total estimado (soma dos valores adotados)',
    example: 125000.0,
  })
  valorTotalEstimado: number;

  @ApiProperty({
    description: 'Menor valor total possivel',
    example: 110000.0,
  })
  menorValorTotal: number;

  @ApiProperty({
    description: 'Economia potencial (diferenca entre adotado e menor)',
    example: 15000.0,
  })
  economiaPotencial: number;

  @ApiProperty({
    description: 'Media geral de precos',
    example: 12500.0,
  })
  mediaGeral: number;

  @ApiProperty({
    description: 'Coeficiente de variacao geral (%)',
    example: 15.3,
  })
  coeficienteVariacaoGeral: number;

  @ApiProperty({
    description: 'Data de geracao do mapa',
    example: '2026-01-11T10:30:00Z',
  })
  dataGeracao: string;

  @ApiProperty({
    description: 'Versao do mapa',
    example: 1,
  })
  versao: number;
}

/**
 * Interface completa do mapa comparativo de precos.
 *
 * Estrutura conforme IN SEGES/ME n 65/2021 para apresentacao
 * de pesquisa de precos em formato tabular.
 *
 * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
 */
export class MapaComparativoDto {
  @ApiProperty({
    description: 'Lista de itens com precos comparados',
    type: [ItemMapaComparativoDto],
  })
  itens: ItemMapaComparativoDto[];

  @ApiProperty({
    description: 'Resumo estatistico do mapa',
    type: ResumoMapaComparativoDto,
  })
  resumo: ResumoMapaComparativoDto;

  @ApiPropertyOptional({
    description: 'Metodologia aplicada para calculo',
    example:
      'Precos calculados com base na mediana, excluindo outliers (> 2 desvios padrao)',
  })
  metodologia?: string;

  @ApiPropertyOptional({
    description: 'Referencia legal aplicada',
    example: 'IN SEGES/ME n 65/2021 e Lei 14.133/2021',
  })
  referenciaLegal?: string;
}

/**
 * DTO de resposta ao gerar mapa comparativo.
 *
 * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
 */
export class GerarMapaComparativoResponseDto {
  @ApiProperty({
    description: 'ID da pesquisa de precos',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  pesquisaId: string;

  @ApiProperty({
    description: 'Mapa comparativo gerado',
    type: MapaComparativoDto,
  })
  mapaComparativo: MapaComparativoDto;

  @ApiProperty({
    description: 'Indica se a pesquisa foi atualizada com o mapa',
    example: true,
  })
  pesquisaAtualizada: boolean;

  @ApiProperty({
    description: 'Duracao da geracao em millisegundos',
    example: 150,
  })
  duracaoMs: number;
}
