import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageIndexService } from './pageindex.service';
import { PageIndexController } from './pageindex.controller';
import { TreeBuilderService } from './services/tree-builder.service';
import { DocumentTree } from '../../entities/document-tree.entity';

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
 * Current implementation:
 * - #1550: Module structure with stub services ✅
 * - #1551: DocumentTree entity and migrations ✅
 * - #1552: TreeBuilderService with Python integration ✅
 *
 * Remaining sub-issues:
 * - #1553: TreeSearchService with LLM reasoning
 * - #1554: PoC with Lei 14.133/2021
 *
 * @see Issue #1551 - [PI-1538b] Criar DocumentTree entity e migrations
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 * @see https://github.com/VectifyAI/PageIndex
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([DocumentTree])],
  controllers: [PageIndexController],
  providers: [
    PageIndexService,
    TreeBuilderService,
    // TODO #1553: TreeSearchService
  ],
  exports: [PageIndexService, TreeBuilderService],
})
export class PageIndexModule {}
