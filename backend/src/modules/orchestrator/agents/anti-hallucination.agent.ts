import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RAGService, VerificationResult } from '../../rag/rag.service';
import { LegislationType } from '../../../entities/legislation.entity';
import { ExaService } from '../../search/exa/exa.service';
import { PageIndexService } from '../../pageindex/pageindex.service';
import { JurisprudenciaService } from '../../pageindex/services/jurisprudencia.service';
import { DocumentType } from '../../pageindex/dto/index-document.dto';

export interface LegalReference {
  type: LegislationType;
  number: string;
  year: number;
  raw: string; // Original text matched
}

export interface ReferenceVerification {
  reference: string;
  verified: boolean;
  confidence: number;
  suggestion?: string;
}

/**
 * Result from PageIndex tree search verification.
 */
export interface PageIndexVerificationResult {
  reference: string;
  verified: boolean;
  confidence: number;
  pageIndexMatch?: {
    documentName: string;
    relevantNodes: Array<{
      title: string;
      content?: string;
    }>;
    path: string[];
    reasoning: string;
  };
  source: 'pageindex' | 'jurisprudencia';
}

export interface EnhancedHallucinationCheckResult {
  overallScore: number; // 0-100
  overallVerified: boolean; // score >= threshold

  categories: {
    legalReferences: {
      score: number;
      total: number;
      verified: number;
      details: ReferenceVerification[];
    };
    factualClaims: {
      score: number;
      warnings: string[];
    };
    prohibitedPhrases: {
      score: number;
      found: string[];
    };
    pageIndexVerification?: {
      score: number;
      verified: number;
      total: number;
      details: PageIndexVerificationResult[];
    };
  };

  recommendations: string[];
}

