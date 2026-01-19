import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractItem } from '../dto/normalized-item.dto';

/**
 * Result of a similarity comparison between two items.
 */
export interface SimilarItem {
  /**
   * The candidate item that was compared.
   */
  item: ContractItem;

  /**
   * Combined similarity score (0.0 to 1.0).
   */
  score: number;

  /**
   * Individual algorithm scores for transparency.
   */
  breakdown: {
    jaccard: number;
    cosine: number;
    levenshtein: number;
  };
}

/**
 * Configuration for similarity matching.
 */
export interface SimilarityConfig {
  /**
   * Minimum score threshold for considering items similar.
   * @default 0.7
   */
  threshold?: number;

  /**
   * Weight for Jaccard similarity (0.0 to 1.0).
   * @default 0.4
   */
  jaccardWeight?: number;

  /**
   * Weight for Cosine similarity (0.0 to 1.0).
   * @default 0.4
   */
  cosineWeight?: number;

  /**
   * Weight for Levenshtein similarity (0.0 to 1.0).
   * @default 0.2
   */
  levenshteinWeight?: number;

  /**
   * Maximum number of results to return.
   * @default 10
   */
  maxResults?: number;
}

/**
 * Service for calculating text similarity between contract item descriptions.
 *
 * This service is part of the M13: Market Intelligence milestone and enables:
 * - Grouping similar items from different procurement sources
 * - Finding price benchmarks for comparable items
 * - Identifying potential duplicates in contract datasets
 *
 * Implements three complementary similarity algorithms:
 * - Levenshtein distance: Good for typos and small variations
 * - Jaccard similarity: Good for word-level matching (bag of words)
 * - Cosine similarity: Good for semantic similarity via TF-IDF
 *
 * @see Issue #1604 - Text similarity algorithms
 * @see Issue #1270 - Price normalization and categorization (Parent)
 * @see Issue #1605 - Normalization pipeline (Next step)
 */
@Injectable()
export class TextSimilarityService {
  private readonly logger = new Logger(TextSimilarityService.name);

  /**
   * Default similarity threshold from environment or fallback.
   */
  private readonly defaultThreshold: number;

  /**
   * Stop words to filter out during text processing.
   * Common Portuguese words that don't contribute to meaning.
   */
  private readonly STOP_WORDS = new Set([
    'de',
    'da',
    'do',
    'das',
    'dos',
    'e',
    'ou',
    'para',
    'com',
    'sem',
    'por',
    'em',
    'a',
    'o',
    'as',
    'os',
    'um',
    'uma',
    'uns',
    'umas',
    'ao',
    'aos',
    'na',
    'nas',
    'no',
    'nos',
    'pelo',
    'pela',
    'pelos',
    'pelas',
    'que',
    'se',
    'como',
    'mais',
    'menos',
    'muito',
    'pouco',
    'todo',
    'toda',
    'todos',
    'todas',
    'este',
    'esta',
    'estes',
    'estas',
    'esse',
    'essa',
    'esses',
    'essas',
    'tipo',
    'conf',
    'conforme',
    'ref',
    'referencia',
    'marca',
    'modelo',
    'cor',
    'tamanho',
    'medida',
  ]);

  constructor(private readonly configService: ConfigService) {
    this.defaultThreshold =
      this.configService.get<number>('TEXT_SIMILARITY_THRESHOLD') || 0.7;
    this.logger.log(
      `TextSimilarityService initialized with threshold: ${this.defaultThreshold}`,
    );
  }

  /**
   * Calculates the Levenshtein distance between two strings.
   *
   * The Levenshtein distance is the minimum number of single-character edits
   * (insertions, deletions, or substitutions) required to change one string
   * into the other.
   *
   * Uses Wagner-Fischer algorithm with O(n*m) time complexity.
   *
   * @param str1 - First string to compare
   * @param str2 - Second string to compare
   * @returns The edit distance (0 = identical strings)
   *
   * @example
   * levenshteinDistance('kitten', 'sitting') // Returns 3
   * levenshteinDistance('notebook', 'notebook') // Returns 0
   */
  levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Handle empty strings
    if (m === 0) return n;
    if (n === 0) return m;

