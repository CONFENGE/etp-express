import { Module } from '@nestjs/common';
import { ETPAnalysisService } from './analysis.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

/**
 * Module for ETP document analysis.
 *
 * @remarks
 * This module provides the ETPAnalysisService which coordinates analysis
 * of imported documents using multiple quality agents:
 *
 * - LegalAgent - Legal compliance validation
 * - ClarezaAgent - Clarity and readability analysis
 * - FundamentacaoAgent - Argumentation quality assessment
 *
 * The agents are imported from OrchestratorModule and executed in parallel
 * for optimal performance.
 *
 * Part of M9: Export DOCX & Import Analysis feature set.
 *
 * @example
 * ```ts
 * // In another module
 * @Module({
 *   imports: [AnalysisModule],
 *   // ...
 * })
 * export class SomeModule {}
 *
 * // In a service
 * constructor(private analysisService: ETPAnalysisService) {}
 *
 * async analyzeUploadedDoc(doc: ExtractedDocument) {
 *   return this.analysisService.analyzeDocument(doc);
 * }
 * ```
 */
@Module({
  imports: [OrchestratorModule],
  providers: [ETPAnalysisService],
  exports: [ETPAnalysisService],
})
export class AnalysisModule {}
