import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCategory } from '../../entities/item-category.entity';
import { ItemCategorySeeder } from './seeders/item-category.seeder';

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
 */
@Module({
  imports: [TypeOrmModule.forFeature([ItemCategory])],
  providers: [ItemCategorySeeder],
  exports: [TypeOrmModule],
})
export class MarketIntelligenceModule {}
