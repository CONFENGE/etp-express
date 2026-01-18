import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Query complexity levels for RAG routing.
 *
 * - simple: Short queries without legal terms, suitable for embeddings
 * - complex: Long queries with multiple entities, may benefit from PageIndex
 * - legal: Queries containing legal terminology, best handled by PageIndex
 */
export type QueryComplexity = 'simple' | 'complex' | 'legal';

/**
 * Result of query classification with metadata.
 */
export interface ClassificationResult {
  complexity: QueryComplexity;
  confidence: number;
  reason: string;
  features: {
    length: number;
    wordCount: number;
    legalKeywordsFound: string[];
    hasNumbers: boolean;
    hasMultipleEntities: boolean;
  };
}

/**
 * Default legal keywords used to detect legal complexity.
 * These are common terms in Brazilian public procurement law.
 */
const DEFAULT_LEGAL_KEYWORDS = [
  // Legislation references
  'lei',
  'artigo',
  'art.',
  'inciso',
  'parágrafo',
  'paragrafo',
  'alínea',
  'alinea',
  'decreto',
  'portaria',
  'instrução normativa',
  'instrucao normativa',
  'in seges',
  'resolução',
  'resolucao',
  // Control bodies
  'tcu',
  'tce',
  'tce-sp',
  'tcesp',
  'cgu',
  'agu',
  // Legal terms
  'súmula',
  'sumula',
  'acórdão',
  'acordao',
  'jurisprudência',
  'jurisprudencia',
  'precedente',
  'decisão',
  'decisao',
  // Procurement terms
  'licitação',
  'licitacao',
  'pregão',
  'pregao',
  'dispensa',
  'inexigibilidade',
  'contratação direta',
  'contratacao direta',
  'edital',
  'termo de referência',
  'termo de referencia',
  'etp',
  // Specific laws
  '14.133',
  '14133',
  '8.666',
  '8666',
  '10.520',
  '10520',
  '13.303',
  '13303',
  // Compliance terms
  'conformidade',
  'compliance',
  'auditoria',
  'fiscalização',
  'fiscalizacao',
  'irregularidade',
  'sobrepreço',
  'sobrepreco',
  'superfaturamento',
];

/**
 * QueryComplexityClassifierService - Classifies query complexity for RAG routing.
 *
 * This service analyzes incoming queries and classifies them into three categories:
 * - simple: Best handled by fast embeddings-based RAG
 * - complex: May benefit from structured PageIndex search
 * - legal: Contains legal terminology, should use PageIndex for accuracy
 *
 * The classifier uses multiple heuristics:
 * 1. Length thresholds (configurable via env)
 * 2. Legal keyword detection
 * 3. Entity detection (numbers, dates, references)
 * 4. Word count analysis
 *
 * @see Issue #1592 - [RAG-1542a] Implementar query complexity classifier
 * @see Issue #1542 - Hybrid RAG parent issue
 */
@Injectable()
export class QueryComplexityClassifierService {
  private readonly logger = new Logger(QueryComplexityClassifierService.name);

  /**
   * Minimum character length to consider a query as 'complex'.
   * Default: 50 characters
   */
  private readonly complexityThreshold: number;

  /**
   * Minimum character length to definitely classify as 'complex'.
   * Default: 100 characters
   */
  private readonly highComplexityThreshold: number;

  /**
   * Minimum number of legal keywords to force 'legal' classification.
   * Default: 1
   */
  private readonly legalKeywordThreshold: number;

  /**
   * Set of legal keywords for detection (lowercase).
   */
  private readonly legalKeywords: Set<string>;

  constructor(private readonly configService: ConfigService) {
    this.complexityThreshold = this.configService.get<number>(
      'RAG_COMPLEXITY_THRESHOLD',
      50,
    );
    this.highComplexityThreshold = this.configService.get<number>(
      'RAG_HIGH_COMPLEXITY_THRESHOLD',
      100,
    );
    this.legalKeywordThreshold = this.configService.get<number>(
      'RAG_LEGAL_KEYWORD_THRESHOLD',
      1,
    );

    // Build keyword set from default + any custom keywords
    const customKeywords = this.configService.get<string>(
      'RAG_LEGAL_KEYWORDS',
      '',
    );
    const allKeywords = [
      ...DEFAULT_LEGAL_KEYWORDS,
      ...customKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ];
    this.legalKeywords = new Set(allKeywords);

    this.logger.log('QueryComplexityClassifier initialized', {
      complexityThreshold: this.complexityThreshold,
      highComplexityThreshold: this.highComplexityThreshold,
      legalKeywordThreshold: this.legalKeywordThreshold,
      legalKeywordsCount: this.legalKeywords.size,
    });
  }

  /**
   * Classify a query's complexity level.
   *
   * @param query - The search query to classify
   * @returns The complexity level: 'simple', 'complex', or 'legal'
   *
   * @example
   * classifier.classify('preço de computador') // 'simple'
   * classifier.classify('artigo 75 da lei 14133') // 'legal'
   * classifier.classify('...long complex query...') // 'complex'
   */
  classify(query: string): QueryComplexity {
    return this.classifyWithDetails(query).complexity;
  }

