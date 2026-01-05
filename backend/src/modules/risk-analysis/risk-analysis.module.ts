/**
 * Risk Analysis Module
 *
 * Provides risk analysis functionality for ETP sections.
 *
 * @module modules/risk-analysis
 * @see https://github.com/CONFENGE/etp-express/issues/1160
 */

import { Module } from '@nestjs/common';
import { RiskAnalysisService } from './risk-analysis.service';

@Module({
  providers: [RiskAnalysisService],
  exports: [RiskAnalysisService],
})
export class RiskAnalysisModule {}
