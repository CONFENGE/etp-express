import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractPrice } from '../../../entities/contract-price.entity';
import {
  NormalizedContractItem,
  ClassificationMethod,
} from '../../../entities/normalized-contract-item.entity';
import { ItemCategory } from '../../../entities/item-category.entity';
import { ItemNormalizationService } from './item-normalization.service';
import { ContractItem, NormalizedItem } from '../dto/normalized-item.dto';

/**
 * Result of a batch processing operation.
 */
export interface ProcessingResult {
  /** Total items processed */
  processed: number;
  /** Items successfully normalized */
  successful: number;
  /** Items with errors */
  errors: number;
  /** Items flagged for review (confidence < threshold) */
  lowConfidence: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error details for failed items */
  errorDetails: Array<{ itemId: string; error: string }>;
}

/**
 * Statistics for the normalization pipeline.
 */
export interface PipelineStatistics {
  /** Total items in the pipeline */
  totalItems: number;
  /** Items pending processing */
  pendingItems: number;
  /** Items successfully processed */
  processedItems: number;
  /** Items requiring review */
  reviewPending: number;
  /** Items manually reviewed */
  reviewCompleted: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Processing stats by classification method */
  byMethod: Record<ClassificationMethod, number>;
}

/**
 * Options for batch processing.
 */
export interface ProcessingOptions {
  /** Maximum items to process in a single batch */
  batchSize?: number;
  /** Confidence threshold for flagging items for review */
  confidenceThreshold?: number;
  /** Whether to skip items already processed */
  skipProcessed?: boolean;
  /** Whether to reprocess items with low confidence */
  reprocessLowConfidence?: boolean;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * NormalizationPipelineService - Batch processing service for normalizing contract items.
 *
 * This service orchestrates the batch processing of ContractPrice records through
 * the ItemNormalizationService, storing results in NormalizedContractItem.
 *
 * Features:
 * - Scheduled daily processing at 3 AM
 * - Configurable batch size and confidence threshold
 * - Automatic flagging of low-confidence items for review
 * - Statistics and monitoring support
 * - Error handling and recovery
 *
 * Part of M13: Market Intelligence milestone.
 *
 * @see ItemNormalizationService for classification logic
 * @see NormalizedContractItem for output storage
 * @see Issue #1605 for implementation
 * @see Issue #1270 for parent epic
 */
@Injectable()
export class NormalizationPipelineService {
  private readonly logger = new Logger(NormalizationPipelineService.name);
  private isProcessing = false;

  constructor(
    private readonly normalizationService: ItemNormalizationService,
    @InjectRepository(NormalizedContractItem)
    private readonly normalizedItemRepo: Repository<NormalizedContractItem>,
    @InjectRepository(ContractPrice)
    private readonly contractPriceRepo: Repository<ContractPrice>,
    @InjectRepository(ItemCategory)
    private readonly categoryRepo: Repository<ItemCategory>,
  ) {}

