import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageIndexService } from './pageindex.service';
import { PageIndexController } from './pageindex.controller';
import { TreeBuilderService } from './services/tree-builder.service';
import { TreeSearchService } from './services/tree-search.service';
import { Lei14133Seeder } from './seeders/lei-14133.seeder';
import { JurisprudenciaSeeder } from './seeders/jurisprudencia.seeder';
import { TceSPSeeder } from './seeders/tcesp.seeder';
import { TcuSeeder } from './seeders/tcu.seeder';
import { DocumentTree } from '../../entities/document-tree.entity';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

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
 * - #1553: TreeSearchService with LLM reasoning ✅
 * - #1554: PoC with Lei 14.133/2021 ✅
 *
 * Seeders available:
 * - Lei14133Seeder: Seeds Lei 14.133/2021 (Nova Lei de Licitacoes)
 * - JurisprudenciaSeeder: Seeds TCE-SP and TCU jurisprudence
 * - TceSPSeeder: Seeds 52 TCE-SP sumulas with automatic initialization
 * - TcuSeeder: Seeds 55 TCU acordaos/sumulas with automatic initialization
 *
 * @see Issue #1551 - [PI-1538b] Criar DocumentTree entity e migrations
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 * @see https://github.com/VectifyAI/PageIndex
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DocumentTree]),
    forwardRef(() => OrchestratorModule),
  ],
  controllers: [PageIndexController],
  providers: [
    PageIndexService,
    TreeBuilderService,
    TreeSearchService,
    Lei14133Seeder,
    JurisprudenciaSeeder,
    TceSPSeeder,
    TcuSeeder,
  ],
  exports: [
    PageIndexService,
    TreeBuilderService,
    TreeSearchService,
    Lei14133Seeder,
    JurisprudenciaSeeder,
    TceSPSeeder,
    TcuSeeder,
  ],
})
export class PageIndexModule {}
