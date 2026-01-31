/**
 * Edital Comparison Service
 *
 * Service for comparing extracted edital data to identify differences,
 * analyze competitive positioning, and provide insights for bid preparation.
 *
 * Features:
 * - Compare two editais side-by-side
 * - Identify price differences and competitive opportunities
 * - Analyze requirement changes between versions
 * - Generate comparative reports
 *
 * @module modules/pageindex/services/edital-comparison
 * @see Issue #1698 - Create REST API for edital extraction and comparison
 */

import { Injectable, Logger } from '@nestjs/common';
import { EditalExtractedData, EditalLote, EditalItem } from '../dto/edital-extracted-data.dto';

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
      (c) => c.status === 'price_difference' && c.priceDifferencePercent !== undefined,
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
}
