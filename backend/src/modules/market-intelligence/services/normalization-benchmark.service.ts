import { Injectable, Logger } from '@nestjs/common';
import { ItemNormalizationService } from './item-normalization.service';
import { TextSimilarityService } from './text-similarity.service';
import {
  benchmarkDataset,
  similarItemGroups,
} from '../benchmark/benchmark-dataset';
import { NormalizedItem } from '../dto/normalized-item.dto';

/**
 * Result of a single item benchmark.
 */
export interface ItemBenchmarkResult {
  itemId: string;
  input: string;
  expectedCategory: string;
  actualCategory: string | null;
  categoryMatch: boolean;
  expectedType: 'material' | 'servico';
  actualType: 'material' | 'servico' | null;
  typeMatch: boolean;
  expectedUnit: string;
  actualUnit: string;
  unitMatch: boolean;
  confidence: number;
  processingTimeMs: number;
  error?: string;
}

/**
 * Result of grouping accuracy test.
 */
export interface GroupingResult {
  groupName: string;
  itemIds: string[];
  categories: string[];
  allSameCategory: boolean;
  dominantCategory: string | null;
  accuracy: number;
}

/**
 * Overall benchmark results.
 */
export interface BenchmarkResult {
  /**
   * Total items in benchmark.
   */
  total: number;

  /**
   * Items successfully processed.
   */
  processed: number;

  /**
   * Items with errors.
   */
  errors: number;

  /**
   * Category classification accuracy (0.0 to 1.0).
   */
  categoryAccuracy: number;

  /**
   * Type classification accuracy (material vs servico).
   */
  typeAccuracy: number;

  /**
   * Unit normalization accuracy.
   */
  unitAccuracy: number;

  /**
   * Grouping accuracy for similar items.
   */
  groupingAccuracy: number;

  /**
   * Average confidence score.
   */
  averageConfidence: number;

  /**
   * Average processing time per item (ms).
   */
  averageProcessingTimeMs: number;

  /**
   * Total benchmark time (ms).
   */
  totalTimeMs: number;

  /**
   * Material-specific metrics.
   */
  materialMetrics: {
    total: number;
    correct: number;
    accuracy: number;
  };

  /**
   * Service-specific metrics.
   */
  serviceMetrics: {
    total: number;
    correct: number;
    accuracy: number;
  };

  /**
   * Individual item results.
   */
  itemResults: ItemBenchmarkResult[];

  /**
   * Grouping results.
   */
  groupingResults: GroupingResult[];

  /**
   * Timestamp when benchmark was run.
   */
  timestamp: Date;
}

/**
 * Service for benchmarking the normalization accuracy.
 *
 * This service validates the quality of item normalization by:
 * - Running classification on a curated dataset of 100 items
 * - Measuring category, type, and unit accuracy
 * - Testing grouping of similar items
 * - Generating detailed accuracy reports
 *
 * @see Issue #1607 - Benchmark and accuracy validation
 * @see Issue #1270 - Price normalization and categorization (Parent)
 */
@Injectable()
export class NormalizationBenchmarkService {
  private readonly logger = new Logger(NormalizationBenchmarkService.name);

  constructor(
    private readonly normalizationService: ItemNormalizationService,
    private readonly textSimilarityService: TextSimilarityService,
  ) {}