// Legacy interface - maintained for backward compatibility
export interface HallucinationCheckResult {
  score: number;
  confidence: number;
  warnings: string[];
  suspiciousElements: Array<{
    element: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  verified: boolean;
  references?: VerificationResult[]; // RAG verification results
  suggestions?: string[]; // Improvement suggestions
  pageIndexResults?: PageIndexVerificationResult[]; // NEW: PageIndex verification results
}

/**
 * Agent responsible for detecting and mitigating potential hallucinations in LLM-generated content.
 *
 * @remarks
 * **DESIGN DECISION: HYBRID VALIDATION (Deterministic + PageIndex Tree Search)**
 *
 * This agent now uses a hybrid approach combining:
 *
 * 1. **Deterministic Validation** (Regex patterns + RAG database lookup):
 *    - Same input always produces same output (critical for public procurement)
 *    - Validation runs in milliseconds
 *    - No OpenAI token consumption for basic validation
 *
 * 2. **PageIndex Tree Search** (NEW - Issue #1541):
 *    - LLM reasoning-based validation for complex legal references
 *    - 98.7% accuracy vs ~80% traditional RAG
 *    - Searches Lei 14.133/2021 and indexed jurisprudence (TCE-SP, TCU)
 *    - Provides exact page/section/article citations
 *    - Fallback to Exa API for external fact-checking
 *
 * **Validation Flow:**
 * 1. Extract legal references (regex) and tribunal citations
 * 2. Verify with local RAG database (fast, deterministic)
 * 3. If not found locally, search with PageIndex tree search (more accurate)
 * 4. If PageIndex finds nothing, fallback to Exa API (external)
 * 5. Calculate weighted score based on all verification results
 *
 * **WARNING**: PageIndex adds LLM calls during verification. This impacts:
 * - Cost (each tree search uses ~500 tokens)
 * - Latency (~1-2s per PageIndex search)
 * Use `enablePageIndex: false` in options to disable for performance-critical paths.
 *
 * @see ARCHITECTURE.md section 3.3 "Arquitetura de Agentes: Determinísticos vs Probabilísticos"
 * @see Issue #1541 - Integrar PageIndex no Anti-Hallucination Agent
 * @see OrchestratorService - Uses this agent as final validation step
 */
@Injectable()
export class AntiHallucinationAgent {
  private readonly logger = new Logger(AntiHallucinationAgent.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly exaService: ExaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PageIndexService))
    private readonly pageIndexService: PageIndexService,
    @Inject(forwardRef(() => JurisprudenciaService))
    private readonly jurisprudenciaService: JurisprudenciaService,
  ) {}

  private readonly suspiciousPatterns = [
    {
      pattern: /(?:lei|decreto|portaria|instrução normativa)\s+n?[º°]?\s*\d+/gi,
      description: 'Referência a norma legal',
      severity: 'high' as const,
    },
    {
      pattern: /artigo\s+\d+|art\.\s*\d+/gi,
      description: 'Referência a artigo de lei',
      severity: 'high' as const,
    },
    {
      pattern: /\d{1,3}[.,]\d{3}[.,]\d{3}[.,]\d{2}/g,
      description: 'Valor monetário específico',
      severity: 'medium' as const,
    },
    {
      pattern: /(?:em|no ano de|ano)\s+\d{4}/gi,
      description: 'Referência a ano/data específica',
      severity: 'medium' as const,
    },
    {
      pattern: /processo\s+n?[º°]?\s*[\d/\-.]+/gi,
      description: 'Número de processo',
      severity: 'high' as const,
    },
    {
      pattern: /(?:conforme|segundo)\s+(?:TCU|CNJ|AGU|STF|STJ)/gi,
      description: 'Citação de órgão de controle',
      severity: 'high' as const,
    },
    {
      pattern: /(?:súmula|sumula|acordão|acordao)\s+(?:n?[º°]?\s*)?\d+/gi,
      description: 'Citação de jurisprudência',
      severity: 'high' as const,
    },
    {
      pattern: /(?:TCE-?SP|TCU)\s+(?:súmula|sumula|acordão|acordao)/gi,
      description: 'Citação de tribunal de contas',
      severity: 'high' as const,
    },
  ];

  private readonly prohibitedClaims = [
    'melhor do mercado',
    'único capaz',
    'comprovadamente superior',
    'indiscutivelmente',
    'certamente',
    'sem dúvida',
    'é fato que',
    'todos sabem',
  ];

  /**
   * Extract legal references from content for RAG verification.
   * Parses patterns like "Lei 14.133/2021", "Decreto 10.024/2019", etc.
   */
  private extractLegalReferences(content: string): LegalReference[] {
    const references: LegalReference[] = [];
    const pattern =
      /(?:lei|decreto|portaria|instrução normativa|in|resolução|mp|medida provisória)\s+n?[º°]?\s*([\d.]+)(?:\s*\/|\s+de\s+)(\d{4})/gi;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const rawType = match[0].split(/\s+/)[0].toLowerCase();
      const number = match[1].replace(/\./g, '');
      const year = parseInt(match[2], 10);

      let type: LegislationType;
      if (rawType.includes('lei')) type = LegislationType.LEI;
      else if (rawType.includes('decreto')) type = LegislationType.DECRETO;
      else if (rawType.includes('portaria')) type = LegislationType.PORTARIA;
      else if (rawType.includes('in') || rawType.includes('instrução'))
        type = LegislationType.INSTRUCAO_NORMATIVA;
      else if (rawType.includes('resolução') || rawType.includes('resolu'))
        type = LegislationType.RESOLUCAO;
      else if (rawType.includes('mp') || rawType.includes('medida'))
        type = LegislationType.MEDIDA_PROVISORIA;
      else continue; // Skip unknown types

      references.push({
        type,
        number,
        year,
        raw: match[0],
      });
    }

    return references;
  }

  /**
   * Extract jurisprudence references (TCE-SP, TCU sumulas/acordaos).
   */
  private extractJurisprudenceReferences(
    content: string,
  ): Array<{ raw: string; tribunal: 'TCE-SP' | 'TCU'; type: string }> {
    const references: Array<{
      raw: string;
      tribunal: 'TCE-SP' | 'TCU';
      type: string;
    }> = [];

    // Pattern for TCE-SP and TCU citations
    const pattern =
      /(?:(?:TCE-?SP|TCU)\s+)?(?:súmula|sumula|acordão|acordao|decisão normativa)\s+(?:n?[º°]?\s*)?(\d+)(?:\/(\d{4}))?/gi;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const raw = match[0];
      const tribunal = raw.toUpperCase().includes('TCE')
        ? ('TCE-SP' as const)
        : ('TCU' as const);
      const type = raw.toLowerCase().includes('súmula')
        ? 'sumula'
        : raw.toLowerCase().includes('acordão')
          ? 'acordao'
          : 'decisao';

      references.push({ raw, tribunal, type });
    }

    return references;
  }

  /**
   * Verify legal references using RAG service with Exa fallback.
   * First attempts local RAG verification, then falls back to Exa for external fact-checking.
   * Returns verification results for each reference found.
   */
  private async verifyReferences(
    references: LegalReference[],
  ): Promise<VerificationResult[]> {
    const verifications = await Promise.all(
      references.map(async (ref) => {
        try {
          // 1. First, try local RAG verification (fast)
          const localResult = await this.ragService.verifyReference(
            ref.type,
            ref.number,
            ref.year,
          );

          // 2. If found locally, return local result with high confidence
          if (localResult.exists) {
            this.logger.debug('Reference verified locally', {
              reference: ref.raw,
            });
            return { ...localResult, source: 'local' };
          }

          // 3. If not found locally, fact-check via Exa (slower, fallback)
          this.logger.log(
            'Reference not found locally, attempting fact-check via Exa',
            { reference: ref.raw },
          );

          const externalResult = await this.exaService.factCheckLegalReference({
            type: ref.type,
            number: ref.number,
            year: ref.year,
          });

          // 4. If found externally, suggest adding to local DB
          if (externalResult.exists) {
            this.logger.log(
              'Reference found externally via Exa - consider adding to local database',
              {
                reference: ref.raw,
                description: externalResult.description,
              },
            );
          }

          // Convert ExaService.FactCheckResult to RAGService.VerificationResult
          // Only preserve RAG suggestion if it exists (don't treat Exa "not found" as suggestion)
          return {
            reference: externalResult.reference,
            exists: externalResult.exists,
            confidence: externalResult.confidence,
            suggestion: localResult.suggestion, // Only use RAG suggestion, not external "not found"
          };
        } catch (error: unknown) {
          this.logger.error('Failed to verify reference (local and external)', {
            error: error instanceof Error ? error.message : String(error),
            reference: ref.raw,
          });
          // Return unverified result on error
          return {
            reference: ref.raw,
            exists: false,
            confidence: 0.0,
          };
        }
      }),
    );

    return verifications;
  }

  /**
   * Verify references using PageIndex tree search.
   * Searches through indexed legislation (Lei 14.133/2021) and jurisprudence.
   *
   * @param content - Content to verify (used to build queries)
   * @param legalReferences - Extracted legal references
   * @returns PageIndex verification results
   */
  async verifyWithPageIndex(
    content: string,
    legalReferences: LegalReference[],
  ): Promise<PageIndexVerificationResult[]> {
    const results: PageIndexVerificationResult[] = [];

    // 1. Verify legal references against indexed legislation
    for (const ref of legalReferences) {
      try {
        // Build query for PageIndex tree search
        const query = `${ref.raw}`;

        // Search in legislation trees (Lei 14.133/2021, etc.)
        const searchResult = await this.pageIndexService.searchTree(
          await this.getLegislationTreeId(),
          query,
          {
            maxResults: 3,
            minConfidence: 0.5,
            includeContent: true,
            maxDepth: 5,
          },
        );

        if (
          searchResult.relevantNodes.length > 0 &&
          searchResult.confidence >= 0.5
        ) {
          results.push({
            reference: ref.raw,
            verified: true,
            confidence: searchResult.confidence,
            pageIndexMatch: {
              documentName: 'Lei 14.133/2021',
              relevantNodes: searchResult.relevantNodes.map((node) => ({
                title: node.title,
                content: node.content?.substring(0, 500),
              })),
              path: searchResult.path,
              reasoning: searchResult.reasoning,
            },
            source: 'pageindex',
          });

          this.logger.debug('Reference verified via PageIndex', {
            reference: ref.raw,
            confidence: searchResult.confidence,
            path: searchResult.path,
          });
        } else {
          results.push({
            reference: ref.raw,
            verified: false,
            confidence: searchResult.confidence,
            source: 'pageindex',
          });
        }
      } catch (error) {
        this.logger.warn('PageIndex verification failed for reference', {
          reference: ref.raw,
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't add failed verifications - let other methods handle them
      }
    }

    // 2. Verify jurisprudence references against TCE-SP/TCU
    const jurisprudenceRefs = this.extractJurisprudenceReferences(content);

    for (const jurisRef of jurisprudenceRefs) {
      try {
        const searchResult = await this.jurisprudenciaService.searchByText(
          jurisRef.raw,
          {
            tribunal: jurisRef.tribunal,
            limit: 3,
            minConfidence: 0.5,
            includeContent: true,
          },
        );

        if (searchResult.items.length > 0 && searchResult.confidence >= 0.5) {
          results.push({
            reference: jurisRef.raw,
            verified: true,
            confidence: searchResult.confidence,
            pageIndexMatch: {
              documentName: `Jurisprudência ${jurisRef.tribunal}`,
              relevantNodes: searchResult.items.map((item) => ({
                title: item.title,
                content: item.content?.substring(0, 500),
              })),
              path: [jurisRef.tribunal, jurisRef.type],
              reasoning: searchResult.reasoning,
            },
            source: 'jurisprudencia',
          });

          this.logger.debug('Jurisprudence verified via PageIndex', {
            reference: jurisRef.raw,
            tribunal: jurisRef.tribunal,
            confidence: searchResult.confidence,
          });
        } else {
          results.push({
            reference: jurisRef.raw,
            verified: false,
            confidence: searchResult.confidence,
            source: 'jurisprudencia',
          });
        }
      } catch (error) {
        this.logger.warn('Jurisprudence verification failed', {
          reference: jurisRef.raw,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Get the tree ID for legislation (Lei 14.133/2021).
   * Caches the ID to avoid repeated lookups.
   */
  private legislationTreeId: string | null = null;

  private async getLegislationTreeId(): Promise<string> {
    if (this.legislationTreeId) {
      return this.legislationTreeId;
    }

    const trees = await this.pageIndexService.listTrees({
      documentType: DocumentType.LEGISLATION,
      limit: 1,
    });

    if (trees.length > 0) {
      this.legislationTreeId = trees[0].treeId;
      return this.legislationTreeId;
    }

    throw new Error(
      'No legislation tree found. Please run Lei 14.133 seeder first.',
    );
  }

  /**
   * Generate improvement suggestions based on verification results.
   */
  private generateSuggestions(verifications: VerificationResult[]): string[] {
    const suggestions: string[] = [];

    verifications.forEach((v) => {
      if (!v.exists && v.suggestion) {
        suggestions.push(v.suggestion);
      } else if (!v.exists) {
        suggestions.push(
          `Referência "${v.reference}" não foi encontrada no banco de dados. Verifique a veracidade antes de usar.`,
        );
      }
    });

    return suggestions;
  }

  /**
   * Get weight for a legal reference based on its type.
   * Higher weights for more authoritative legislation (Leis > Decretos > Portarias).
   */
  private getReferenceWeight(reference: LegalReference): number {
    const weights: Record<LegislationType, number> = {
      [LegislationType.LEI]: 3,
      [LegislationType.DECRETO]: 2,
      [LegislationType.PORTARIA]: 1,
      [LegislationType.INSTRUCAO_NORMATIVA]: 1,
      [LegislationType.RESOLUCAO]: 1,
      [LegislationType.MEDIDA_PROVISORIA]: 2,
    };
    return weights[reference.type] || 1;
  }

  /**
   * Calculate weighted score based on RAG verification results.
   * Returns 0-100 score where:
   * - 100 = all references verified with high confidence
   * - 50 = partially correct references (suggestions exist)
   * - 0 = no references verified
   */
  private calculateScore(
    verifications: VerificationResult[],
    references: LegalReference[],
  ): number {
    if (verifications.length === 0) return 100; // No references to verify = perfect score

    let totalWeight = 0;
    let weightedScore = 0;

    for (let i = 0; i < verifications.length; i++) {
      const verification = verifications[i];
      const reference = references[i]; // Assumes same order

      if (!reference) continue; // Safety check

      const weight = this.getReferenceWeight(reference);
      totalWeight += weight;

      if (verification.exists) {
        // Verified reference: full score weighted by confidence
        weightedScore += weight * (verification.confidence || 1.0);
      } else if (verification.suggestion) {
        // Partially correct (e.g., right law, wrong article): 50% score
        weightedScore += weight * 0.5;
      }
      // If not exists and no suggestion: 0 points
    }

    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
  }

  /**
   * Calculate score from PageIndex verification results.
   */
  private calculatePageIndexScore(
    results: PageIndexVerificationResult[],
  ): number {
    if (results.length === 0) return 100;

    const verifiedCount = results.filter((r) => r.verified).length;
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);

    // Weighted: 70% verified ratio, 30% average confidence
    const verifiedRatio = (verifiedCount / results.length) * 100;
    const avgConfidence = (totalConfidence / results.length) * 100;

    return verifiedRatio * 0.7 + avgConfidence * 0.3;
  }

  async check(
    content: string,
    _context?: unknown,
    options?: { enablePageIndex?: boolean },
  ): Promise<HallucinationCheckResult> {
    this.logger.log('Checking for potential hallucinations');

    const enablePageIndex = options?.enablePageIndex ?? true;

    const warnings: string[] = [];
    const suspiciousElements: Array<{
      element: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // **Extract and verify legal references via RAG**
    const legalReferences = this.extractLegalReferences(content);
    const verifications = await this.verifyReferences(legalReferences);

    // **NEW: Verify with PageIndex tree search (if enabled)**
    let pageIndexResults: PageIndexVerificationResult[] = [];
    if (enablePageIndex) {
      try {
        pageIndexResults = await this.verifyWithPageIndex(
          content,
          legalReferences,
        );

        // Add PageIndex-verified references that weren't found in RAG
        pageIndexResults.forEach((piResult) => {
          if (piResult.verified) {
            // Check if this reference wasn't already verified by RAG
            const ragVerified = verifications.some(
              (v) => v.reference === piResult.reference && v.exists,
            );
            if (!ragVerified) {
              this.logger.debug(
                'Reference verified by PageIndex but not in RAG',
                {
                  reference: piResult.reference,
                  source: piResult.source,
                  confidence: piResult.confidence,
                },
              );
            }
          }
        });
      } catch (error) {
        this.logger.warn('PageIndex verification unavailable', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Add warnings for unverified references
    verifications.forEach((v) => {
      // Check if PageIndex verified it
      const pageIndexVerified = pageIndexResults.some(
        (pi) => pi.reference === v.reference && pi.verified,
      );

      if (!v.exists && !pageIndexVerified) {
        suspiciousElements.push({
          element: v.reference,
          reason: `Referência legal não verificada${v.suggestion ? ` - ${v.suggestion}` : ''}`,
          severity: 'high',
        });
        warnings.push(`Referência não verificada: "${v.reference}"`);
      }
    });

    // Add warnings for unverified jurisprudence (PageIndex-only)
    pageIndexResults
      .filter((pi) => pi.source === 'jurisprudencia' && !pi.verified)
      .forEach((pi) => {
        suspiciousElements.push({
          element: pi.reference,
          reason: 'Jurisprudência não encontrada na base TCE-SP/TCU indexada',
          severity: 'high',
        });
        warnings.push(`Jurisprudência não verificada: "${pi.reference}"`);
      });

    // Check for suspicious patterns (legacy heuristic - kept for backward compatibility)
    this.suspiciousPatterns.forEach(({ pattern, description, severity }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          // Skip if already verified via RAG or PageIndex
          const alreadyVerified =
            verifications.some(
              (v) => v.reference.includes(match) && v.exists,
            ) ||
            pageIndexResults.some(
              (pi) => pi.verified && pi.reference.includes(match),
            );
          if (!alreadyVerified) {
            suspiciousElements.push({
              element: match,
              reason: `${description} - VERIFICAR VERACIDADE`,
              severity,
            });
            warnings.push(`Verifique a veracidade de: "${match}"`);
          }
        });
      }
    });

    // Check for prohibited claims
    this.prohibitedClaims.forEach((claim) => {
      const regex = new RegExp(claim, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          suspiciousElements.push({
            element: match,
            reason: 'Afirmação categórica sem fundamentação',
            severity: 'medium',
          });
          warnings.push(`Evite afirmações categóricas como: "${match}"`);
        });
      }
    });

    // Check for overly specific claims without source
    const hasSpecificNumbers =
      /\d+%|\d+\s*milhões?|\d+\s*bilhões?|\d+\s*vezes/gi.test(content);
    const hasSources = /fonte:|referência:|conforme|segundo/gi.test(content);

    if (hasSpecificNumbers && !hasSources) {
      warnings.push(
        'Dados numéricos específicos detectados sem citação de fonte. Adicione referências.',
      );
      suspiciousElements.push({
        element: 'Dados numéricos',
        reason: 'Números específicos sem fonte citada',
        severity: 'medium',
      });
    }

    // Check for vague or hedging language (good in this context)
    const hedgeWords = [
      'aproximadamente',
      'cerca de',
      'estima-se',
      'pode',
      'possivelmente',
      'geralmente',
    ];
    const hedgeCount = hedgeWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);

    // Some hedging is good - it shows appropriate uncertainty
    const wordCount = content.split(/\s+/).length;
    const hedgeRatio = hedgeCount / wordCount;

    if (hedgeRatio < 0.01 && suspiciousElements.length > 3) {
      warnings.push(
        'Texto muito assertivo para conteúdo gerado por IA. Considere adicionar linguagem que indique estimativas quando apropriado.',
      );
    }

    // **Calculate combined score**
    // If there are legal references, use weighted scoring based on verification
    let score: number;

    if (legalReferences.length > 0 || pageIndexResults.length > 0) {
      // Calculate RAG-based score
      const ragScore = this.calculateScore(verifications, legalReferences);

      // Calculate PageIndex-based score
      const pageIndexScore = this.calculatePageIndexScore(pageIndexResults);

      // Combined score: weighted average if PageIndex is enabled
      if (enablePageIndex && pageIndexResults.length > 0) {
        // PageIndex has higher weight (60%) due to higher accuracy
        score = ragScore * 0.4 + pageIndexScore * 0.6;
      } else {
        score = ragScore;
      }

      // Apply penalties for non-reference issues (prohibited claims, unsourced data)
      const nonReferenceIssues = suspiciousElements.filter(
        (e) =>
          !verifications.some((v) => v.reference.includes(e.element)) &&
          !pageIndexResults.some((pi) => pi.reference.includes(e.element)) &&
          e.element !== 'Dados numéricos',
      );
      const prohibitedClaimsCount = nonReferenceIssues.filter((e) =>
        e.reason.includes('categórica'),
      ).length;
      const unsourcedDataPenalty = suspiciousElements.some(
        (e) => e.element === 'Dados numéricos',
      )
        ? 10
        : 0;

      // Apply minor penalties (don't let non-reference issues dominate)
      score = Math.max(
        0,
        score - prohibitedClaimsCount * 5 - unsourcedDataPenalty,
      );
    } else {
      // Legacy heuristic scoring (no legal references to verify)
      const highSeverityCount = suspiciousElements.filter(
        (e) => e.severity === 'high',
      ).length;
      const mediumSeverityCount = suspiciousElements.filter(
        (e) => e.severity === 'medium',
      ).length;
      const penaltyScore = highSeverityCount * 15 + mediumSeverityCount * 5;
      score = Math.max(0, 100 - penaltyScore);
    }

    // Confidence is based on verification results (if available) or inverse of suspicious elements
    const totalVerified =
      verifications.filter((v) => v.exists).length +
      pageIndexResults.filter((pi) => pi.verified).length;
    const totalReferences = legalReferences.length + pageIndexResults.length;

    const verifiedReferencesRatio =
      totalReferences > 0 ? totalVerified / totalReferences : 1.0;

    const confidence = Math.round(
      verifiedReferencesRatio * 100 -
        suspiciousElements.filter(
          (e) =>
            !verifications.some((v) => v.reference.includes(e.element)) &&
            !pageIndexResults.some((pi) => pi.reference.includes(e.element)) &&
            e.element !== 'Dados numéricos',
        ).length *
          5,
    );

    // Get configurable threshold from environment (default: 70)
    const threshold = this.configService.get<number>(
      'HALLUCINATION_THRESHOLD',
      70,
    );
    const verified = suspiciousElements.length === 0 || score >= threshold;

    const suggestions = this.generateSuggestions(verifications);

    // Add PageIndex-specific suggestions
    pageIndexResults
      .filter((pi) => !pi.verified)
      .forEach((pi) => {
        if (!suggestions.some((s) => s.includes(pi.reference))) {
          suggestions.push(
            `Referência "${pi.reference}" não foi encontrada via PageIndex (${pi.source}). Verifique a fonte original.`,
          );
        }
      });

    this.logger.log(
      `Hallucination check completed. Score: ${score.toFixed(1)}%, Confidence: ${confidence}%, Verified: ${verified}, RAG verified: ${verifications.filter((v) => v.exists).length}/${verifications.length}, PageIndex verified: ${pageIndexResults.filter((pi) => pi.verified).length}/${pageIndexResults.length}, Threshold: ${threshold}`,
    );

    return {
      score,
      confidence,
      warnings: [...new Set(warnings)],
      suspiciousElements,
      verified,
      references: verifications.length > 0 ? verifications : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      pageIndexResults:
        pageIndexResults.length > 0 ? pageIndexResults : undefined,
    };
  }

  /**
   * Enhanced hallucination check with detailed categorization.
   * Returns comprehensive analysis with separate scores for legal references,
   * factual claims, and prohibited phrases.
   */
  async checkEnhanced(
    content: string,
    _context?: unknown,
    options?: { enablePageIndex?: boolean },
  ): Promise<EnhancedHallucinationCheckResult> {
    this.logger.log('Running enhanced hallucination check with categorization');

    const enablePageIndex = options?.enablePageIndex ?? true;

    // Extract and verify legal references
    const legalReferences = this.extractLegalReferences(content);
    const verifications = await this.verifyReferences(legalReferences);

    // Verify with PageIndex
    let pageIndexResults: PageIndexVerificationResult[] = [];
    if (enablePageIndex) {
      try {
        pageIndexResults = await this.verifyWithPageIndex(
          content,
          legalReferences,
        );
      } catch (error) {
        this.logger.warn('PageIndex verification unavailable', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Calculate legal references score (weighted)
    const legalReferencesScore = this.calculateScore(
      verifications,
      legalReferences,
    );
    const verifiedCount = verifications.filter((v) => v.exists).length;

    // Build detailed reference verification results
    const referenceDetails: ReferenceVerification[] = verifications.map(
      (v) => ({
        reference: v.reference,
        verified: v.exists,
        confidence: v.confidence || 0,
        suggestion: v.suggestion,
      }),
    );

    // Check for prohibited phrases
    const prohibitedFound: string[] = [];
    this.prohibitedClaims.forEach((claim) => {
      const regex = new RegExp(claim, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        prohibitedFound.push(...matches.map((m) => m));
      }
    });

    // Prohibited phrases score (100 if none, decreasing by 10 per phrase)
    const prohibitedPhrasesScore = Math.max(
      0,
      100 - prohibitedFound.length * 10,
    );

    // Check for factual claims (numbers without sources)
    const factualWarnings: string[] = [];
    const hasSpecificNumbers =
      /\d+%|\d+\s*milhões?|\d+\s*bilhões?|\d+\s*vezes/gi.test(content);
    const hasSources = /fonte:|referência:|conforme|segundo/gi.test(content);

    if (hasSpecificNumbers && !hasSources) {
      factualWarnings.push(
        'Dados numéricos específicos detectados sem citação de fonte',
      );
    }

    // Factual claims score (100 if no warnings, 70 if has warnings)
    const factualClaimsScore = factualWarnings.length > 0 ? 70 : 100;

    // PageIndex verification score
    const pageIndexScore = this.calculatePageIndexScore(pageIndexResults);
    const pageIndexVerified = pageIndexResults.filter(
      (pi) => pi.verified,
    ).length;

    // Calculate overall score (weighted average)
    const categoryWeights = {
      legalReferences: 0.4, // 40% weight
      factualClaims: 0.2, // 20% weight
      prohibitedPhrases: 0.1, // 10% weight
      pageIndex: 0.3, // 30% weight (NEW)
    };

    let overallScore: number;
    if (enablePageIndex && pageIndexResults.length > 0) {
      overallScore =
        legalReferencesScore * categoryWeights.legalReferences +
        factualClaimsScore * categoryWeights.factualClaims +
        prohibitedPhrasesScore * categoryWeights.prohibitedPhrases +
        pageIndexScore * categoryWeights.pageIndex;
    } else {
      // Without PageIndex, redistribute weights
      overallScore =
        legalReferencesScore * 0.5 +
        factualClaimsScore * 0.3 +
        prohibitedPhrasesScore * 0.2;
    }

    // Get configurable threshold from environment
    const threshold = this.configService.get<number>(
      'HALLUCINATION_THRESHOLD',
      70,
    );
    const overallVerified = overallScore >= threshold;

    // Generate specific recommendations by category
    const recommendations: string[] = [];

    // Legal references recommendations
    if (legalReferencesScore < 80) {
      recommendations.push(
        `Apenas ${verifiedCount}/${legalReferences.length} referências legais foram verificadas. Revise as referências não verificadas.`,
      );
    }
    verifications.forEach((v) => {
      if (!v.exists && v.suggestion) {
        recommendations.push(v.suggestion);
      } else if (!v.exists) {
        recommendations.push(
          `Verificar veracidade da referência: "${v.reference}"`,
        );
      }
    });

    // PageIndex recommendations
    if (pageIndexResults.length > 0 && pageIndexScore < 80) {
      recommendations.push(
        `PageIndex verificou ${pageIndexVerified}/${pageIndexResults.length} referências. Considere revisar as não verificadas.`,
      );
    }
    pageIndexResults
      .filter((pi) => !pi.verified)
      .forEach((pi) => {
        recommendations.push(
          `Referência "${pi.reference}" não encontrada via ${pi.source === 'jurisprudencia' ? 'jurisprudência TCE-SP/TCU' : 'PageIndex'}`,
        );
      });

    // Factual claims recommendations
    if (factualWarnings.length > 0) {
      recommendations.push(
        'Adicione fontes para dados numéricos específicos mencionados',
      );
    }

    // Prohibited phrases recommendations
    if (prohibitedFound.length > 0) {
      recommendations.push(
        `Remova ou substitua frases categóricas: ${prohibitedFound.slice(0, 3).join(', ')}${prohibitedFound.length > 3 ? '...' : ''}`,
      );
    }

    // General recommendation if score is low
    if (overallScore < threshold) {
      recommendations.push(
        `Score geral (${overallScore.toFixed(1)}%) está abaixo do threshold (${threshold}%). Revise o conteúdo antes de usar.`,
      );
    }

    this.logger.log(
      `Enhanced check completed. Overall: ${overallScore.toFixed(1)}%, Legal: ${legalReferencesScore.toFixed(1)}%, PageIndex: ${pageIndexScore.toFixed(1)}%, Factual: ${factualClaimsScore}%, Prohibited: ${prohibitedPhrasesScore}%, Verified: ${overallVerified}`,
    );

    const result: EnhancedHallucinationCheckResult = {
      overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
      overallVerified,
      categories: {
        legalReferences: {
          score: Math.round(legalReferencesScore * 10) / 10,
          total: legalReferences.length,
          verified: verifiedCount,
          details: referenceDetails,
        },
        factualClaims: {
          score: factualClaimsScore,
          warnings: factualWarnings,
        },
        prohibitedPhrases: {
          score: prohibitedPhrasesScore,
          found: prohibitedFound,
        },
      },
      recommendations: [...new Set(recommendations)], // Remove duplicates
    };

    // Add PageIndex verification category if results exist
    if (pageIndexResults.length > 0) {
      result.categories.pageIndexVerification = {
        score: Math.round(pageIndexScore * 10) / 10,
        verified: pageIndexVerified,
        total: pageIndexResults.length,
        details: pageIndexResults,
      };
    }

    return result;
  }

  async generateSafetyPrompt(): Promise<string> {
    return `IMPORTANTE - DIRETRIZES DE SEGURANÇA:

1. NÃO invente números de leis, decretos ou normas
2. NÃO cite artigos específicos sem ter certeza absoluta
3. NÃO mencione valores monetários específicos sem base
4. NÃO crie números de processos ou documentos
5. NÃO cite jurisprudência específica (TCU, TCE-SP) sem verificação

SEMPRE:
- Use linguagem que indique estimativa quando apropriado
- Prefira "geralmente" a "sempre"
- Use "pode" ao invés de "deve" quando não tiver certeza
- Indique quando algo precisa ser verificado
- Seja conservador em afirmações categóricas

Quando mencionar legislação, use termos gerais:
✅ "conforme a Lei de Licitações"
❌ "conforme o Art. 23, §2º, inciso III da Lei..."

Quando mencionar jurisprudência:
✅ "conforme entendimento do TCU"
❌ "conforme Súmula 247 do TCU" (a menos que verificado)

Adicione este aviso ao final:
"⚠ Informações específicas (números de normas, valores, datas) devem ser verificadas antes do uso oficial."`;
  }

  getSystemPrompt(): string {
    return `Você é um agente de verificação de segurança para conteúdo gerado por IA.

Sua missão é PREVENIR ALUCINAÇÕES - invenção de fatos, leis, números ou informações.

REGRAS CRÍTICAS:

1. NUNCA invente:
 - Números de leis ou normas
 - Artigos ou incisos específicos
 - Valores monetários sem fonte
 - Datas ou prazos específicos
 - Números de processo
 - Nomes de pessoas ou órgãos
 - Súmulas ou acórdãos do TCU/TCE-SP

2. SEMPRE indique incerteza quando apropriado:
 - "aproximadamente" para valores estimados
 - "geralmente" para comportamentos típicos
 - "pode" ao invés de "deve" quando não há certeza
 - "estima-se" para projeções

3. SINALIZE necessidade de verificação:
 - Quando mencionar legislação específica
 - Quando citar dados numéricos
 - Quando fazer afirmações categóricas
 - Quando mencionar jurisprudência TCU/TCE-SP

4. SEJA CONSERVADOR:
 - É melhor ser vago e correto que específico e errado
 - É melhor indicar necessidade de verificação que inventar

Lembre-se: Uma informação incorreta em um documento oficial pode ter consequências legais graves.`;
  }
}
