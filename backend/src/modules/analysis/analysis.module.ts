import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ETPAnalysisService } from './analysis.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';

/**
 * Module for ETP document analysis and conversion.
 *
 * @remarks
 * This module provides the ETPAnalysisService which coordinates:
 *
 * 1. **Document Analysis** - Quality assessment using multiple agents:
 *    - LegalAgent - Legal compliance validation
 *    - ClarezaAgent - Clarity and readability analysis
 *    - FundamentacaoAgent - Argumentation quality assessment
 *
 * 2. **Document Conversion** - Convert imported documents to ETP entities:
 *    - Creates ETP in DRAFT status
 *    - Maps extracted sections to SectionTypes
 *    - Preserves original content with metadata
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
 * // Analyzing a document
 * const result = await analysisService.analyzeDocument(doc);
 *
 * // Converting to ETP
 * const converted = await analysisService.convertToEtp(doc, userId, orgId);
 * ```
 */
@Module({
  imports: [TypeOrmModule.forFeature([Etp, EtpSection]), OrchestratorModule],
  providers: [ETPAnalysisService],
  exports: [ETPAnalysisService],
})
export class AnalysisModule {}