  /**
   * Runs the full benchmark suite.
   *
   * @param options - Benchmark options
   * @returns Benchmark results
   */
  async runBenchmark(options?: {
    /**
     * Subset of items to benchmark (by item ID).
     * If not provided, runs on full dataset.
     */
    itemIds?: string[];

    /**
     * Skip LLM calls and use heuristics only.
     * Useful for quick validation.
     */
    skipLlm?: boolean;
  }): Promise<BenchmarkResult> {
    const startTime = Date.now();
    this.logger.log('Starting normalization benchmark...');

    const items = options?.itemIds
      ? benchmarkDataset.filter((item) =>
          options.itemIds!.includes(item.input.id),
        )
      : benchmarkDataset;

    const itemResults: ItemBenchmarkResult[] = [];
    let processedCount = 0;
    let errorCount = 0;
    let categoryCorrect = 0;
    let typeCorrect = 0;
    let unitCorrect = 0;
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    // Material vs Service tracking
    const materialItems: { total: number; correct: number } = {
      total: 0,
      correct: 0,
    };
    const serviceItems: { total: number; correct: number } = {
      total: 0,
      correct: 0,
    };

    // Normalized results for grouping test
    const normalizedResults: Map<string, NormalizedItem> = new Map();

    // Process each item
    for (const benchmarkItem of items) {
      const itemStartTime = Date.now();
      let result: ItemBenchmarkResult;

      try {
        const normalized = await this.normalizationService.normalizeItem(
          benchmarkItem.input,
        );
        normalizedResults.set(benchmarkItem.input.id, normalized);

        const processingTime = Date.now() - itemStartTime;
        totalProcessingTime += processingTime;

        const actualCategory = normalized.category?.code || null;
        const actualType = this.inferType(normalized);
        const actualUnit = normalized.normalizedUnit;

        const categoryMatch = actualCategory === benchmarkItem.expectedCategory;
        const typeMatch = actualType === benchmarkItem.expectedType;
        const unitMatch = actualUnit === benchmarkItem.expectedUnit;

        result = {
          itemId: benchmarkItem.input.id,
          input: benchmarkItem.input.description,
          expectedCategory: benchmarkItem.expectedCategory,
          actualCategory,
          categoryMatch,
          expectedType: benchmarkItem.expectedType,
          actualType,
          typeMatch,
          expectedUnit: benchmarkItem.expectedUnit,
          actualUnit,
          unitMatch,
          confidence: normalized.confidence,
          processingTimeMs: processingTime,
        };

        // Update counters
        processedCount++;
        totalConfidence += normalized.confidence;

        if (categoryMatch) categoryCorrect++;
        if (typeMatch) typeCorrect++;
        if (unitMatch) unitCorrect++;

        // Track by type
        if (benchmarkItem.expectedType === 'material') {
          materialItems.total++;
          if (categoryMatch) materialItems.correct++;
        } else {
          serviceItems.total++;
          if (categoryMatch) serviceItems.correct++;
        }
      } catch (error) {
        const processingTime = Date.now() - itemStartTime;
        totalProcessingTime += processingTime;

        result = {
          itemId: benchmarkItem.input.id,
          input: benchmarkItem.input.description,
          expectedCategory: benchmarkItem.expectedCategory,
          actualCategory: null,
          categoryMatch: false,
          expectedType: benchmarkItem.expectedType,
          actualType: null,
          typeMatch: false,
          expectedUnit: benchmarkItem.expectedUnit,
          actualUnit: 'ERROR',
          unitMatch: false,
          confidence: 0,
          processingTimeMs: processingTime,
          error: error instanceof Error ? error.message : String(error),
        };

        errorCount++;
        this.logger.error(
          `Error processing item ${benchmarkItem.input.id}:`,
          error,
        );
      }

      itemResults.push(result);
    }

    // Run grouping accuracy test
    const groupingResults = this.calculateGroupingAccuracy(normalizedResults);
    const groupingAccuracy =
      this.calculateOverallGroupingAccuracy(groupingResults);

    const totalTime = Date.now() - startTime;

    const benchmarkResult: BenchmarkResult = {
      total: items.length,
      processed: processedCount,
      errors: errorCount,
      categoryAccuracy:
        processedCount > 0 ? categoryCorrect / processedCount : 0,
      typeAccuracy: processedCount > 0 ? typeCorrect / processedCount : 0,
      unitAccuracy: processedCount > 0 ? unitCorrect / processedCount : 0,
      groupingAccuracy,
      averageConfidence:
        processedCount > 0 ? totalConfidence / processedCount : 0,
      averageProcessingTimeMs:
        processedCount > 0 ? totalProcessingTime / processedCount : 0,
      totalTimeMs: totalTime,
      materialMetrics: {
        total: materialItems.total,
        correct: materialItems.correct,
        accuracy:
          materialItems.total > 0
            ? materialItems.correct / materialItems.total
            : 0,
      },
      serviceMetrics: {
        total: serviceItems.total,
        correct: serviceItems.correct,
        accuracy:
          serviceItems.total > 0
            ? serviceItems.correct / serviceItems.total
            : 0,
      },
      itemResults,
      groupingResults,
      timestamp: new Date(),
    };

    this.logger.log(
      `Benchmark completed. Category accuracy: ${(benchmarkResult.categoryAccuracy * 100).toFixed(1)}%`,
    );

    return benchmarkResult;
  }

  /**
   * Runs a quick benchmark on a sample of items.
   * Useful for CI/CD integration.
   *
   * @param sampleSize - Number of items to sample (default 20)
   * @returns Benchmark results
   */
  async runQuickBenchmark(sampleSize = 20): Promise<BenchmarkResult> {
    // Sample items evenly from materials and services
    const materials = benchmarkDataset.filter(
      (item) => item.expectedType === 'material',
    );
    const services = benchmarkDataset.filter(
      (item) => item.expectedType === 'servico',
    );

    const materialSample = materials.slice(0, Math.floor(sampleSize / 2));
    const serviceSample = services.slice(0, Math.ceil(sampleSize / 2));

    const sampleIds = [
      ...materialSample.map((item) => item.input.id),
      ...serviceSample.map((item) => item.input.id),
    ];

    return this.runBenchmark({ itemIds: sampleIds });
  }

