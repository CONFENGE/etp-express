import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PageIndexService } from './pageindex.service';
import { PageIndexController } from './pageindex.controller';

/**
 * PageIndex Module - Hierarchical document indexing with reasoning-based retrieval.
 *
 * This module provides integration with the PageIndex framework for
 * document indexing and tree-based search. Unlike traditional RAG
 * approaches that rely on vector embeddings and chunking, PageIndex
 * uses hierarchical document structure and LLM reasoning.
 *
 * Key benefits:
 * - 98.7% accuracy (vs ~70-80% for embedding-based RAG)
 * - No vector database required
 * - No chunking - preserves document structure
 * - Human-like document navigation
 * - Auditable retrieval path
 *
 * Current implementation: Module structure with stub services.
 * Full implementation in sub-issues:
 * - #1551: DocumentTree entity and migrations
 * - #1552: TreeBuilderService with Python integration
 * - #1553: TreeSearchService with LLM reasoning
 * - #1554: PoC with Lei 14.133/2021
 *
 * @see Issue #1550 - [PI-1538a] Setup infraestrutura módulo PageIndex
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 * @see https://github.com/VectifyAI/PageIndex
 */
@Module({
  imports: [
    ConfigModule,
    // TODO #1551: TypeOrmModule.forFeature([DocumentTree])
  ],
  controllers: [PageIndexController],
  providers: [
    PageIndexService,
    // TODO #1552: TreeBuilderService
    // TODO #1553: TreeSearchService
  ],
  exports: [PageIndexService],
})
export class PageIndexModule {}
