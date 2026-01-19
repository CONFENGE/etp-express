import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ItemCategory } from '../../entities/item-category.entity';
import { NormalizedContractItem } from '../../entities/normalized-contract-item.entity';
import { ContractPrice } from '../../entities/contract-price.entity';
import { ItemCategorySeeder } from './seeders/item-category.seeder';
import { ItemNormalizationService } from './services/item-normalization.service';
import { TextSimilarityService } from './services/text-similarity.service';
import { NormalizationPipelineService } from './services/normalization-pipeline.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

/**
 * MarketIntelligenceModule - Module for market intelligence and price analytics.
 *
 * This module provides:
 * - Item categorization based on CATMAT/CATSER taxonomy (#1602)
 * - Item normalization with AI classification (#1603)
 * - Text similarity algorithms (#1604)
 * - Price normalization pipeline (#1605)
 * - Manual review API (#1606)
 * - Benchmark and accuracy validation (#1607)
 *
 * Parent Epic: #1270 - Price normalization and categorization
 * Milestone: M13 - Market Intelligence
 *
 * @see ItemCategory entity for taxonomy storage
 * @see ItemCategorySeeder for initial CATMAT/CATSER data
 * @see ItemNormalizationService for LLM-based item classification
 * @see NormalizationPipelineService for batch processing (#1605)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemCategory,
      NormalizedContractItem,
      ContractPrice,
    ]),
    ConfigModule, // For TextSimilarityService threshold config (#1604)
    ScheduleModule.forRoot(), // For CRON job (#1605)
    OrchestratorModule, // For OpenAIService dependency (#1603)
  ],
  providers: [
    ItemCategorySeeder,
    ItemNormalizationService,
    TextSimilarityService,
    NormalizationPipelineService,
  ],
  exports: [
    TypeOrmModule,
    ItemNormalizationService,
    TextSimilarityService,
    NormalizationPipelineService,
  ],
})
export class MarketIntelligenceModule {}
