import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from '../../entities/user.entity';
import { ItemCategory } from '../../entities/item-category.entity';
import { NormalizedContractItem } from '../../entities/normalized-contract-item.entity';
import { ContractPrice } from '../../entities/contract-price.entity';
import { PriceBenchmark } from '../../entities/price-benchmark.entity';
import { OverpriceAlert } from '../../entities/overprice-alert.entity';
import { ApiUsage } from './entities/api-usage.entity';
import { ItemCategorySeeder } from './seeders/item-category.seeder';
import { ItemNormalizationService } from './services/item-normalization.service';
import { TextSimilarityService } from './services/text-similarity.service';
import { NormalizationPipelineService } from './services/normalization-pipeline.service';
import { NormalizationBenchmarkService } from './services/normalization-benchmark.service';
import { RegionalBenchmarkService } from './services/regional-benchmark.service';
import { OverpriceAlertService } from './services/overprice-alert.service';
import { ApiUsageService } from './services/api-usage.service';
import { ItemNormalizationController } from './controllers/item-normalization.controller';
import { RegionalBenchmarkController } from './controllers/regional-benchmark.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { PublicPricesController } from './controllers/public-prices.controller';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';

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
 * - Regional price benchmarking (#1271)
 * - Overprice alert system (#1272)
 * - API usage tracking and metrics (#1688)
 *
 * @see NormalizationBenchmarkService for accuracy validation (#1607)
 * @see RegionalBenchmarkService for regional price benchmarks (#1271)
 * @see OverpriceAlertService for overprice detection (#1272)
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
      User, // For ApiKeyGuard authentication (#1686)
      ItemCategory,
      NormalizedContractItem,
      ContractPrice,
      PriceBenchmark, // Regional benchmarks (#1271)
      OverpriceAlert, // Overprice alert system (#1272)
      ApiUsage, // API usage tracking (#1688)
    ]),
    ConfigModule, // For TextSimilarityService threshold config (#1604)
    ScheduleModule.forRoot(), // For CRON job (#1605, #1271)
    OrchestratorModule, // For OpenAIService dependency (#1603)
  ],
  controllers: [
    ItemNormalizationController, // Manual review API (#1606)
    RegionalBenchmarkController, // Regional benchmark API (#1271)
    AnalyticsController, // Overprice alert API (#1272)
    PublicPricesController, // Public API for third-party access (#1685)
  ],
  providers: [
    ItemCategorySeeder,
    ItemNormalizationService,
    TextSimilarityService,
    NormalizationPipelineService,
    NormalizationBenchmarkService,
    RegionalBenchmarkService, // Regional benchmarks (#1271)
    OverpriceAlertService, // Overprice alert system (#1272)
    ApiUsageService, // API usage tracking (#1688)
    ApiKeyGuard, // API Key authentication (#1686)
    ApiKeyThrottlerGuard, // API rate limiting (#1686)
  ],
  exports: [
    TypeOrmModule,
    ItemNormalizationService,
    TextSimilarityService,
    NormalizationPipelineService,
    NormalizationBenchmarkService,
    RegionalBenchmarkService, // Regional benchmarks (#1271)
    OverpriceAlertService, // Overprice alert system (#1272)
    ApiUsageService, // API usage tracking (#1688)
  ],
})
export class MarketIntelligenceModule {}
