import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { RAGController } from './rag.controller';
import { Legislation } from '../../entities/legislation.entity';
import { QueryComplexityClassifierService } from './services/query-complexity-classifier.service';

/**
 * RAG (Retrieval-Augmented Generation) Module.
 * Provides legislation indexing and semantic search capabilities.
 *
 * Services:
 * - RAGService: Embeddings-based semantic search
 * - QueryComplexityClassifierService: Query complexity classification for hybrid routing
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 * @see Issue #1592 - Query complexity classifier for Hybrid RAG
 */
@Module({
  imports: [TypeOrmModule.forFeature([Legislation]), ConfigModule],
  providers: [RAGService, QueryComplexityClassifierService],
  controllers: [RAGController],
  exports: [RAGService, QueryComplexityClassifierService],
})
export class RAGModule {}
