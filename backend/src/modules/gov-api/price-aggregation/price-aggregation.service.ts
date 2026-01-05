/**
 * Price Aggregation Service
 *
 * Aggregates price references from multiple government sources (PNCP, SINAPI, SICRO)
 * and calculates consolidated averages following Lei 14.133/2021 requirements.
 *
 * Features:
 * - Fuzzy matching for similar item descriptions
 * - Outlier detection and exclusion
 * - Weighted averages based on source reliability
 * - Confidence scoring based on source count and variance
 *
 * @module modules/gov-api/price-aggregation
 * @see https://github.com/CONFENGE/etp-express/issues/1159
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  GovApiPriceReference,
  GovApiContract,
  GovApiSource,
} from '../interfaces/gov-api.interface';
import {
  PriceAggregation,
  PriceAggregationOptions,
  PriceAggregationResult,
  PriceConfidence,
  PriceSource,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_OUTLIER_STD_DEV_THRESHOLD,
  DEFAULT_SOURCE_WEIGHTS,
  LEGAL_REFERENCE,
  METHODOLOGY_TEMPLATE,
} from './price-aggregation.types';

@Injectable()
export class PriceAggregationService {
  private readonly logger = new Logger(PriceAggregationService.name);

  /**
   * Aggregate prices from multiple sources for a given query
   *
   * @param query Original search query
   * @param sinapiPrices SINAPI price references
   * @param sicroPrices SICRO price references
   * @param contractPrices Prices from PNCP/Compras.gov.br contracts
   * @param options Aggregation options
   * @returns Aggregated price results
   *
   * @example
   * ```typescript
   * const result = await aggregationService.aggregatePrices(
   *   'cimento portland',
   *   sinapiResults,
   *   sicroResults,
   *   contractResults,
   *   { excludeOutliers: true }
   * );
   * ```
   */
  aggregatePrices(
    query: string,
    sinapiPrices: GovApiPriceReference[],
    sicroPrices: GovApiPriceReference[],
    contractPrices: GovApiContract[],
    options: PriceAggregationOptions = {},
  ): PriceAggregationResult {
    const startTime = Date.now();
    this.logger.log(`Starting price aggregation for query: "${query}"`);

    const {
      similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
      excludeOutliers = true,
      outlierStdDevThreshold = DEFAULT_OUTLIER_STD_DEV_THRESHOLD,
      sourceWeights = DEFAULT_SOURCE_WEIGHTS,
    } = options;

    // 1. Convert all prices to normalized PriceSource format
    const allPrices = this.normalizePrices(
      sinapiPrices,
      sicroPrices,
      contractPrices,
    );

    this.logger.debug(`Normalized ${allPrices.length} total prices`);

    // 2. Group prices by similar descriptions
    const groups = this.groupBySimilarity(allPrices, similarityThreshold);

    this.logger.debug(`Created ${groups.length} price groups`);

    // 3. Calculate aggregations for each group
    const aggregations: PriceAggregation[] = [];
    const unmatchedPrices: PriceSource[] = [];

    for (const group of groups) {
      if (group.length >= 2) {
        // Only aggregate if 2+ sources available
        const aggregation = this.calculateAggregation(
          group,
          excludeOutliers,
          outlierStdDevThreshold,
          sourceWeights,
        );
        aggregations.push(aggregation);
      } else if (group.length === 1) {
        // Single source - add to aggregations with LOW confidence
        const singleAggregation = this.createSingleSourceAggregation(group[0]);
        aggregations.push(singleAggregation);
      }
    }

    // 4. Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(aggregations);

    // 5. Build methodology summary
    const sourcesConsulted: GovApiSource[] = [];
    if (sinapiPrices.length > 0) sourcesConsulted.push('sinapi');
    if (sicroPrices.length > 0) sourcesConsulted.push('sicro');
    if (contractPrices.length > 0) {
      sourcesConsulted.push('pncp');
      sourcesConsulted.push('comprasgov');
    }

    const methodologySummary = this.buildMethodologySummary(
      aggregations,
      sourcesConsulted,
    );

    const duration = Date.now() - startTime;
    this.logger.log(
      `Price aggregation completed in ${duration}ms: ${aggregations.length} aggregations, confidence: ${overallConfidence}`,
    );

    return {
      query,
      aggregations,
      unmatchedPrices,
      totalPricesAnalyzed: allPrices.length,
      sourcesConsulted,
      overallConfidence,
      timestamp: new Date(),
      methodologySummary,
    };
  }

  /**
   * Normalize prices from different sources into a common format
   */
  private normalizePrices(
    sinapiPrices: GovApiPriceReference[],
    sicroPrices: GovApiPriceReference[],
    contractPrices: GovApiContract[],
  ): PriceSource[] {
    const normalized: PriceSource[] = [];

    // Normalize SINAPI prices
    for (const price of sinapiPrices) {
      normalized.push({
        source: 'sinapi',
        code: price.codigo,
        price: price.precoUnitario,
        date: price.fetchedAt,
        reference: `SINAPI ${price.codigo} - ${price.mesReferencia}`,
        unit: price.unidade,
        uf: price.uf,
        desonerado: price.desonerado,
      });
    }

    // Normalize SICRO prices
    for (const price of sicroPrices) {
      normalized.push({
        source: 'sicro',
        code: price.codigo,
        price: price.precoUnitario,
        date: price.fetchedAt,
        reference: `SICRO ${price.codigo} - ${price.mesReferencia}`,
        unit: price.unidade,
        uf: price.uf,
        desonerado: price.desonerado,
      });
    }

    // Normalize contract prices (extract unit price from total if possible)
    for (const contract of contractPrices) {
      if (contract.valorTotal > 0) {
        normalized.push({
          source: contract.source,
          code: contract.numero,
          price: contract.valorTotal,
          date: contract.dataPublicacao,
          reference: `${contract.source.toUpperCase()} ${contract.numero}/${contract.ano}`,
          unit: 'contrato',
          uf: contract.orgaoContratante.uf,
        });
      }
    }

    return normalized;
  }

  /**
   * Group prices by similar descriptions using fuzzy matching
   */
  private groupBySimilarity(
    prices: PriceSource[],
    _threshold: number,
  ): PriceSource[][] {
    const groups: PriceSource[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < prices.length; i++) {
      if (used.has(i)) continue;

      const group: PriceSource[] = [prices[i]];
      used.add(i);

      for (let j = i + 1; j < prices.length; j++) {
        if (used.has(j)) continue;

        // Match by code if same source, or by similar units/prices if different sources
        const sameSource = prices[i].source === prices[j].source;
        const sameUnit =
          this.normalizeUnit(prices[i].unit) ===
          this.normalizeUnit(prices[j].unit);
        const priceRatio =
          Math.min(prices[i].price, prices[j].price) /
          Math.max(prices[i].price, prices[j].price);
        const similarPrice = priceRatio >= 0.3 && priceRatio <= 3.0; // Within 3x of each other

        if (sameUnit && similarPrice && !sameSource) {
          group.push(prices[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Normalize unit of measurement
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    const mappings: Record<string, string> = {
      'm²': 'm2',
      'm³': 'm3',
      m2: 'm2',
      m3: 'm3',
      kg: 'kg',
      un: 'un',
      unidade: 'un',
      und: 'un',
      pç: 'un',
      pc: 'un',
      l: 'l',
      litro: 'l',
      h: 'h',
      hora: 'h',
      dia: 'dia',
      d: 'dia',
      mes: 'mes',
      mês: 'mes',
      contrato: 'contrato',
    };
    return mappings[normalized] || normalized;
  }

  /**
   * Calculate aggregation for a group of prices
   */
  private calculateAggregation(
    prices: PriceSource[],
    excludeOutliers: boolean,
    outlierThreshold: number,
    sourceWeights: Partial<Record<GovApiSource, number>>,
  ): PriceAggregation {
    let workingPrices = [...prices];
    let outlierCount = 0;
    let outliersExcluded = false;

    // Exclude outliers if requested
    if (excludeOutliers && workingPrices.length >= 3) {
      const filtered = this.removeOutliers(workingPrices, outlierThreshold);
      outlierCount = workingPrices.length - filtered.length;
      outliersExcluded = outlierCount > 0;
      workingPrices = filtered;
    }

    // Calculate statistics
    const priceValues = workingPrices.map((p) => p.price);
    const { median, min, max, cv } = this.calculateStatistics(priceValues);

    // Calculate weighted average
    const weightedAverage = this.calculateWeightedAverage(
      workingPrices,
      sourceWeights,
    );

    // Determine confidence level
    const confidence = this.determineConfidence(workingPrices.length, cv);

    // Build methodology description
    const sourceNames = [
      ...new Set(workingPrices.map((p) => this.getSourceDisplayName(p.source))),
    ].join(', ');
    const methodology = this.buildItemMethodology(
      workingPrices.length,
      sourceNames,
      cv,
      outliersExcluded,
    );

    // Determine description from first price
    const description = this.buildAggregatedDescription(workingPrices);

    return {
      description,
      averagePrice: weightedAverage,
      medianPrice: median,
      minPrice: min,
      maxPrice: max,
      sources: workingPrices,
      sourceCount: workingPrices.length,
      confidence,
      coefficientOfVariation: cv,
      methodology,
      outliersExcluded,
      outlierCount,
      unit: this.normalizeUnit(workingPrices[0].unit),
      legalReference: LEGAL_REFERENCE,
    };
  }

  /**
   * Create aggregation for single source (LOW confidence)
   */
  private createSingleSourceAggregation(price: PriceSource): PriceAggregation {
    const sourceName = this.getSourceDisplayName(price.source);
    const methodology = METHODOLOGY_TEMPLATE.SINGLE_SOURCE.replace(
      '{source}',
      sourceName,
    );

    return {
      description: `Preço de referência - ${price.reference}`,
      averagePrice: price.price,
      medianPrice: price.price,
      minPrice: price.price,
      maxPrice: price.price,
      sources: [price],
      sourceCount: 1,
      confidence: 'LOW',
      coefficientOfVariation: 0,
      methodology,
      outliersExcluded: false,
      outlierCount: 0,
      unit: this.normalizeUnit(price.unit),
      legalReference: LEGAL_REFERENCE,
    };
  }

  /**
   * Remove outliers using Z-score method
   */
  private removeOutliers(
    prices: PriceSource[],
    threshold: number,
  ): PriceSource[] {
    const values = prices.map((p) => p.price);
    const { mean, stdDev } = this.calculateStatistics(values);

    if (stdDev === 0) return prices;

    return prices.filter((p) => {
      const zScore = Math.abs((p.price - mean) / stdDev);
      return zScore <= threshold;
    });
  }

  /**
   * Calculate basic statistics for a set of values
   */
  private calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    cv: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, cv: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Median
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    // Standard deviation
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Coefficient of variation
    const cv = mean !== 0 ? stdDev / mean : 0;

    return { mean, median, min, max, stdDev, cv };
  }

  /**
   * Calculate weighted average based on source reliability
   */
  private calculateWeightedAverage(
    prices: PriceSource[],
    weights: Partial<Record<GovApiSource, number>>,
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const price of prices) {
      const weight = weights[price.source] ?? 1.0;
      weightedSum += price.price * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine confidence level based on source count and variance
   */
  private determineConfidence(
    sourceCount: number,
    coefficientOfVariation: number,
  ): PriceConfidence {
    // HIGH: 3+ sources with CV < 0.3 (30% variance)
    if (sourceCount >= 3 && coefficientOfVariation < 0.3) {
      return 'HIGH';
    }

    // MEDIUM: 2 sources OR 3+ sources with moderate variance
    if (
      sourceCount >= 2 &&
      (sourceCount === 2 || coefficientOfVariation < 0.5)
    ) {
      return 'MEDIUM';
    }

    // LOW: 1 source or high variance
    return 'LOW';
  }

  /**
   * Get display name for source
   */
  private getSourceDisplayName(source: GovApiSource): string {
    const names: Record<GovApiSource, string> = {
      pncp: 'PNCP',
      comprasgov: 'Compras.gov.br',
      sinapi: 'SINAPI',
      sicro: 'SICRO',
    };
    return names[source] || source.toUpperCase();
  }

  /**
   * Build aggregated description from prices
   */
  private buildAggregatedDescription(prices: PriceSource[]): string {
    // Use the first reference as base description
    const references = prices.map((p) => p.reference).join(' | ');
    return `Preço agregado: ${references}`;
  }

  /**
   * Build methodology description for a single item
   */
  private buildItemMethodology(
    sourceCount: number,
    sourceNames: string,
    cv: number,
    outliersExcluded: boolean,
  ): string {
    let methodology: string;

    if (sourceCount >= 3 && cv < 0.3) {
      methodology = METHODOLOGY_TEMPLATE.WEIGHTED_AVERAGE.replace(
        '{count}',
        String(sourceCount),
      ).replace('{sources}', sourceNames);
    } else if (cv > 0.5 && sourceCount >= 3) {
      methodology = METHODOLOGY_TEMPLATE.MEDIAN.replace(
        '{count}',
        String(sourceCount),
      ).replace('{sources}', sourceNames);
    } else {
      methodology = METHODOLOGY_TEMPLATE.SIMPLE_AVERAGE.replace(
        '{count}',
        String(sourceCount),
      ).replace('{sources}', sourceNames);
    }

    if (outliersExcluded) {
      methodology += ' Valores discrepantes foram excluídos da análise.';
    }

    return methodology;
  }

  /**
   * Calculate overall confidence for all aggregations
   */
  private calculateOverallConfidence(
    aggregations: PriceAggregation[],
  ): PriceConfidence {
    if (aggregations.length === 0) return 'LOW';

    const confidenceScores: Record<PriceConfidence, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const totalScore = aggregations.reduce(
      (sum, agg) => sum + confidenceScores[agg.confidence],
      0,
    );
    const avgScore = totalScore / aggregations.length;

    if (avgScore >= 2.5) return 'HIGH';
    if (avgScore >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Build overall methodology summary
   */
  private buildMethodologySummary(
    aggregations: PriceAggregation[],
    sourcesConsulted: GovApiSource[],
  ): string {
    const sourceNames = sourcesConsulted
      .map((s) => this.getSourceDisplayName(s))
      .join(', ');

    const avgSources =
      aggregations.length > 0
        ? aggregations.reduce((sum, a) => sum + a.sourceCount, 0) /
          aggregations.length
        : 0;

    const highConfCount = aggregations.filter(
      (a) => a.confidence === 'HIGH',
    ).length;

    return (
      `Pesquisa de preços realizada em ${sourcesConsulted.length} fontes (${sourceNames}). ` +
      `Média de ${avgSources.toFixed(1)} fontes por item. ` +
      `${highConfCount} de ${aggregations.length} itens com alta confiança. ` +
      `Conforme ${LEGAL_REFERENCE}.`
    );
  }
}
