/**
 * Edital Item Normalization Service
 *
 * Service for normalizing items extracted from editais to enable comparison
 * across different bidding documents. This is part of issue #1696 - sub-task 3/5
 * of the parent issue #1545 - Structured edital extraction with PageIndex.
 *
 * Features:
 * - Normalizes item descriptions from various formats
 * - Maps units of measurement (kg → quilo, m → metro)
 * - Categorizes items using CATMAT/CATSER (reuses #1602 infrastructure)
 * - Generates matching keys for cross-edital comparison
 * - Provides similarity scoring for item matching
 *
 * Algorithm:
 * 1. Clean and normalize item description
 * 2. Normalize unit of measurement
 * 3. Classify item into CATMAT/CATSER category
 * 4. Generate matching key (hash) for comparison
 * 5. Return normalized item with confidence score
 *
 * @module modules/pageindex/services/edital-item-normalization
 * @see Issue #1696 - Implementar normalização de itens para comparação
 * @see Issue #1545 - Extração estruturada de editais com PageIndex (Parent)
 * @see Issue #1602 - ItemCategory entity (Dependency)
 * @see ItemNormalizationService - Market Intelligence normalization (Reused)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { ItemNormalizationService } from '../../market-intelligence/services/item-normalization.service';
import {
  ContractItem,
  UNIT_NORMALIZATION_MAP,
} from '../../market-intelligence/dto/normalized-item.dto';
import { EditalItem } from '../dto/edital-extracted-data.dto';

/**
 * Normalized edital item structure for comparison.
 */
export interface NormalizedEditalItem {
  /** Original item data */
  originalDescricao: string;
  originalCodigo: string;
  originalUnidade: string;
  originalQuantidade: number;
  originalPrecoUnitario?: number;
  originalPrecoTotal?: number;

  /** Normalized fields */
  descricaoNormalizada: string;
  unidadePadrao: string;
  quantidadeConvertida: number;
  precoUnitarioPadrao?: number;

  /** Category classification */
  categoria: string | null; // CATMAT/CATSER code
  categoriaNome: string | null;
  categoriaType: ItemCategoryType | null;

  /** Matching and confidence */
  matchingKey: string; // Hash for comparison
  confidence: number; // 0.0 to 1.0
  requiresReview: boolean;

  /** Keywords for similarity matching */
  keywords: string[];
}

/**
 * Result of batch normalization
 */
export interface EditalItemNormalizationResult {
  /** Normalized items */
  items: NormalizedEditalItem[];

  /** Statistics */
  stats: {
    total: number;
    classified: number;
    requiresReview: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
}

/**
 * Item matching result for comparison
 */
export interface ItemMatchResult {
  /** Item A (from first edital) */
  itemA: NormalizedEditalItem;

  /** Item B (from second edital) */
  itemB: NormalizedEditalItem;

  /** Similarity score (0-100) */
  similarityScore: number;

  /** Match type */
  matchType:
    | 'exact_match' // Same matching key
    | 'category_match' // Same CATMAT/CATSER category
    | 'description_match' // High description similarity
    | 'no_match'; // No significant match

  /** Match confidence (0.0 to 1.0) */
  matchConfidence: number;
}

/**
 * EditalItemNormalizationService - Normalize edital items for comparison
 *
 * @example
 * ```typescript
 * const result = await editalItemNormalizationService.normalizeItems([
 *   {
 *     codigo: '001',
 *     descricao: 'NOTEBOOK CORE I5 8GB RAM',
 *     quantidade: 10,
 *     unidade: 'UNIDADE',
 *     precoUnitario: 3500.00
 *   }
 * ]);
 *
 * console.log(result.items[0].matchingKey); // Hash for comparison
 * console.log(result.items[0].categoria); // CATMAT-44122
 * ```
 */
@Injectable()
export class EditalItemNormalizationService {
  private readonly logger = new Logger(EditalItemNormalizationService.name);

  constructor(
    @InjectRepository(ItemCategory)
    private readonly categoryRepository: Repository<ItemCategory>,
    private readonly itemNormalizationService: ItemNormalizationService,
  ) {}

  /**
   * Normalize a batch of edital items.
   *
   * @param items - Array of EditalItem from extraction
   * @returns Normalized items with matching keys
   */
  async normalizeItems(
    items: EditalItem[],
  ): Promise<EditalItemNormalizationResult> {
    const startTime = Date.now();
    this.logger.log(`Normalizing ${items.length} edital items`);

    const normalizedItems: NormalizedEditalItem[] = [];

    for (const item of items) {
      try {
        const normalized = await this.normalizeItem(item);
        normalizedItems.push(normalized);
      } catch (error) {
        this.logger.error(`Failed to normalize item ${item.codigo}:`, error);
        // Add item with low confidence if normalization fails
        normalizedItems.push(this.createFallbackItem(item, error.message));
      }
    }

    const processingTimeMs = Date.now() - startTime;

    const stats = this.calculateStats(normalizedItems, processingTimeMs);

    this.logger.log(
      `Normalized ${stats.total} items in ${processingTimeMs}ms (avg confidence: ${stats.averageConfidence.toFixed(2)})`,
    );

    return {
      items: normalizedItems,
      stats,
    };
  }

