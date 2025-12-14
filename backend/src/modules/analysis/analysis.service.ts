import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { LegalAgent } from '../orchestrator/agents/legal.agent';
import { ClarezaAgent } from '../orchestrator/agents/clareza.agent';
import { FundamentacaoAgent } from '../orchestrator/agents/fundamentacao.agent';
import { ExtractedDocument } from '../document-extraction/interfaces/extracted-document.interface';
import {
  AnalysisResult,
  AnalysisSummary,
  AnalysisDimensionSummary,
} from './interfaces/analysis-result.interface';
import {
  ImprovementReport,
  ReportIssue,
  SeverityLevel,
  ExecutiveSummary,
  DimensionSection,
} from './interfaces/improvement-report.interface';

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
  private reportTemplate: HandlebarsTemplateDelegate;

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

  /**
   * Human-readable labels for each analysis dimension.
   */
  private readonly DIMENSION_LABELS = {
    legal: 'Conformidade Legal',
    clareza: 'Clareza e Legibilidade',
    fundamentacao: 'Fundamentação',
  };

  constructor(
    private readonly legalAgent: LegalAgent,
    private readonly clarezaAgent: ClarezaAgent,
    private readonly fundamentacaoAgent: FundamentacaoAgent,
  ) {
    this.loadReportTemplate();
    this.registerHandlebarsHelpers();
  }

  /**
   * Loads the Handlebars template for PDF report generation.
   */
  private loadReportTemplate(): void {
    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        'analysis-report.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.reportTemplate = Handlebars.compile(templateContent);
      this.logger.log('Analysis report template loaded successfully');
    } catch {
      this.logger.warn(
        'Analysis report template not found, using fallback template',
      );
      this.reportTemplate = Handlebars.compile(
        '<html><body><h1>Relatório de Análise ETP</h1><p>Score: {{executiveSummary.overallScore}}%</p></body></html>',
      );
    }
  }

  /**
   * Registers Handlebars helpers for template rendering.
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('pt-BR');
    });

    Handlebars.registerHelper('formatDateTime', (date: Date) => {
      if (!date) return 'N/A';
      return `${new Date(date).toLocaleDateString('pt-BR')} às ${new Date(date).toLocaleTimeString('pt-BR')}`;
    });

    Handlebars.registerHelper('scoreColor', (score: number) => {
      if (score >= 80) return '#22c55e'; // green
      if (score >= 70) return '#eab308'; // yellow
      return '#ef4444'; // red
    });

    Handlebars.registerHelper('severityIcon', (severity: SeverityLevel) => {
      switch (severity) {
        case 'critical':
          return '🚫';
        case 'important':
          return '⚠️';
        case 'suggestion':
          return '💡';
        default:
          return '•';
      }
    });

    Handlebars.registerHelper('severityLabel', (severity: SeverityLevel) => {
      switch (severity) {
        case 'critical':
          return 'Crítico';
        case 'important':
          return 'Importante';
        case 'suggestion':
          return 'Sugestão';
        default:
          return severity;
      }
    });

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

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

  /**
   * Generates a structured improvement report from analysis results.
   *
   * @remarks
   * Transforms raw `AnalysisResult` into an actionable `ImprovementReport` that:
   * - Consolidates issues from all 3 dimensions with severity classification
   * - Prioritizes recommendations (critical > important > suggestion)
   * - Calculates final verdict based on score and critical issues
   *
   * **Severity Classification:**
   * - `critical`: Legal compliance issues (blocks approval)
   * - `important`: Quality issues causing score < 70 in any dimension
   * - `suggestion`: Minor improvements that would enhance quality
   *
   * **Verdict Logic:**
   * - "Aprovado": score >= 80 AND criticalCount === 0
   * - "Aprovado com ressalvas": score >= 70 AND criticalCount === 0
   * - "Reprovado": score < 70 OR criticalCount > 0
   *
   * @param result - Analysis result from `analyzeDocument()`
   * @returns Structured improvement report ready for display or PDF export
   *
   * @example
   * ```ts
   * const result = await analysisService.analyzeDocument(doc);
   * const report = analysisService.generateImprovementReport(result);
   *
   * console.log(report.executiveSummary.verdict); // "Aprovado com ressalvas"
   * console.log(report.prioritizedRecommendations[0]); // Most critical issue
   * ```
   */
  generateImprovementReport(result: AnalysisResult): ImprovementReport {
    this.logger.log('Generating improvement report');

    // Extract all issues from all dimensions with severity classification
    const issues = this.extractAllIssues(result);

    // Sort issues by severity priority
    const sortedIssues = this.sortIssuesBySeverity(issues);

    // Count by severity
    const criticalCount = issues.filter(
      (i) => i.severity === 'critical',
    ).length;
    const importantCount = issues.filter(
      (i) => i.severity === 'important',
    ).length;
    const suggestionCount = issues.filter(
      (i) => i.severity === 'suggestion',
    ).length;

    // Determine final verdict
    const verdict = this.determineVerdict(
      result.summary.overallScore,
      criticalCount,
    );

    // Build executive summary
    const executiveSummary: ExecutiveSummary = {
      overallScore: result.summary.overallScore,
      meetsMinimumQuality: result.summary.meetsMinimumQuality,
      totalIssues: issues.length,
      criticalCount,
      importantCount,
      suggestionCount,
      verdict,
    };

    // Build dimension sections
    const dimensions = this.buildDimensionSections(result, issues);

    const report: ImprovementReport = {
      generatedAt: new Date(),
      documentInfo: result.documentInfo,
      executiveSummary,
      dimensions,
      prioritizedRecommendations: sortedIssues,
    };

    this.logger.log(
      `Report generated. Verdict: ${verdict}, Issues: ${issues.length} (${criticalCount} critical)`,
    );

    return report;
  }

  /**
   * Extracts all issues from analysis result with severity classification.
   *
   * @param result - Analysis result
   * @returns Array of issues with severity
   */
  private extractAllIssues(result: AnalysisResult): ReportIssue[] {
    const issues: ReportIssue[] = [];

    // Extract legal issues (always critical if not compliant)
    result.legal.issues.forEach((issue, index) => {
      const recommendation = result.legal.recommendations[index] || issue;
      issues.push({
        dimension: 'legal',
        severity: result.legal.isCompliant ? 'important' : 'critical',
        title: this.extractIssueTitle(issue),
        description: issue,
        recommendation,
      });
    });

    // Add legal recommendations not linked to issues
    result.legal.recommendations.forEach((rec, index) => {
      if (index >= result.legal.issues.length) {
        issues.push({
          dimension: 'legal',
          severity: 'suggestion',
          title: this.extractIssueTitle(rec),
          description: rec,
          recommendation: rec,
        });
      }
    });

    // Extract clareza issues
    result.clareza.issues.forEach((issue, index) => {
      const suggestion = result.clareza.suggestions[index] || issue;
      const severity: SeverityLevel =
        result.clareza.score < this.MINIMUM_QUALITY_THRESHOLD
          ? 'important'
          : 'suggestion';
      issues.push({
        dimension: 'clareza',
        severity,
        title: this.extractIssueTitle(issue),
        description: issue,
        recommendation: suggestion,
      });
    });

    // Add clareza suggestions not linked to issues
    result.clareza.suggestions.forEach((sug, index) => {
      if (index >= result.clareza.issues.length) {
        issues.push({
          dimension: 'clareza',
          severity: 'suggestion',
          title: this.extractIssueTitle(sug),
          description: sug,
          recommendation: sug,
        });
      }
    });

    // Extract fundamentacao issues from missing elements
    const fundamentacaoIssues = this.extractFundamentacaoIssues(
      result.fundamentacao,
    );
    fundamentacaoIssues.forEach((issue) => {
      const severity: SeverityLevel =
        result.fundamentacao.score < this.MINIMUM_QUALITY_THRESHOLD
          ? 'important'
          : 'suggestion';
      issues.push({
        dimension: 'fundamentacao',
        severity,
        title: issue.title,
        description: issue.description,
        recommendation: issue.recommendation,
      });
    });

    // Add fundamentacao suggestions
    result.fundamentacao.suggestions.forEach((sug) => {
      // Avoid duplicates with extracted issues
      const isDuplicate = fundamentacaoIssues.some(
        (fi) => fi.recommendation === sug,
      );
      if (!isDuplicate) {
        issues.push({
          dimension: 'fundamentacao',
          severity: 'suggestion',
          title: this.extractIssueTitle(sug),
          description: sug,
          recommendation: sug,
        });
      }
    });

    return issues;
  }

  /**
   * Extracts issues from fundamentacao result based on missing elements.
   */
  private extractFundamentacaoIssues(result: {
    hasNecessidade: boolean;
    hasInteressePublico: boolean;
    hasBeneficios: boolean;
    hasRiscos: boolean;
  }): { title: string; description: string; recommendation: string }[] {
    const issues: {
      title: string;
      description: string;
      recommendation: string;
    }[] = [];

    if (!result.hasNecessidade) {
      issues.push({
        title: 'Necessidade não fundamentada',
        description:
          'O documento não apresenta claramente a necessidade que motivou a contratação.',
        recommendation:
          'Detalhe melhor a necessidade que motivou a contratação, explicando o problema a ser resolvido.',
      });
    }

    if (!result.hasInteressePublico) {
      issues.push({
        title: 'Interesse público não demonstrado',
        description:
          'O documento não explicita como a contratação atende ao interesse público.',
        recommendation:
          'Explicite como a contratação atende ao interesse público e quem será beneficiado.',
      });
    }

    if (!result.hasBeneficios) {
      issues.push({
        title: 'Benefícios não listados',
        description:
          'O documento não apresenta os benefícios esperados com a contratação.',
        recommendation:
          'Liste os benefícios esperados: melhorias, economia, eficiência, qualidade.',
      });
    }

    if (!result.hasRiscos) {
      issues.push({
        title: 'Riscos não mencionados',
        description:
          'O documento não menciona os riscos de não realizar a contratação.',
        recommendation:
          'Mencione os riscos de não realizar a contratação: impactos negativos, prejuízos potenciais.',
      });
    }

    return issues;
  }

  /**
   * Extracts a short title from an issue/recommendation string.
   */
  private extractIssueTitle(text: string): string {
    // Get first sentence or first 50 characters
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence.length <= 60) {
      return firstSentence;
    }
    return firstSentence.substring(0, 57) + '...';
  }

  /**
   * Sorts issues by severity: critical > important > suggestion.
   */
  private sortIssuesBySeverity(issues: ReportIssue[]): ReportIssue[] {
    const severityOrder: Record<SeverityLevel, number> = {
      critical: 0,
      important: 1,
      suggestion: 2,
    };

    return [...issues].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );
  }

  /**
   * Determines the final verdict based on score and critical issues.
   *
   * @param score - Overall quality score (0-100)
   * @param criticalCount - Number of critical issues
   * @returns Verdict string
   */
  private determineVerdict(
    score: number,
    criticalCount: number,
  ): 'Aprovado' | 'Aprovado com ressalvas' | 'Reprovado' {
    if (criticalCount > 0) {
      return 'Reprovado';
    }

    if (score < this.MINIMUM_QUALITY_THRESHOLD) {
      return 'Reprovado';
    }

    if (score >= 80) {
      return 'Aprovado';
    }

    return 'Aprovado com ressalvas';
  }

  /**
   * Builds dimension sections with issues grouped by dimension.
   */
  private buildDimensionSections(
    result: AnalysisResult,
    issues: ReportIssue[],
  ): DimensionSection[] {
    const dimensions: ('legal' | 'clareza' | 'fundamentacao')[] = [
      'legal',
      'clareza',
      'fundamentacao',
    ];

    return dimensions.map((dimension) => {
      const dimensionIssues = issues.filter((i) => i.dimension === dimension);
      const dimSummary = result.summary.dimensions.find(
        (d) => d.dimension === dimension,
      );

      return {
        dimension,
        label: this.DIMENSION_LABELS[dimension],
        score: dimSummary?.score ?? 0,
        passed: dimSummary?.passed ?? false,
        issues: dimensionIssues,
      };
    });
  }

  /**
   * Exports an improvement report to PDF format.
   *
   * @remarks
   * Uses Puppeteer to render the Handlebars template and generate a PDF.
   * The PDF includes:
   * - Executive summary with score badge
   * - Dimension breakdown with scores
   * - Prioritized recommendations list
   * - Generation timestamp
   *
   * @param report - Improvement report to export
   * @returns PDF buffer
   *
   * @example
   * ```ts
   * const report = analysisService.generateImprovementReport(result);
   * const pdfBuffer = await analysisService.exportReportToPdf(report);
   * fs.writeFileSync('analysis-report.pdf', pdfBuffer);
   * ```
   */
  async exportReportToPdf(report: ImprovementReport): Promise<Buffer> {
    this.logger.log('Exporting analysis report to PDF');

    const html = this.reportTemplate(report);

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
        printBackground: true,
      });

      this.logger.log('Analysis report PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(
            `Failed to close browser after PDF export: ${closeError instanceof Error ? closeError.message : 'Unknown error'}`,
            closeError instanceof Error ? closeError.stack : undefined,
          );
        }
      }
    }
  }
}
