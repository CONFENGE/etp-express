import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TD-010.4 - Full-Text Search Optimization
 *
 * Adds GENERATED tsvector columns and GIN indexes for full-text search
 * on main document tables (ETPs, Termos de Referência, Contratos, Editais).
 *
 * Performance gains expected:
 * - Text search on ETPs: ~2000ms → ~50ms (ILIKE → @@ operator)
 * - Text search on TRs/Editais/Contratos: ~1500ms → ~30ms
 *
 * Uses GENERATED ALWAYS columns to auto-update tsvector on text changes.
 * Uses GIN indexes for fast full-text search with @@ operator.
 *
 * Note: CREATE INDEX CONCURRENTLY requires running outside transactions
 * for zero-downtime in production.
 */
export class AddFullTextSearchIndexes1739400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // DROP TRANSACTION for CONCURRENTLY support (zero downtime)
    await queryRunner.commitTransaction();

    try {
      // 1. Add tsvector columns (GENERATED ALWAYS for auto-update)

      // ETPs - search on objeto + descricao
      await queryRunner.query(`
        ALTER TABLE etps
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('portuguese',
            coalesce(objeto, '') || ' ' ||
            coalesce(description, '')
          )
        ) STORED;
      `);

      // Termos de Referência - search on objeto
      await queryRunner.query(`
        ALTER TABLE termos_referencia
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('portuguese', coalesce(objeto, ''))
        ) STORED;
      `);

      // Contratos - search on objeto
      await queryRunner.query(`
        ALTER TABLE contratos
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('portuguese', coalesce(objeto, ''))
        ) STORED;
      `);

      // Editais - search on objeto
      await queryRunner.query(`
        ALTER TABLE editais
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('portuguese', coalesce(objeto, ''))
        ) STORED;
      `);

      // 2. Create GIN indexes (CONCURRENTLY for zero downtime)

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etps_search_vector"
         ON "etps" USING GIN (search_vector)`,
      );

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_termos_referencia_search_vector"
         ON "termos_referencia" USING GIN (search_vector)`,
      );

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_contratos_search_vector"
         ON "contratos" USING GIN (search_vector)`,
      );

      await queryRunner.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_editais_search_vector"
         ON "editais" USING GIN (search_vector)`,
      );
    } finally {
      // RESTART TRANSACTION to maintain TypeORM consistency
      await queryRunner.startTransaction();
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Remove indexes and columns

    await queryRunner.commitTransaction();

    try {
      // Drop indexes first
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "idx_editais_search_vector"`,
      );
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "idx_contratos_search_vector"`,
      );
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "idx_termos_referencia_search_vector"`,
      );
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS "idx_etps_search_vector"`,
      );

      // Drop columns
      await queryRunner.query(
        `ALTER TABLE editais DROP COLUMN IF EXISTS search_vector`,
      );
      await queryRunner.query(
        `ALTER TABLE contratos DROP COLUMN IF EXISTS search_vector`,
      );
      await queryRunner.query(
        `ALTER TABLE termos_referencia DROP COLUMN IF EXISTS search_vector`,
      );
      await queryRunner.query(
        `ALTER TABLE etps DROP COLUMN IF EXISTS search_vector`,
      );
    } finally {
      await queryRunner.startTransaction();
    }
  }
}