  /**
   * Normalize a single edital item.
   *
   * @param item - EditalItem to normalize
   * @returns Normalized item with matching key
   */
  async normalizeItem(item: EditalItem): Promise<NormalizedEditalItem> {
    // Convert EditalItem to ContractItem format for reuse of ItemNormalizationService
    const contractItem: ContractItem = {
      id: item.codigo,
      description: item.descricao,
      unit: item.unidade,
      quantity: item.quantidade,
      unitPrice: item.precoUnitario,
      totalValue: item.precoTotal,
      source: 'manual', // Edital source
      catmatCode: this.extractCATMATCode(item.codigo),
      catserCode: this.extractCATSERCode(item.codigo),
    };

    // Use ItemNormalizationService for classification and feature extraction
    const normalized = await this.itemNormalizationService.normalizeItem(
      contractItem,
    );

    // Generate matching key
    const matchingKey = this.generateMatchingKey(
      normalized.features.description,
      normalized.normalizedUnit,
      normalized.category?.code || null,
    );

    return {
      // Original data
      originalDescricao: item.descricao,
      originalCodigo: item.codigo,
      originalUnidade: item.unidade,
      originalQuantidade: item.quantidade,
      originalPrecoUnitario: item.precoUnitario,
      originalPrecoTotal: item.precoTotal,

      // Normalized data
      descricaoNormalizada: normalized.features.description,
      unidadePadrao: normalized.normalizedUnit,
      quantidadeConvertida: item.quantidade, // No unit conversion for now
      precoUnitarioPadrao: item.precoUnitario,

      // Category
      categoria: normalized.category?.code || null,
      categoriaNome: normalized.category?.name || null,
      categoriaType: normalized.category?.type || null,

      // Matching
      matchingKey,
      confidence: normalized.confidence,
      requiresReview: normalized.requiresReview,
      keywords: normalized.features.keywords,
    };
  }

  /**
   * Match items from two editais for comparison.
   *
   * This algorithm finds the best matches between items from two different
   * editais based on:
   * 1. Exact matching key match (highest priority)
   * 2. Same CATMAT/CATSER category
   * 3. Description similarity
   *
   * @param itemsA - Normalized items from first edital
   * @param itemsB - Normalized items from second edital
   * @returns Array of matched item pairs with similarity scores
   */
  async matchItems(
    itemsA: NormalizedEditalItem[],
    itemsB: NormalizedEditalItem[],
  ): Promise<ItemMatchResult[]> {
    const matches: ItemMatchResult[] = [];
    const usedItemsB = new Set<number>(); // Track which items from B are already matched

    for (const itemA of itemsA) {
      let bestMatch: ItemMatchResult | null = null;
      let bestScore = 0;

      for (let i = 0; i < itemsB.length; i++) {
        if (usedItemsB.has(i)) continue; // Skip already matched items

        const itemB = itemsB[i];
        const matchResult = this.calculateItemMatch(itemA, itemB);

        if (matchResult.similarityScore > bestScore) {
          bestScore = matchResult.similarityScore;
          bestMatch = matchResult;
        }
      }

      if (bestMatch && bestScore >= 50) {
        // Minimum threshold for match
        matches.push(bestMatch);
        const indexB = itemsB.indexOf(bestMatch.itemB);
        usedItemsB.add(indexB);
      }
    }

    this.logger.log(
      `Matched ${matches.length} items between editais (${itemsA.length} x ${itemsB.length})`,
    );

    return matches;
  }

  /**
   * Calculate match between two normalized items.
   *
   * @param itemA - First item
   * @param itemB - Second item
   * @returns Match result with score and type
   */
  private calculateItemMatch(
    itemA: NormalizedEditalItem,
    itemB: NormalizedEditalItem,
  ): ItemMatchResult {
    let similarityScore = 0;
    let matchType: ItemMatchResult['matchType'] = 'no_match';
    let matchConfidence = 0;

    // 1. Exact matching key match (100 points)
    if (itemA.matchingKey === itemB.matchingKey) {
      similarityScore = 100;
      matchType = 'exact_match';
      matchConfidence = 1.0;
    }
    // 2. Same CATMAT/CATSER category (80 points base)
    else if (
      itemA.categoria &&
      itemB.categoria &&
      itemA.categoria === itemB.categoria
    ) {
      similarityScore = 80;
      matchType = 'category_match';
      matchConfidence = 0.8;

      // Boost if descriptions are also similar
      const descSimilarity = this.calculateDescriptionSimilarity(
        itemA.keywords,
        itemB.keywords,
      );
      similarityScore += descSimilarity * 20; // Up to 100
      matchConfidence += descSimilarity * 0.2; // Up to 1.0
    }
    // 3. High description similarity (keyword overlap)
    else {
      const descSimilarity = this.calculateDescriptionSimilarity(
        itemA.keywords,
        itemB.keywords,
      );
      similarityScore = descSimilarity * 100;
      matchType = descSimilarity >= 0.7 ? 'description_match' : 'no_match';
      matchConfidence = descSimilarity;
    }

    // Clamp confidence to [0, 1]
    matchConfidence = Math.max(0, Math.min(1, matchConfidence));

    return {
      itemA,
      itemB,
      similarityScore: Math.round(similarityScore),
      matchType,
      matchConfidence,
    };
  }