  /**
   * Gets a summary of benchmark results suitable for CI/CD.
   *
   * @param result - Benchmark result
   * @returns Summary object
   */
  getBenchmarkSummary(result: BenchmarkResult): {
    passed: boolean;
    categoryAccuracy: string;
    typeAccuracy: string;
    groupingAccuracy: string;
    thresholdMet: boolean;
    details: string;
  } {
    const categoryThreshold = 0.85;
    const typeThreshold = 0.95;
    const groupingThreshold = 0.8;

    const thresholdMet =
      result.categoryAccuracy >= categoryThreshold &&
      result.typeAccuracy >= typeThreshold &&
      result.groupingAccuracy >= groupingThreshold;

    return {
      passed: thresholdMet,
      categoryAccuracy: `${(result.categoryAccuracy * 100).toFixed(1)}%`,
      typeAccuracy: `${(result.typeAccuracy * 100).toFixed(1)}%`,
      groupingAccuracy: `${(result.groupingAccuracy * 100).toFixed(1)}%`,
      thresholdMet,
      details: thresholdMet
        ? 'All accuracy thresholds met'
        : `Thresholds not met: Category >= ${categoryThreshold * 100}%, Type >= ${typeThreshold * 100}%, Grouping >= ${groupingThreshold * 100}%`,
    };
  }

  /**
   * Exports benchmark results to JSON.
   *
   * @param result - Benchmark result
   * @returns JSON string
   */
  exportToJson(result: BenchmarkResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Exports benchmark results to CSV.
   *
   * @param result - Benchmark result
   * @returns CSV string
   */
  exportToCsv(result: BenchmarkResult): string {
    const headers = [
      'Item ID',
      'Input Description',
      'Expected Category',
      'Actual Category',
      'Category Match',
      'Expected Type',
      'Actual Type',
      'Type Match',
      'Expected Unit',
      'Actual Unit',
      'Unit Match',
      'Confidence',
      'Processing Time (ms)',
      'Error',
    ].join(',');

    const rows = result.itemResults.map((item) =>
      [
        item.itemId,
        `"${item.input.replace(/"/g, '""')}"`,
        item.expectedCategory,
        item.actualCategory || 'NULL',
        item.categoryMatch,
        item.expectedType,
        item.actualType || 'NULL',
        item.typeMatch,
        item.expectedUnit,
        item.actualUnit,
        item.unitMatch,
        item.confidence.toFixed(3),
        item.processingTimeMs,
        item.error ? `"${item.error.replace(/"/g, '""')}"` : '',
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Infers the type (material/servico) from a normalized item.
   */
  private inferType(item: NormalizedItem): 'material' | 'servico' | null {
    if (item.category?.type) {
      return item.category.type === 'CATMAT' ? 'material' : 'servico';
    }
    if (item.features?.estimatedCategory) {
      return item.features.estimatedCategory;
    }
    return null;
  }

  /**
   * Calculates grouping accuracy for similar items.
   */
  private calculateGroupingAccuracy(
    normalizedResults: Map<string, NormalizedItem>,
  ): GroupingResult[] {
    const results: GroupingResult[] = [];

    for (const [groupName, itemIds] of Object.entries(similarItemGroups)) {
      const categories: string[] = [];

      for (const itemId of itemIds) {
        const normalized = normalizedResults.get(itemId);
        if (normalized?.category?.code) {
          categories.push(normalized.category.code);
        }
      }

      // Find dominant category
      const categoryCount = new Map<string, number>();
      for (const cat of categories) {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      }

      let dominantCategory: string | null = null;
      let maxCount = 0;
      for (const [cat, count] of categoryCount.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = cat;
        }
      }

      // Calculate accuracy as proportion in dominant category
      const allSameCategory =
        categories.length > 0 && new Set(categories).size === 1;
      const accuracy =
        categories.length > 0 && dominantCategory
          ? maxCount / categories.length
          : 0;

      results.push({
        groupName,
        itemIds,
        categories,
        allSameCategory,
        dominantCategory,
        accuracy,
      });
    }

    return results;
  }

  /**
   * Calculates overall grouping accuracy.
   */
  private calculateOverallGroupingAccuracy(
    groupingResults: GroupingResult[],
  ): number {
    if (groupingResults.length === 0) return 0;

    const totalAccuracy = groupingResults.reduce(
      (sum, result) => sum + result.accuracy,
      0,
    );

    return totalAccuracy / groupingResults.length;
  }
}
