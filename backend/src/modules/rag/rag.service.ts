import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  Legislation,
  LegislationType,
} from '../../entities/legislation.entity';

export interface VerificationResult {
  reference: string;
  exists: boolean;
  confidence: number;
  legislation?: Legislation;
  suggestion?: string;
}

export interface SimilarLegislation {
  legislation: Legislation;
  similarity: number; // 0-1 (cosine similarity)
}

/**
 * RAG (Retrieval-Augmented Generation) Service.
 * Provides legislation indexing, semantic search, and fact verification.
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */
@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private readonly openai: OpenAI;
  private readonly embeddingModel = 'text-embedding-3-small';
  private readonly embeddingDimensions = 1536;

  constructor(
    @InjectRepository(Legislation)
    private legislationRepository: Repository<Legislation>,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Generate embedding vector for text using OpenAI.
   * Uses text-embedding-3-small (1536 dimensions) for cost/performance balance.
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        dimensions: this.embeddingDimensions,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error('Failed to create embedding', {
        error: error.message,
        text: text.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Index legislation with embedding vector.
   * Generates embedding from: "type number/year: title"
   */
  async indexLegislation(legislation: Legislation): Promise<Legislation> {
    const text = `${legislation.type} ${legislation.number}/${legislation.year}: ${legislation.title}`;

    this.logger.log('Indexing legislation', {
      reference: legislation.getFormattedReference(),
    });

    const embedding = await this.createEmbedding(text);

    // Convert embedding array to pgvector format: "[1,2,3,...]"
    legislation.embedding = `[${embedding.join(',')}]`;

    return this.legislationRepository.save(legislation);
  }

  /**
   * Find similar legislation using vector similarity search.
   * Uses cosine distance for semantic similarity.
   *
   * @param query - Search query text
   * @param limit - Maximum number of results (default: 5)
   * @param threshold - Minimum similarity score 0-1 (default: 0.7)
   */
  async findSimilar(
    query: string,
    limit = 5,
    threshold = 0.7,
  ): Promise<SimilarLegislation[]> {
    const queryEmbedding = await this.createEmbedding(query);
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    // Use cosine similarity (<=>)
    // Lower distance = higher similarity (0 = identical, 2 = opposite)
    const results = await this.legislationRepository
      .createQueryBuilder('leg')
      .select(['leg.*', '1 - (leg.embedding <=> :embedding) AS similarity'])
      .where('leg.embedding IS NOT NULL')
      .andWhere('leg.isActive = :isActive', { isActive: true })
      .setParameter('embedding', embeddingVector)
      .having('1 - (leg.embedding <=> :embedding) >= :threshold', {
        threshold,
      })
      .orderBy('leg.embedding <=> :embedding', 'ASC')
      .limit(limit)
      .getRawMany();

    this.logger.debug('Similarity search results', {
      query: query.substring(0, 50),
      count: results.length,
    });

    return results.map((row) => {
      const { similarity, ...legislationData } = row;
      const legislation = { ...legislationData } as Legislation;
      return {
        legislation,
        similarity: parseFloat(similarity),
      };
    });
  }

  /**
   * Verify if a specific legal reference exists in the database.
   * Exact match by type, number, and year.
   *
   * @returns VerificationResult with existence flag and legislation if found
   */
  async verifyReference(
    type: LegislationType,
    number: string,
    year: number,
  ): Promise<VerificationResult> {
    const reference = `${type} ${number}/${year}`;

    this.logger.debug('Verifying legal reference', { reference });

    const legislation = await this.legislationRepository.findOne({
      where: {
        type,
        number,
        year,
        isActive: true,
      },
    });

    if (legislation) {
      return {
        reference,
        exists: true,
        confidence: 1.0,
        legislation,
      };
    }

    // If not found, try to find similar legislation
    const similarResults = await this.findSimilar(reference, 1, 0.8);

    if (similarResults.length > 0) {
      const similar = similarResults[0];
      return {
        reference,
        exists: false,
        confidence: 0.0,
        suggestion: `Você quis dizer ${similar.legislation.getFormattedReference()}? (${(similar.similarity * 100).toFixed(0)}% similar)`,
      };
    }

    return {
      reference,
      exists: false,
      confidence: 0.0,
    };
  }

  /**
   * Get all indexed legislation.
   * Useful for admin endpoints or debugging.
   */
  async getAllLegislation(): Promise<Legislation[]> {
    return this.legislationRepository.find({
      where: { isActive: true },
      order: { year: 'DESC', number: 'ASC' },
    });
  }

  /**
   * Get legislation by ID.
   */
  async getLegislationById(id: string): Promise<Legislation | null> {
    return this.legislationRepository.findOne({
      where: { id, isActive: true },
    });
  }

  /**
   * Delete legislation (soft delete by setting isActive = false).
   */
  async deleteLegislation(id: string): Promise<void> {
    await this.legislationRepository.update(id, { isActive: false });
    this.logger.log('Legislation soft deleted', { id });
  }

  /**
   * Get statistics about indexed legislation.
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    withEmbeddings: number;
  }> {
    const total = await this.legislationRepository.count({
      where: { isActive: true },
    });

    const withEmbeddings = await this.legislationRepository.count({
      where: { isActive: true },
    });

    const byTypeRaw = await this.legislationRepository
      .createQueryBuilder('leg')
      .select('leg.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('leg.isActive = :isActive', { isActive: true })
      .groupBy('leg.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeRaw.forEach((row) => {
      byType[row.type] = parseInt(row.count, 10);
    });

    return {
      total,
      byType,
      withEmbeddings,
    };
  }
}
