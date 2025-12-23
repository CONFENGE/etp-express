/**
 * Semantic Cache Module
 *
 * Provides Redis-based caching for LLM responses (OpenAI, Exa)
 * Exported as global module for use across the application
 *
 * @module modules/cache
 * @see Issue #811 - Implementar cache Redis para respostas LLM similares
 */

import { Global, Module } from '@nestjs/common';
import { SemanticCacheService } from './semantic-cache.service';

@Global()
@Module({
  providers: [SemanticCacheService],
  exports: [SemanticCacheService],
})
export class SemanticCacheModule {}
