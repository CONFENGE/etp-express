import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ETPAnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { DocumentExtractionModule } from '../document-extraction/document-extraction.module';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';

/**
 * Module for ETP document analysis and conversion.
 *
 * @remarks
 * This module provides:
 *
 * 1. **AnalysisController** - REST API endpoints for:
 * - POST /analysis/upload - Upload and analyze documents
 * - GET /analysis/:id/report/pdf - Download analysis report as PDF
 * - POST /analysis/:id/convert - Convert analyzed document to ETP
 * - GET /analysis/:id - Get analysis details (JSON)
 *
 * 2. **ETPAnalysisService** - Quality assessment using multiple agents:
 * - LegalAgent - Legal compliance validation (Lei 14.133/2021)
 * - ClarezaAgent - Clarity and readability analysis
 * - FundamentacaoAgent - Argumentation quality assessment
 *
 * 3. **Document Conversion** - Convert imported documents to ETP entities:
 * - Creates ETP in DRAFT status
 * - Maps extracted sections to SectionTypes
 * - Preserves original content with metadata
 *
 * The agents are imported from OrchestratorModule and executed in parallel
 * for optimal performance.
 *
 * Part of M9: Export DOCX & Import Analysis feature set.
 *
 * @example
 * ```ts
 * // Using the API
 * // 1. Upload and analyze
 * const { analysisId } = await POST('/analysis/upload', file);
 *
 * // 2. Download PDF report
 * const pdf = await GET(`/analysis/${analysisId}/report/pdf`);
 *
 * // 3. Convert to ETP
 * const { etpId } = await POST(`/analysis/${analysisId}/convert`);
 * ```
 */
@Module({
 imports: [
 TypeOrmModule.forFeature([Etp, EtpSection]),
 OrchestratorModule,
 DocumentExtractionModule,
 ],
 controllers: [AnalysisController],
 providers: [ETPAnalysisService],
 exports: [ETPAnalysisService],
})
export class AnalysisModule {}