  /**
   * Processes all unprocessed items in the database.
   *
   * @param options - Processing options
   * @returns Processing result statistics
   */
  async processNewItems(
    options: ProcessingOptions = {},
  ): Promise<ProcessingResult> {
    const {
      batchSize = DEFAULT_BATCH_SIZE,
      confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    } = options;

    if (this.isProcessing) {
      this.logger.warn('Processing already in progress, skipping...');
      return {
        processed: 0,
        successful: 0,
        errors: 0,
        lowConfidence: 0,
        processingTimeMs: 0,
        errorDetails: [],
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const result: ProcessingResult = {
      processed: 0,
      successful: 0,
      errors: 0,
      lowConfidence: 0,
      processingTimeMs: 0,
      errorDetails: [],
    };

    try {
      const unprocessedItems = await this.getUnprocessedItems(batchSize);
      this.logger.log(
        `Starting normalization of ${unprocessedItems.length} items`,
      );

      for (const item of unprocessedItems) {
        try {
          const normalized = await this.processItem(item, confidenceThreshold);
          result.processed++;

          if (normalized) {
            result.successful++;
            if (normalized.requiresReview) {
              result.lowConfidence++;
            }
          }
        } catch (error) {
          this.logger.error(
            `Error normalizing item ${item.id}: ${error.message}`,
          );
          result.errors++;
          result.errorDetails.push({
            itemId: item.id,
            error: error.message,
          });
        }
      }

      result.processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `Normalization complete: ${result.successful}/${result.processed} successful, ` +
          `${result.lowConfidence} low confidence, ${result.errors} errors ` +
          `in ${result.processingTimeMs}ms`,
      );

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Scheduled job to process new items daily at 3 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledNormalization(): Promise<void> {
    this.logger.log('Starting scheduled normalization job');
    await this.processNewItems();
  }

  /**
   * Gets items that have not been processed yet.
   *
   * @param limit - Maximum number of items to return
   * @returns List of unprocessed ContractPrice items
   */
  async getUnprocessedItems(
    limit: number = DEFAULT_BATCH_SIZE,
  ): Promise<ContractPrice[]> {
    // Get IDs of already processed items
    const processedIds = await this.normalizedItemRepo
      .createQueryBuilder('normalized')
      .select('normalized.originalItemId')
      .getMany();

    const processedIdSet = new Set(processedIds.map((n) => n.originalItemId));

    // Get contract prices not in the processed set
    const allItems = await this.contractPriceRepo.find({
      order: { createdAt: 'DESC' },
      take: limit * 2, // Get more items to account for filtered ones
    });

    // Filter out already processed items
    const unprocessed = allItems
      .filter((item) => !processedIdSet.has(item.id))
      .slice(0, limit);

    return unprocessed;
  }

  /**
   * Processes a single ContractPrice item and stores the result.
   *
   * @param contractPrice - Item to process
   * @param confidenceThreshold - Threshold for flagging low confidence
   * @returns The created NormalizedContractItem or null on error
   */
  async processItem(
    contractPrice: ContractPrice,
    confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD,
  ): Promise<NormalizedContractItem | null> {
    const startTime = Date.now();

    // Check if already processed
    const existing = await this.normalizedItemRepo.findOne({
      where: { originalItemId: contractPrice.id },
    });

    if (existing) {
      this.logger.debug(`Item ${contractPrice.id} already processed, skipping`);
      return existing;
    }

    // Convert ContractPrice to ContractItem for normalization service
    const contractItem = this.mapToContractItem(contractPrice);

    // Normalize using the normalization service
    const normalized =
      await this.normalizationService.normalizeItem(contractItem);

    // Create and save the normalized record
    const normalizedRecord = this.createNormalizedRecord(
      contractPrice,
      normalized,
      confidenceThreshold,
      Date.now() - startTime,
    );

    const saved = await this.normalizedItemRepo.save(normalizedRecord);

    // Update category item count
    if (saved.categoryId) {
      await this.updateCategoryItemCount(saved.categoryId);
    }

    return saved;
  }

  /**
   * Maps a ContractPrice entity to a ContractItem DTO.
   */
  private mapToContractItem(contractPrice: ContractPrice): ContractItem {
    return {
      id: contractPrice.id,
      description: contractPrice.descricao,
      unit: contractPrice.unidade,
      quantity: Number(contractPrice.quantidade),
      unitPrice: Number(contractPrice.precoUnitario),
      totalValue: Number(contractPrice.valorTotal),
      source: contractPrice.fonte.toLowerCase() as 'pncp' | 'comprasgov',
      sourceReference: contractPrice.externalId,
      priceDate: contractPrice.dataHomologacao,
      uf: contractPrice.uf,
      catmatCode: contractPrice.metadata?.codigoCatmat,
      catserCode: contractPrice.metadata?.codigoCatser,
    };
  }

  /**
   * Creates a NormalizedContractItem record from normalization results.
   */
  private createNormalizedRecord(
    contractPrice: ContractPrice,
    normalized: NormalizedItem,
    confidenceThreshold: number,
    processingTimeMs: number,
  ): Partial<NormalizedContractItem> {
    const requiresReview =
      normalized.confidence < confidenceThreshold ||
      normalized.category === null;

    return {
      originalItemId: contractPrice.id,
      categoryId: normalized.category?.id || null,
      normalizedDescription: normalized.features.description,
      normalizedUnit: normalized.normalizedUnit,
      normalizedPrice: Number(contractPrice.precoUnitario),
      confidence: normalized.confidence,
      classificationMethod: this.mapClassificationMethod(
        normalized.classificationMethod,
      ),
      requiresReview,
      manuallyReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: requiresReview
        ? normalized.reviewNotes ||
          `Confidence ${(normalized.confidence * 100).toFixed(1)}% below threshold ${(confidenceThreshold * 100).toFixed(1)}%`
        : null,
      keywords: normalized.features.keywords,
      estimatedType: normalized.features.estimatedCategory,
      processingTimeMs,
    };
  }

  /**
   * Maps string classification method to enum.
   */
  private mapClassificationMethod(method: string): ClassificationMethod {
    switch (method) {
      case 'source':
        return ClassificationMethod.SOURCE;
      case 'llm':
        return ClassificationMethod.LLM;
      case 'similarity':
        return ClassificationMethod.SIMILARITY;
      case 'manual':
        return ClassificationMethod.MANUAL;
      default:
        return ClassificationMethod.LLM;
    }
  }

  /**
   * Updates the item count for a category.
   */
  private async updateCategoryItemCount(categoryId: string): Promise<void> {
    const count = await this.normalizedItemRepo.count({
      where: { categoryId },
    });

    await this.categoryRepo.update(categoryId, { itemCount: count });
  }

  /**
   * Gets statistics about the normalization pipeline.
   *
   * @returns Pipeline statistics
   */
  async getStatistics(): Promise<PipelineStatistics> {
    const totalContractPrices = await this.contractPriceRepo.count();
    const totalNormalized = await this.normalizedItemRepo.count();
    const reviewPending = await this.normalizedItemRepo.count({
      where: { requiresReview: true, manuallyReviewed: false },
    });
    const reviewCompleted = await this.normalizedItemRepo.count({
      where: { manuallyReviewed: true },
    });

    // Calculate average confidence
    const avgResult = await this.normalizedItemRepo
      .createQueryBuilder('normalized')
      .select('AVG(normalized.confidence)', 'avg')
      .getRawOne();

    // Count by classification method
    const methodCounts = await this.normalizedItemRepo
      .createQueryBuilder('normalized')
      .select('normalized.classificationMethod', 'method')
      .addSelect('COUNT(*)', 'count')
      .groupBy('normalized.classificationMethod')
      .getRawMany();

    const byMethod: Record<ClassificationMethod, number> = {
      [ClassificationMethod.SOURCE]: 0,
      [ClassificationMethod.LLM]: 0,
      [ClassificationMethod.SIMILARITY]: 0,
      [ClassificationMethod.MANUAL]: 0,
    };

    for (const { method, count } of methodCounts) {
      byMethod[method as ClassificationMethod] = parseInt(count, 10);
    }

    return {
      totalItems: totalContractPrices,
      pendingItems: totalContractPrices - totalNormalized,
      processedItems: totalNormalized,
      reviewPending,
      reviewCompleted,
      averageConfidence: parseFloat(avgResult?.avg) || 0,
      byMethod,
    };
  }

  /**
   * Gets items that require manual review.
   *
   * @param limit - Maximum number of items to return
   * @param offset - Offset for pagination
   * @returns List of items requiring review
   */
  async getItemsForReview(
    limit: number = 50,
    offset: number = 0,
  ): Promise<NormalizedContractItem[]> {
    return this.normalizedItemRepo.find({
      where: { requiresReview: true, manuallyReviewed: false },
      relations: ['originalItem', 'category'],
      order: { confidence: 'ASC', createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  /**
   * Reprocesses items with low confidence.
   *
   * @param confidenceThreshold - Threshold for reprocessing
   * @param limit - Maximum items to reprocess
   * @returns Processing result
   */
  async reprocessLowConfidenceItems(
    confidenceThreshold: number = 0.5,
    limit: number = 50,
  ): Promise<ProcessingResult> {
    const lowConfidenceItems = await this.normalizedItemRepo.find({
      where: {
        confidence: LessThan(confidenceThreshold),
        manuallyReviewed: false,
      },
      relations: ['originalItem'],
      take: limit,
    });

    const startTime = Date.now();
    const result: ProcessingResult = {
      processed: 0,
      successful: 0,
      errors: 0,
      lowConfidence: 0,
      processingTimeMs: 0,
      errorDetails: [],
    };

    for (const item of lowConfidenceItems) {
      try {
        // Delete old record
        await this.normalizedItemRepo.delete(item.id);

        // Reprocess
        const newRecord = await this.processItem(
          item.originalItem,
          confidenceThreshold,
        );

        result.processed++;
        if (newRecord) {
          result.successful++;
          if (newRecord.requiresReview) {
            result.lowConfidence++;
          }
        }
      } catch (error) {
        result.errors++;
        result.errorDetails.push({
          itemId: item.originalItemId,
          error: error.message,
        });
      }
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }
}
