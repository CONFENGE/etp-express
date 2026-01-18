import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { RAGController } from './rag.controller';
import { Legislation } from '../../entities/legislation.entity';
import { QueryComplexityClassifierService } from './services/query-complexity-classifier.service';
import { RagRouterService } from './services/rag-router.service';
import { HybridRagService } from './services/hybrid-rag.service';
import { PageIndexModule } from '../pageindex/pageindex.module';
import { RAG_SERVICE } from './interfaces/rag.interface';

/**
 * RAG (Retrieval-Augmented Generation) Module.
 * Provides legislation indexing and semantic search capabilities.
 *
 * Services:
 * - RAGService: Embeddings-based semantic search
 * - QueryComplexityClassifierService: Query complexity classification for hybrid routing
 * - RagRouterService: Intelligent router between embeddings and PageIndex RAG paths
 * - HybridRagService: Unified facade for hybrid RAG (implements IRagService)
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 * @see Issue #1592 - Query complexity classifier for Hybrid RAG
 * @see Issue #1593 - RagRouterService for Hybrid RAG routing
 * @see Issue #1594 - HybridRagService unified facade
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Legislation]),
    ConfigModule,
    forwardRef(() => PageIndexModule),
  ],
  providers: [
    RAGService,
    QueryComplexityClassifierService,
    RagRouterService,
    HybridRagService,
    // Provide HybridRagService as the default IRagService implementation
    {
      provide: RAG_SERVICE,
      useExisting: HybridRagService,
    },
  ],
  controllers: [RAGController],
  exports: [
    RAGService,
    QueryComplexityClassifierService,
    RagRouterService,
    HybridRagService,
    RAG_SERVICE,
  ],
})
export class RAGModule {}
