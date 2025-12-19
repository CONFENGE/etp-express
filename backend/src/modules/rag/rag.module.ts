import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { RAGController } from './rag.controller';
import { Legislation } from '../../entities/legislation.entity';

/**
 * RAG (Retrieval-Augmented Generation) Module.
 * Provides legislation indexing and semantic search capabilities.
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */
@Module({
 imports: [TypeOrmModule.forFeature([Legislation]), ConfigModule],
 providers: [RAGService],
 controllers: [RAGController],
 exports: [RAGService],
})
export class RAGModule {}
