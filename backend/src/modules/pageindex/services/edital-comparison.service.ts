/**
 * Edital Comparison Service
 *
 * Service for comparing extracted edital data to identify differences,
 * analyze competitive positioning, and provide insights for bid preparation.
 *
 * Features:
 * - Compare two editais side-by-side
 * - Multi-edital price analysis with statistical anomaly detection (Z-score)
 * - Identify price differences and competitive opportunities
 * - Analyze requirement changes between versions
 * - Generate comparative reports
 *
 * @module modules/pageindex/services/edital-comparison
 * @see Issue #1697 - [INTEL-1545d] Implementar EditalComparisonService para análise de preços
 * @see Issue #1698 - Create REST API for edital extraction and comparison
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  EditalExtractedData,
  EditalLote,
  EditalItem,
} from '../dto/edital-extracted-data.dto';
import {
  ComparisonReport,
  ItemComparado,
  OutlierDetection,
  AnomaliaCategoria,
} from '../dto/comparison-report.dto';
import {
  EditalItemNormalizationService,
  NormalizedEditalItem,
} from './edital-item-normalization.service';

/**
 * Result of comparing two editais
 */
export interface EditalComparisonResult {
  /**
   * Summary of comparison
   */
  summary: {
    totalItemsA: number;
    totalItemsB: number;
    matchingItems: number;
    uniqueToA: number;
    uniqueToB: number;
    averagePriceDifferencePercent?: number;
  };

  /**
   * Detailed item-by-item comparison
   */
  itemComparisons: ItemComparison[];

  /**
   * Comparative insights and recommendations
   */
  insights: string[];

  /**
   * Metadata about the comparison
   */
  metadata: {
    editalA: {
      tipo: string;
      objeto: string;
      valorTotal?: number;
    };
    editalB: {
      tipo: string;
      objeto: string;
      valorTotal?: number;
    };
    comparedAt: string;
  };
}

/**
 * Comparison of a single item
 */
export interface ItemComparison {
  codigo: string;
  descricao: string;
  status: 'matching' | 'unique_to_a' | 'unique_to_b' | 'price_difference';
  quantidadeA?: number;
  quantidadeB?: number;
  precoUnitarioA?: number;
  precoUnitarioB?: number;
  precoTotalA?: number;
  precoTotalB?: number;
  priceDifferencePercent?: number;
  priceDifferenceAbsolute?: number;
}

/**
 * EditalComparisonService - Compare extracted editais
 *
 * @example
 * ```typescript
 * const comparison = await editalComparisonService.compareEditais(
 *   editalDataA,
 *   editalDataB
 * );
 *
 * console.log(`Matching items: ${comparison.summary.matchingItems}`);
 * console.log(`Insights: ${comparison.insights.join('\n')}`);
 * ```
 */
@Injectable()
export class EditalComparisonService {
  private readonly logger = new Logger(EditalComparisonService.name);

  constructor(
    private readonly normalizationService: EditalItemNormalizationService,
  ) {}

