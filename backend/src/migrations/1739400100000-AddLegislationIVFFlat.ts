import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TD-010.4 - Vector Search Optimization
 *
 * Adds IVFFlat index on legislation.embedding for faster vector similarity search.
 *
 * IVFFlat (Inverted File with Flat compression) is optimal for:
 * - Medium datasets (10K-1M vectors)
 * - Fast approximate nearest neighbor search
 * - RAG (Retrieval-Augmented Generation) use cases
 *
 * Performance gains expected:
 * - Vector similarity search: ~500ms → ~10ms (for 100K legislation articles)
 *
 * Index parameters:
 * - lists = 100: Number of inverted lists (sqrt(rows) is a good heuristic)
 * - vector_cosine_ops: Optimized for cosine similarity (OpenAI embeddings)
 *
 * Note: CREATE INDEX CONCURRENTLY requires running outside transactions
 * for zero-downtime in production.
 *
 * @see https://github.com/pgvector/pgvector#ivfflat
 */
export class AddLegislationIVFFlat1739400100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // DROP TRANSACTION for CONCURRENTLY support (zero downtime)
    await queryRunner.commitTransaction();

    try {
      // Create IVFFlat index for vector similarity search
      // lists = 100 is optimal for ~10K-100K vectors
      // Adjust to sqrt(row_count) for larger datasets
      await queryRunner.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_legislation_embedding_ivfflat"
        ON "legislation" USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
    } finally {
      // RESTART TRANSACTION to maintain TypeORM consistency
      await queryRunner.startTransaction();
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Remove IVFFlat index

    await queryRunner.commitTransaction();

    try {
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "idx_legislation_embedding_ivfflat"`,
      );
    } finally {
      await queryRunner.startTransaction();
    }
  }
}
