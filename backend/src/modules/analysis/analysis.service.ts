import { Injectable, Logger } from '@nestjs/common';
import { LegalAgent } from '../orchestrator/agents/legal.agent';
import { ClarezaAgent } from '../orchestrator/agents/clareza.agent';
import { FundamentacaoAgent } from '../orchestrator/agents/fundamentacao.agent';
import { ExtractedDocument } from '../document-extraction/interfaces/extracted-document.interface';
import {
  AnalysisResult,
  AnalysisSummary,
  AnalysisDimensionSummary,
} from './interfaces/analysis-result.interface';

/**
 * Service for analyzing imported ETP documents using multiple quality agents.
 *
 * @remarks
 * This service coordinates the analysis of existing ETP documents by running
 * multiple specialized agents in parallel:
 *
 * 1. **LegalAgent** - Validates legal compliance with Lei 14.133/2021
 * 2. **ClarezaAgent** - Analyzes text clarity and readability
 * 3. **FundamentacaoAgent** - Evaluates argumentation quality
 *
 * The agents are executed in parallel using Promise.all for optimal performance.
 * Results are consolidated into a unified AnalysisResult with:
 * - Overall quality score (weighted average)
 * - Individual dimension scores and issues
 * - Actionable suggestions for improvement
 *
 * Weight distribution:
 * - Legal: 40% (compliance is critical)
 * - Clareza: 30% (readability impacts usability)
 * - Fundamentacao: 30% (argumentation quality)
 *
 * @example
 * ```ts
 * const result = await analysisService.analyzeDocument(extractedDoc);
 * console.log(result.summary.overallScore); // 75
 * console.log(result.summary.meetsMinimumQuality); // true
 * console.log(result.legal.issues); // ['Falta referência à Lei 14.133/2021']
 * ```
 */
@Injectable()
export class ETPAnalysisService {
  private readonly logger = new Logger(ETPAnalysisService.name);

  /**
   * Weight distribution for overall score calculation.
   * Legal compliance is weighted higher due to regulatory importance.
   */
  private readonly WEIGHTS = {
    legal: 0.4,
    clareza: 0.3,
    fundamentacao: 0.3,
  };

  /**
   * Minimum quality threshold for a document to be considered acceptable.
   */
  private readonly MINIMUM_QUALITY_THRESHOLD = 70;

  constructor(
    private readonly legalAgent: LegalAgent,
    private readonly clarezaAgent: ClarezaAgent,
    private readonly fundamentacaoAgent: FundamentacaoAgent,
  ) {}

  /**
   * Analyzes an extracted document using all quality agents in parallel.
   *
   * @remarks
   * Executes LegalAgent, ClarezaAgent, and FundamentacaoAgent concurrently
   * on the document's full text, then consolidates results into a unified
   * AnalysisResult structure.
   *
   * The overall score is calculated as a weighted average:
   * - Legal: 40%
   * - Clareza: 30%
   * - Fundamentacao: 30%
   *
   * A document meets minimum quality if overallScore >= 70.
   *
   * @param document - Extracted document to analyze
   * @returns Consolidated analysis result with scores, issues, and suggestions
   *
   * @example
   * ```ts
   * const doc: ExtractedDocument = {
   *   fullText: 'Este ETP visa a contratação de...',
   *   sections: [...],
   *   metadata: { wordCount: 500, pageCount: 1, sectionCount: 5 }
   * };
   * const result = await service.analyzeDocument(doc);
   * ```
   */
  async analyzeDocument(document: ExtractedDocument): Promise<AnalysisResult> {
    this.logger.log(
      `Starting document analysis (${document.metadata.wordCount} words, ${document.metadata.sectionCount} sections)`,
    );

    const startTime = Date.now();

    // Execute all agents in parallel for optimal performance
    const [legalResult, clarezaResult, fundamentacaoResult] = await Promise.all(
      [
        this.legalAgent.validate(document.fullText),
        this.clarezaAgent.analyze(document.fullText),
        this.fundamentacaoAgent.analyze(document.fullText),
      ],
    );

    const elapsedMs = Date.now() - startTime;
    this.logger.log(`All agents completed in ${elapsedMs}ms`);

    // Build dimension summaries
    const dimensions: AnalysisDimensionSummary[] = [
      {
        dimension: 'legal',
        score: legalResult.score,
        passed: legalResult.isCompliant,
        issueCount: legalResult.issues.length,
        suggestionCount: legalResult.recommendations.length,
      },
      {
        dimension: 'clareza',
        score: clarezaResult.score,
        passed: clarezaResult.score >= this.MINIMUM_QUALITY_THRESHOLD,
        issueCount: clarezaResult.issues.length,
        suggestionCount: clarezaResult.suggestions.length,
      },
      {
        dimension: 'fundamentacao',
        score: fundamentacaoResult.score,
        passed: fundamentacaoResult.score >= this.MINIMUM_QUALITY_THRESHOLD,
        issueCount: this.countFundamentacaoIssues(fundamentacaoResult),
        suggestionCount: fundamentacaoResult.suggestions.length,
      },
    ];

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(
      legalResult.score,
      clarezaResult.score,
      fundamentacaoResult.score,
    );

    // Build summary
    const summary: AnalysisSummary = {
      overallScore,
      meetsMinimumQuality: overallScore >= this.MINIMUM_QUALITY_THRESHOLD,
      dimensions,
      totalIssues: dimensions.reduce((sum, d) => sum + d.issueCount, 0),
      totalSuggestions: dimensions.reduce(
        (sum, d) => sum + d.suggestionCount,
        0,
      ),
    };

    this.logger.log(
      `Analysis complete. Overall score: ${overallScore.toFixed(1)}%, ` +
        `Meets quality: ${summary.meetsMinimumQuality}`,
    );

    return {
      summary,
      legal: legalResult,
      clareza: clarezaResult,
      fundamentacao: fundamentacaoResult,
      analyzedAt: new Date(),
      documentInfo: {
        wordCount: document.metadata.wordCount,
        sectionCount: document.metadata.sectionCount,
      },
    };
  }

  /**
   * Calculates weighted overall score from individual dimension scores.
   *
   * @param legalScore - Legal compliance score (0-100)
   * @param clarezaScore - Clarity score (0-100)
   * @param fundamentacaoScore - Argumentation score (0-100)
   * @returns Weighted average score (0-100)
   */
  private calculateOverallScore(
    legalScore: number,
    clarezaScore: number,
    fundamentacaoScore: number,
  ): number {
    const weighted =
      legalScore * this.WEIGHTS.legal +
      clarezaScore * this.WEIGHTS.clareza +
      fundamentacaoScore * this.WEIGHTS.fundamentacao;

    return Math.round(weighted * 10) / 10;
  }

  /**
   * Counts issues in fundamentacao result based on missing elements.
   *
   * @param result - Fundamentacao analysis result
   * @returns Number of missing critical elements
   */
  private countFundamentacaoIssues(result: {
    hasNecessidade: boolean;
    hasInteressePublico: boolean;
    hasBeneficios: boolean;
    hasRiscos: boolean;
  }): number {
    let count = 0;
    if (!result.hasNecessidade) count++;
    if (!result.hasInteressePublico) count++;
    if (!result.hasBeneficios) count++;
    if (!result.hasRiscos) count++;
    return count;
  }
}