  /**
   * Compare two extracted editais.
   *
   * @param editalA - First edital data
   * @param editalB - Second edital data
   * @returns Comparison result with detailed analysis
   */
  compareEditais(
    editalA: EditalExtractedData,
    editalB: EditalExtractedData,
  ): EditalComparisonResult {
    this.logger.log('Starting edital comparison');

    // Flatten items from all lotes for both editais
    const itemsA = this.flattenItems(editalA.lotes);
    const itemsB = this.flattenItems(editalB.lotes);

    // Build comparison map by item codigo
    const itemMapA = new Map<string, EditalItem>();
    const itemMapB = new Map<string, EditalItem>();

    itemsA.forEach((item) => itemMapA.set(item.codigo, item));
    itemsB.forEach((item) => itemMapB.set(item.codigo, item));

    // Perform item-by-item comparison
    const itemComparisons: ItemComparison[] = [];
    const allCodes = new Set([...itemMapA.keys(), ...itemMapB.keys()]);

    let matchingCount = 0;
    let uniqueToACount = 0;
    let uniqueToBCount = 0;
    let totalPriceDiff = 0;
    let priceDiffCount = 0;

    allCodes.forEach((codigo) => {
      const itemA = itemMapA.get(codigo);
      const itemB = itemMapB.get(codigo);

      if (itemA && itemB) {
        // Both have this item - compare prices
        const comparison = this.compareItems(itemA, itemB);
        itemComparisons.push(comparison);
        matchingCount++;

        if (comparison.priceDifferencePercent !== undefined) {
          totalPriceDiff += Math.abs(comparison.priceDifferencePercent);
          priceDiffCount++;
        }
      } else if (itemA && !itemB) {
        // Item only in A
        itemComparisons.push({
          codigo: itemA.codigo,
          descricao: itemA.descricao,
          status: 'unique_to_a',
          quantidadeA: itemA.quantidade,
          precoUnitarioA: itemA.precoUnitario,
          precoTotalA: itemA.precoTotal,
        });
        uniqueToACount++;
      } else if (!itemA && itemB) {
        // Item only in B
        itemComparisons.push({
          codigo: itemB.codigo,
          descricao: itemB.descricao,
          status: 'unique_to_b',
          quantidadeB: itemB.quantidade,
          precoUnitarioB: itemB.precoUnitario,
          precoTotalB: itemB.precoTotal,
        });
        uniqueToBCount++;
      }
    });

    // Sort comparisons: price differences first, then matching, then unique
    itemComparisons.sort((a, b) => {
      const statusOrder = {
        price_difference: 0,
        matching: 1,
        unique_to_a: 2,
        unique_to_b: 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    // Generate insights
    const insights = this.generateInsights(
      editalA,
      editalB,
      itemComparisons,
      matchingCount,
      uniqueToACount,
      uniqueToBCount,
    );

    const averagePriceDifferencePercent =
      priceDiffCount > 0 ? totalPriceDiff / priceDiffCount : undefined;

    this.logger.log(
      `Comparison completed: ${matchingCount} matching, ${uniqueToACount} unique to A, ${uniqueToBCount} unique to B`,
    );

    return {
      summary: {
        totalItemsA: itemsA.length,
        totalItemsB: itemsB.length,
        matchingItems: matchingCount,
        uniqueToA: uniqueToACount,
        uniqueToB: uniqueToBCount,
        averagePriceDifferencePercent,
      },
      itemComparisons,
      insights,
      metadata: {
        editalA: {
          tipo: editalA.tipo,
          objeto: editalA.objeto,
          valorTotal: editalA.valorTotal,
        },
        editalB: {
          tipo: editalB.tipo,
          objeto: editalB.objeto,
          valorTotal: editalB.valorTotal,
        },
        comparedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Flatten items from all lotes into a single array.
   *
   * @param lotes - Array of lotes
   * @returns Flattened array of items
   */
  private flattenItems(lotes: EditalLote[]): EditalItem[] {
    return lotes.flatMap((lote) => lote.itens);
  }

  /**
   * Compare two items that have the same codigo.
   *
   * @param itemA - Item from edital A
   * @param itemB - Item from edital B
   * @returns Item comparison result
   */
  private compareItems(itemA: EditalItem, itemB: EditalItem): ItemComparison {
    const hasPrice =
      itemA.precoUnitario !== undefined && itemB.precoUnitario !== undefined;

    let priceDifferencePercent: number | undefined;
    let priceDifferenceAbsolute: number | undefined;
    let status: ItemComparison['status'] = 'matching';

    if (hasPrice) {
      const priceA = itemA.precoUnitario!;
      const priceB = itemB.precoUnitario!;
      priceDifferenceAbsolute = priceB - priceA;
      priceDifferencePercent = ((priceB - priceA) / priceA) * 100;

      // Consider significant if difference > 5%
      if (Math.abs(priceDifferencePercent) > 5) {
        status = 'price_difference';
      }
    }

    return {
      codigo: itemA.codigo,
      descricao: itemA.descricao,
      status,
      quantidadeA: itemA.quantidade,
      quantidadeB: itemB.quantidade,
      precoUnitarioA: itemA.precoUnitario,
      precoUnitarioB: itemB.precoUnitario,
      precoTotalA: itemA.precoTotal,
      precoTotalB: itemB.precoTotal,
      priceDifferencePercent,
      priceDifferenceAbsolute,
    };
  }

  /**
   * Generate insights and recommendations based on comparison results.
   *
   * @param editalA - First edital data
   * @param editalB - Second edital data
   * @param itemComparisons - Item-by-item comparisons
   * @param matchingCount - Number of matching items
   * @param uniqueToACount - Number of unique items in A
   * @param uniqueToBCount - Number of unique items in B
   * @returns Array of insight strings
   */
  private generateInsights(
    editalA: EditalExtractedData,
    editalB: EditalExtractedData,
    itemComparisons: ItemComparison[],
    matchingCount: number,
    uniqueToACount: number,
    uniqueToBCount: number,
  ): string[] {
    const insights: string[] = [];

    // Insight 1: Scope similarity
    const totalItemsA = itemComparisons.length - uniqueToBCount;
    const totalItemsB = itemComparisons.length - uniqueToACount;
    const totalItems = Math.max(totalItemsA, totalItemsB);
    const similarityPercent = (matchingCount / totalItems) * 100;

    insights.push(
      `Similaridade de escopo: ${similarityPercent.toFixed(1)}% (${matchingCount} itens comuns de ${totalItems} totais)`,
    );

    // Insight 2: Price competitiveness
    const priceComparisons = itemComparisons.filter(
      (c) =>
        c.status === 'price_difference' &&
        c.priceDifferencePercent !== undefined,
    );

    if (priceComparisons.length > 0) {
      const lowerPricesA = priceComparisons.filter(
        (c) => c.priceDifferencePercent! < 0,
      ).length;
      const lowerPricesB = priceComparisons.filter(
        (c) => c.priceDifferencePercent! > 0,
      ).length;

      if (lowerPricesA > lowerPricesB) {
        insights.push(
          `Edital A tem preços mais competitivos em ${lowerPricesA} de ${priceComparisons.length} itens com diferença significativa`,
        );
      } else if (lowerPricesB > lowerPricesA) {
        insights.push(
          `Edital B tem preços mais competitivos em ${lowerPricesB} de ${priceComparisons.length} itens com diferença significativa`,
        );
      } else {
        insights.push(
          `Preços similares entre os editais para itens com diferença significativa`,
        );
      }
    }

    // Insight 3: Total value comparison
    if (editalA.valorTotal && editalB.valorTotal) {
      const valueDiff = editalB.valorTotal - editalA.valorTotal;
      const valueDiffPercent = (valueDiff / editalA.valorTotal) * 100;

      if (Math.abs(valueDiffPercent) > 10) {
        insights.push(
          `Valor total: Edital ${valueDiff > 0 ? 'B' : 'A'} é ${Math.abs(valueDiffPercent).toFixed(1)}% ${valueDiff > 0 ? 'maior' : 'menor'}`,
        );
      }
    }

    // Insight 4: Unique items analysis
    if (uniqueToACount > 0) {
      insights.push(
        `Edital A contém ${uniqueToACount} item(ns) não presente(s) no Edital B - oportunidade de diferenciação`,
      );
    }

    if (uniqueToBCount > 0) {
      insights.push(
        `Edital B contém ${uniqueToBCount} item(ns) não presente(s) no Edital A - atenção aos requisitos adicionais`,
      );
    }

    return insights;
  }

  /**
   * Compare multiple editais for price analysis and anomaly detection.
   *
   * This method analyzes prices across multiple editais to detect anomalies
   * using statistical methods (Z-score). It groups similar items and calculates
   * statistical metrics to identify potential overpricing.
   *
   * Algorithm:
   * 1. Normalize all items from all editais
   * 2. Group items by matching key
   * 3. For each group, calculate: mean, median, std dev, min, max
   * 4. Detect outliers using Z-score (> 2 std devs = alert, > 3 = sobrepreço)
   * 5. Generate comparison report with confidence score
   *
   * @param editaisData - Array of EditalExtractedData to compare
   * @param editaisIds - Array of edital IDs (for reference in report)
   * @returns ComparisonReport with statistical analysis
   *
   * @example
   * ```typescript
   * const report = await editalComparisonService.compareMultipleEditais(
   *   [editalData1, editalData2, editalData3],
   *   ['edital-001', 'edital-002', 'edital-003']
   * );
   *
   * console.log(`Sobrepreço alerts: ${report.alertasSobrepreco}`);
   * console.log(`Confidence: ${report.confiabilidade}%`);
   * ```
   */
  async compareMultipleEditais(
    editaisData: EditalExtractedData[],
    editaisIds: string[],
  ): Promise<ComparisonReport> {
    this.logger.log(
      `Starting multi-edital comparison for ${editaisData.length} editais`,
    );

    if (editaisData.length !== editaisIds.length) {
      throw new Error(
        'editaisData and editaisIds arrays must have the same length',
      );
    }

    if (editaisData.length < 2) {
      throw new Error('At least 2 editais are required for comparison');
    }

    // Step 1: Normalize all items from all editais
    const normalizedItemsByEdital: Map<string, NormalizedEditalItem[]> =
      new Map();

    for (let i = 0; i < editaisData.length; i++) {
      const editalId = editaisIds[i];
      const editalData = editaisData[i];
      const items = this.flattenItems(editalData.lotes);

      const normalizationResult =
        await this.normalizationService.normalizeItems(items);
      normalizedItemsByEdital.set(editalId, normalizationResult.items);

      this.logger.log(
        `Normalized ${normalizationResult.items.length} items for edital ${editalId}`,
      );
    }

    // Step 2: Group items by matching key across all editais
    const itemGroups = this.groupItemsByMatchingKey(normalizedItemsByEdital);

    this.logger.log(`Grouped items into ${itemGroups.size} unique item types`);

    // Step 3: Calculate statistics and detect outliers for each group
    const itensComparados: ItemComparado[] = [];
    let totalAlertasSobrepreco = 0;

    for (const [matchingKey, group] of itemGroups.entries()) {
      // Only analyze groups with prices and multiple occurrences
      if (group.items.length < 2) {
        continue;
      }

      const pricesWithEditalId = group.items
        .filter((item) => item.normalizedItem.precoUnitarioPadrao !== undefined)
        .map((item) => ({
          editalId: item.editalId,
          preco: item.normalizedItem.precoUnitarioPadrao!,
        }));

      if (pricesWithEditalId.length < 2) {
        continue; // Need at least 2 prices for statistical analysis
      }

      const prices = pricesWithEditalId.map((p) => p.preco);
      const stats = this.calculateStatistics(prices);

      // Detect outliers using Z-score
      const outliers: OutlierDetection[] = [];
      for (const { editalId, preco } of pricesWithEditalId) {
        const zScore =
          stats.desvio > 0 ? (preco - stats.mean) / stats.desvio : 0;
        const desvioPercentual =
          stats.mean > 0 ? ((preco - stats.mean) / stats.mean) * 100 : 0;

        // Outlier threshold: > 2 std devs
        if (Math.abs(zScore) > 2) {
          let categoria: AnomaliaCategoria;
          if (Math.abs(zScore) > 3) {
            categoria = AnomaliaCategoria.SOBREPRECO;
            totalAlertasSobrepreco++;
          } else {
            categoria = AnomaliaCategoria.ATENCAO;
          }

          outliers.push({
            editalId,
            preco,
            desvioPercentual,
            zScore,
            categoria,
          });
        }
      }

      // Get first item for description and category
      const firstItem = group.items[0].normalizedItem;

      itensComparados.push({
        descricao: firstItem.descricaoNormalizada,
        categoria: firstItem.categoriaNome || undefined,
        ocorrencias: pricesWithEditalId.length,
        precoMedio: stats.mean,
        precoMediana: stats.median,
        desvio: stats.desvio,
        precoMinimo: stats.min,
        precoMaximo: stats.max,
        outliers: outliers.sort(
          (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore),
        ), // Sort by severity
      });
    }

    // Sort items: first those with outliers, then by number of occurrences
    itensComparados.sort((a, b) => {
      if (a.outliers.length > 0 && b.outliers.length === 0) return -1;
      if (a.outliers.length === 0 && b.outliers.length > 0) return 1;
      return b.ocorrencias - a.ocorrencias;
    });

    // Step 4: Calculate confidence score based on sample size
    const confiabilidade = this.calculateConfidence(itensComparados);

    this.logger.log(
      `Comparison completed: ${itensComparados.length} items analyzed, ${totalAlertasSobrepreco} sobrepreço alerts`,
    );

    return {
      itensComparados,
      alertasSobrepreco: totalAlertasSobrepreco,
      confiabilidade,
      geradoEm: new Date().toISOString(),
      editaisAnalisados: editaisIds,
      totalItens: itensComparados.length,
    };
  }

  /**
   * Group normalized items by matching key across all editais.
   *
   * @param normalizedItemsByEdital - Map of edital ID to normalized items
   * @returns Map of matching key to grouped items
   */
  private groupItemsByMatchingKey(
    normalizedItemsByEdital: Map<string, NormalizedEditalItem[]>,
  ): Map<
    string,
    { items: { editalId: string; normalizedItem: NormalizedEditalItem }[] }
  > {
    const groups = new Map<
      string,
      { items: { editalId: string; normalizedItem: NormalizedEditalItem }[] }
    >();

    for (const [editalId, items] of normalizedItemsByEdital.entries()) {
      for (const item of items) {
        const matchingKey = item.matchingKey;

        if (!groups.has(matchingKey)) {
          groups.set(matchingKey, { items: [] });
        }

        groups.get(matchingKey)!.items.push({
          editalId,
          normalizedItem: item,
        });
      }
    }

    return groups;
  }

  /**
   * Calculate statistical metrics for a set of prices.
   *
   * @param prices - Array of prices
   * @returns Statistical metrics (mean, median, std dev, min, max)
   */
  private calculateStatistics(prices: number[]): {
    mean: number;
    median: number;
    desvio: number;
    min: number;
    max: number;
  } {
    if (prices.length === 0) {
      return { mean: 0, median: 0, desvio: 0, min: 0, max: 0 };
    }

    // Mean
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    // Median
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    // Standard deviation
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const desvio = Math.sqrt(variance);

    // Min/Max
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return { mean, median, desvio, min, max };
  }

  /**
   * Calculate confidence score based on sample size and distribution.
   *
   * Confidence scoring:
   * - Sample size: More editais = higher confidence
   * - Distribution: More items analyzed = higher confidence
   * - Base formula: min(100, 50 + (totalOccurrences / totalItems) * 30 + (editais.length * 5))
   *
   * @param itensComparados - Items analyzed
   * @returns Confidence score (0-100)
   */
  private calculateConfidence(itensComparados: ItemComparado[]): number {
    if (itensComparados.length === 0) {
      return 0;
    }

    const totalOccurrences = itensComparados.reduce(
      (sum, item) => sum + item.ocorrencias,
      0,
    );
    const avgOccurrences = totalOccurrences / itensComparados.length;

    // Base confidence: 50
    // Boost: +30 for high avg occurrences (up to 10)
    // Boost: +20 for many unique items analyzed
    let confidence = 50;
    confidence += Math.min(30, (avgOccurrences / 10) * 30);
    confidence += Math.min(20, (itensComparados.length / 50) * 20);

    return Math.round(Math.min(100, confidence));
  }
}