  /**
   * Classify a query with full details and reasoning.
   *
   * @param query - The search query to classify
   * @returns Classification result with complexity, confidence, and features
   */
  classifyWithDetails(query: string): ClassificationResult {
    const normalizedQuery = query.toLowerCase().trim();
    const features = this.extractFeatures(normalizedQuery);

    // Log the classification attempt
    this.logger.debug('Classifying query', {
      queryPreview: query.substring(0, 80),
      length: features.length,
      wordCount: features.wordCount,
    });

    // Priority 1: Legal keywords take precedence
    if (features.legalKeywordsFound.length >= this.legalKeywordThreshold) {
      const result: ClassificationResult = {
        complexity: 'legal',
        confidence: this.calculateLegalConfidence(features),
        reason: `Found ${features.legalKeywordsFound.length} legal keyword(s): ${features.legalKeywordsFound.slice(0, 3).join(', ')}`,
        features,
      };
      this.logger.debug('Query classified as legal', {
        keywords: features.legalKeywordsFound,
      });
      return result;
    }

    // Priority 2: Length-based classification
    if (features.length >= this.highComplexityThreshold) {
      const result: ClassificationResult = {
        complexity: 'complex',
        confidence: 0.9,
        reason: `Query length (${features.length}) exceeds high complexity threshold (${this.highComplexityThreshold})`,
        features,
      };
      this.logger.debug('Query classified as complex (high length)', {
        length: features.length,
      });
      return result;
    }

    // Priority 3: Multiple entities suggest complexity
    if (
      features.hasMultipleEntities &&
      features.length >= this.complexityThreshold
    ) {
      const result: ClassificationResult = {
        complexity: 'complex',
        confidence: 0.75,
        reason: 'Query contains multiple entities with moderate length',
        features,
      };
      this.logger.debug('Query classified as complex (entities)', {
        hasNumbers: features.hasNumbers,
      });
      return result;
    }

    // Priority 4: Medium length queries
    if (
      features.length >= this.complexityThreshold &&
      features.wordCount >= 8
    ) {
      const result: ClassificationResult = {
        complexity: 'complex',
        confidence: 0.6,
        reason: `Query length (${features.length}) and word count (${features.wordCount}) suggest complexity`,
        features,
      };
      this.logger.debug('Query classified as complex (length+words)');
      return result;
    }

    // Default: Simple query
    const result: ClassificationResult = {
      complexity: 'simple',
      confidence: this.calculateSimpleConfidence(features),
      reason: `Short query (${features.length} chars) without legal terms`,
      features,
    };
    this.logger.debug('Query classified as simple', {
      length: features.length,
    });
    return result;
  }

  /**
   * Extract features from a normalized query for classification.
   */
  private extractFeatures(
    normalizedQuery: string,
  ): ClassificationResult['features'] {
    const words = normalizedQuery.split(/\s+/).filter(Boolean);

    // Find legal keywords in query
    const legalKeywordsFound: string[] = [];
    for (const keyword of this.legalKeywords) {
      if (normalizedQuery.includes(keyword)) {
        legalKeywordsFound.push(keyword);
      }
    }

    // Check for numbers (law references, years, article numbers)
    const hasNumbers = /\d{2,}/.test(normalizedQuery);

    // Check for multiple entities (numbers + text patterns)
    const numberMatches = normalizedQuery.match(/\d+/g) || [];
    const hasMultipleEntities = numberMatches.length >= 2 || words.length >= 10;

    return {
      length: normalizedQuery.length,
      wordCount: words.length,
      legalKeywordsFound,
      hasNumbers,
      hasMultipleEntities,
    };
  }

  /**
   * Calculate confidence for legal classification.
   */
  private calculateLegalConfidence(
    features: ClassificationResult['features'],
  ): number {
    let confidence = 0.7; // Base confidence for legal

    // More keywords = higher confidence
    confidence += Math.min(0.2, features.legalKeywordsFound.length * 0.05);

    // Numbers (law references) increase confidence
    if (features.hasNumbers) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate confidence for simple classification.
   */
  private calculateSimpleConfidence(
    features: ClassificationResult['features'],
  ): number {
    let confidence = 0.9; // High base confidence for simple

    // Longer queries reduce confidence in "simple" classification
    if (features.length > 30) {
      confidence -= 0.1;
    }
    if (features.wordCount > 5) {
      confidence -= 0.1;
    }

    return Math.max(0.5, confidence);
  }

  /**
   * Check if a specific keyword is in the legal keywords set.
   * Useful for testing and debugging.
   */
  hasLegalKeyword(keyword: string): boolean {
    return this.legalKeywords.has(keyword.toLowerCase());
  }

  /**
   * Get all configured legal keywords.
   * Useful for debugging and documentation.
   */
  getLegalKeywords(): string[] {
    return Array.from(this.legalKeywords).sort();
  }
}