    // Create matrix for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }

    // Initialize first row
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost, // Substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Calculates the Jaccard similarity between two strings.
   *
   * Jaccard similarity is the size of the intersection divided by the size
   * of the union of two sets. Here, sets are composed of words (tokens).
   *
   * Formula: |A ∩ B| / |A ∪ B|
   *
   * @param str1 - First string to compare
   * @param str2 - Second string to compare
   * @returns Similarity score between 0.0 (no overlap) and 1.0 (identical sets)
   *
   * @example
   * jaccardSimilarity('notebook dell', 'notebook hp') // Returns ~0.33
   * jaccardSimilarity('papel a4', 'papel a4') // Returns 1.0
   */
  jaccardSimilarity(str1: string, str2: string): number {
    const tokens1 = this.tokenize(str1);
    const tokens2 = this.tokenize(str2);

    if (tokens1.size === 0 && tokens2.size === 0) {
      return 1.0; // Both empty = identical
    }

    if (tokens1.size === 0 || tokens2.size === 0) {
      return 0.0; // One empty = no similarity
    }

    // Calculate intersection
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));

    // Calculate union
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Calculates the Cosine similarity between two strings using TF-IDF-like weighting.
   *
   * Cosine similarity measures the cosine of the angle between two vectors.
   * Here, vectors are term frequency vectors of the tokens.
   *
   * Formula: (A · B) / (||A|| * ||B||)
   *
   * @param str1 - First string to compare
   * @param str2 - Second string to compare
   * @returns Similarity score between 0.0 (orthogonal) and 1.0 (identical direction)
   *
   * @example
   * cosineSimilarity('notebook dell latitude', 'computador portatil dell') // Returns ~0.4
   * cosineSimilarity('papel a4 resma', 'papel a4 resma') // Returns 1.0
   */
  cosineSimilarity(str1: string, str2: string): number {
    const tokens1 = this.getTermFrequency(str1);
    const tokens2 = this.getTermFrequency(str2);

    if (tokens1.size === 0 && tokens2.size === 0) {
      return 1.0; // Both empty = identical
    }

    if (tokens1.size === 0 || tokens2.size === 0) {
      return 0.0; // One empty = no similarity
    }

    // Get all unique terms
    const allTerms = new Set([...tokens1.keys(), ...tokens2.keys()]);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of allTerms) {
      const freq1 = tokens1.get(term) || 0;
      const freq2 = tokens2.get(term) || 0;

      dotProduct += freq1 * freq2;
      magnitude1 += freq1 * freq1;
      magnitude2 += freq2 * freq2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0.0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Finds items similar to a given description from a list of candidates.
   *
   * Combines multiple similarity algorithms with configurable weights to produce
   * a robust similarity score. Items above the threshold are returned sorted
   * by score in descending order.
   *
   * @param description - Target item description to match
   * @param candidates - List of candidate items to compare against
   * @param config - Optional configuration for similarity matching
   * @returns Array of similar items with scores, sorted by similarity (highest first)
   *
   * @example
   * const similar = await findSimilarItems(
   *   'Notebook Dell Latitude',
   *   candidates,
   *   { threshold: 0.5 }
   * );
   */
  async findSimilarItems(
    description: string,
    candidates: ContractItem[],
    config: SimilarityConfig = {},
  ): Promise<SimilarItem[]> {
    const {
      threshold = this.defaultThreshold,
      jaccardWeight = 0.4,
      cosineWeight = 0.4,
      levenshteinWeight = 0.2,
      maxResults = 10,
    } = config;

    const normalizedDescription = this.normalize(description);

    if (!normalizedDescription) {
      this.logger.warn('Empty description provided for similarity search');
      return [];
    }

    const results: SimilarItem[] = [];

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalize(candidate.description);

      if (!normalizedCandidate) {
        continue;
      }

      // Calculate individual scores
      const jaccardScore = this.jaccardSimilarity(
        normalizedDescription,
        normalizedCandidate,
      );
      const cosineScore = this.cosineSimilarity(
        normalizedDescription,
        normalizedCandidate,
      );
      const levenshteinNormalized = this.normalizedLevenshteinSimilarity(
        normalizedDescription,
        normalizedCandidate,
      );

      // Calculate combined score
      const combinedScore =
        jaccardScore * jaccardWeight +
        cosineScore * cosineWeight +
        levenshteinNormalized * levenshteinWeight;

      if (combinedScore >= threshold) {
        results.push({
          item: candidate,
          score: combinedScore,
          breakdown: {
            jaccard: jaccardScore,
            cosine: cosineScore,
            levenshtein: levenshteinNormalized,
          },
        });
      }
    }

    // Sort by score descending and limit results
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }

  /**
   * Calculates combined similarity score between two strings.
   *
   * This is a convenience method that applies the default weighted combination
   * of all three similarity algorithms.
   *
   * @param str1 - First string to compare
   * @param str2 - Second string to compare
   * @param weights - Optional custom weights for each algorithm
   * @returns Combined similarity score (0.0 to 1.0)
   */
  combinedScore(
    str1: string,
    str2: string,
    weights: {
      jaccard?: number;
      cosine?: number;
      levenshtein?: number;
    } = {},
  ): number {
    const {
      jaccard: jaccardWeight = 0.4,
      cosine: cosineWeight = 0.4,
      levenshtein: levenshteinWeight = 0.2,
    } = weights;

    const normalized1 = this.normalize(str1);
    const normalized2 = this.normalize(str2);

    if (!normalized1 && !normalized2) {
      return 1.0; // Both empty = identical
    }

    if (!normalized1 || !normalized2) {
      return 0.0; // One empty = no similarity
    }

    const jaccardScore = this.jaccardSimilarity(normalized1, normalized2);
    const cosineScore = this.cosineSimilarity(normalized1, normalized2);
    const levenshteinScore = this.normalizedLevenshteinSimilarity(
      normalized1,
      normalized2,
    );

    return (
      jaccardScore * jaccardWeight +
      cosineScore * cosineWeight +
      levenshteinScore * levenshteinWeight
    );
  }

  /**
   * Normalizes a text string for comparison.
   *
   * Normalization steps:
   * 1. Convert to lowercase
   * 2. Remove accents (NFD normalization)
   * 3. Remove special characters (keep only alphanumeric and spaces)
   * 4. Normalize whitespace (multiple spaces to single space)
   * 5. Trim leading/trailing whitespace
   *
   * @param text - Raw text to normalize
   * @returns Normalized text ready for comparison
   */
  normalize(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ') // Keep only alphanumeric and spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Converts Levenshtein distance to a normalized similarity score.
   *
   * Formula: 1 - (distance / max(len1, len2))
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Normalized similarity score (0.0 to 1.0)
   */
  private normalizedLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) {
      return 1.0; // Both empty = identical
    }

    return 1 - distance / maxLength;
  }

  /**
   * Tokenizes a string into a set of unique words (excluding stop words).
   *
   * @param text - Text to tokenize
   * @returns Set of unique tokens
   */
  private tokenize(text: string): Set<string> {
    if (!text) return new Set();

    const words = text.split(/\s+/).filter((word) => {
      return word.length > 2 && !this.STOP_WORDS.has(word);
    });

    return new Set(words);
  }

  /**
   * Calculates term frequency for each word in a string.
   *
   * @param text - Text to analyze
   * @returns Map of term -> frequency count
   */
  private getTermFrequency(text: string): Map<string, number> {
    const termFreq = new Map<string, number>();

    if (!text) return termFreq;

    const words = text.split(/\s+/).filter((word) => {
      return word.length > 2 && !this.STOP_WORDS.has(word);
    });

    for (const word of words) {
      termFreq.set(word, (termFreq.get(word) || 0) + 1);
    }

    return termFreq;
  }
}