  /**
   * Calculate description similarity based on keyword overlap.
   *
   * Uses Jaccard similarity: |A ∩ B| / |A ∪ B|
   *
   * @param keywordsA - Keywords from first item
   * @param keywordsB - Keywords from second item
   * @returns Similarity score (0.0 to 1.0)
   */
  private calculateDescriptionSimilarity(
    keywordsA: string[],
    keywordsB: string[],
  ): number {
    if (keywordsA.length === 0 && keywordsB.length === 0) {
      return 0;
    }

    const setA = new Set(keywordsA);
    const setB = new Set(keywordsB);

    // Intersection
    const intersection = [...setA].filter((kw) => setB.has(kw)).length;

    // Union
    const union = new Set([...setA, ...setB]).size;

    // Jaccard similarity
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Generate a matching key for an item.
   *
   * The matching key is a hash combining:
   * - Normalized description (first 50 chars)
   * - Normalized unit
   * - Category code (if available)
   *
   * Items with the same matching key are considered identical.
   *
   * @param description - Normalized description
   * @param unit - Normalized unit
   * @param categoryCode - CATMAT/CATSER code (or null)
   * @returns SHA-256 hash (first 16 chars)
   */
  private generateMatchingKey(
    description: string,
    unit: string,
    categoryCode: string | null,
  ): string {
    const key = [
      description.substring(0, 50), // First 50 chars to avoid hash collision
      unit,
      categoryCode || 'UNCATEGORIZED',
    ].join('|');

    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Extract CATMAT code from item code if present.
   *
   * @param codigo - Item code
   * @returns CATMAT code or undefined
   */
  private extractCATMATCode(codigo: string): string | undefined {
    const match = codigo.match(/CATMAT-?\d+/i);
    return match ? match[0].toUpperCase() : undefined;
  }

  /**
   * Extract CATSER code from item code if present.
   *
   * @param codigo - Item code
   * @returns CATSER code or undefined
   */
  private extractCATSERCode(codigo: string): string | undefined {
    const match = codigo.match(/CATSER-?\d+/i);
    return match ? match[0].toUpperCase() : undefined;
  }

  /**
   * Create a fallback normalized item when normalization fails.
   *
   * @param item - Original item
   * @param errorMessage - Error message
   * @returns Normalized item with low confidence
   */
  private createFallbackItem(
    item: EditalItem,
    errorMessage: string,
  ): NormalizedEditalItem {
    const normalizedUnit = this.itemNormalizationService.normalizeUnit(
      item.unidade,
    );
    const description = item.descricao.toLowerCase().trim();

    return {
      originalDescricao: item.descricao,
      originalCodigo: item.codigo,
      originalUnidade: item.unidade,
      originalQuantidade: item.quantidade,
      originalPrecoUnitario: item.precoUnitario,
      originalPrecoTotal: item.precoTotal,

      descricaoNormalizada: description,
      unidadePadrao: normalizedUnit,
      quantidadeConvertida: item.quantidade,
      precoUnitarioPadrao: item.precoUnitario,

      categoria: null,
      categoriaNome: null,
      categoriaType: null,

      matchingKey: this.generateMatchingKey(description, normalizedUnit, null),
      confidence: 0.1,
      requiresReview: true,
      keywords: [],
    };
  }

  /**
   * Calculate statistics for normalization result.
   *
   * @param items - Normalized items
   * @param processingTimeMs - Processing time
   * @returns Statistics object
   */
  private calculateStats(
    items: NormalizedEditalItem[],
    processingTimeMs: number,
  ) {
    const total = items.length;
    const classified = items.filter((i) => i.categoria !== null).length;
    const requiresReview = items.filter((i) => i.requiresReview).length;
    const averageConfidence =
      items.reduce((sum, i) => sum + i.confidence, 0) / (total || 1);

    return {
      total,
      classified,
      requiresReview,
      averageConfidence,
      processingTimeMs,
    };
  }
}
