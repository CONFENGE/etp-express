import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create gov_contracts table for caching government contract data.
 *
 * This table caches search results from government APIs:
 * - Compras.gov.br (SIASG) - Federal procurement system
 * - PNCP (Portal Nacional de Contratações Públicas) - Lei 14.133/2021
 *
 * Cache duration: 30 days (configurable)
 * Purpose: Reduce API calls and improve response time
 *
 * Changes:
 * 1. Create gov_contracts table with all columns
 * 2. Create indexes for common query patterns:
 *    - organizationId (multi-tenancy isolation)
 *    - searchQuery (cache key lookup)
 *    - source (filter by data source)
 *    - externalId (lookup by source system ID)
 *    - cnpj (agency lookup)
 *    - numeroProcesso (process number lookup)
 * 3. Create compound indexes for optimization
 * 4. Create foreign key to organizations table
 *
 * Related Issues:
 * - #691: Compras.gov.br integration
 * - #692: PNCP integration
 * - #697: Gov-data migrations (this)
 */
export class CreateGovContractsTable1734134600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotency)
    const tableExists = await queryRunner.hasTable('gov_contracts');

    if (!tableExists) {
      // Step 1: Create gov_contracts table
      await queryRunner.query(`
        CREATE TABLE "gov_contracts" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "organizationId" UUID NULL,
          "searchQuery" TEXT NOT NULL,
          "source" VARCHAR(50) NOT NULL,
          "externalId" VARCHAR(100) NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NULL,
          "orgao" VARCHAR(500) NULL,
          "cnpj" VARCHAR(18) NULL,
          "valor" DECIMAL(15,2) NULL,
          "dataContratacao" VARCHAR(50) NULL,
          "modalidade" VARCHAR(100) NULL,
          "numeroProcesso" VARCHAR(100) NULL,
          "url" TEXT NULL,
          "relevanceScore" FLOAT DEFAULT 0 NOT NULL,
          "metadata" JSONB NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }

    // Step 2: Create foreign key to organizations table (idempotent)
    const table = await queryRunner.getTable('gov_contracts');
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_gov_contracts_organization',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
        ALTER TABLE "gov_contracts"
        ADD CONSTRAINT "FK_gov_contracts_organization"
        FOREIGN KEY ("organizationId")
        REFERENCES "organizations"("id")
        ON DELETE SET NULL
      `);
    }

    // Step 3: Create simple indexes (idempotent)
    const indexes = [
      {
        name: 'IDX_gov_contracts_organizationId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_organizationId" ON "gov_contracts" ("organizationId")',
      },
      {
        name: 'IDX_gov_contracts_searchQuery',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_searchQuery" ON "gov_contracts" USING HASH ("searchQuery")',
      },
      {
        name: 'IDX_gov_contracts_source',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_source" ON "gov_contracts" ("source")',
      },
      {
        name: 'IDX_gov_contracts_externalId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_externalId" ON "gov_contracts" ("externalId")',
      },
      {
        name: 'IDX_gov_contracts_cnpj',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_cnpj" ON "gov_contracts" ("cnpj")',
      },
      {
        name: 'IDX_gov_contracts_numeroProcesso',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_numeroProcesso" ON "gov_contracts" ("numeroProcesso")',
      },
    ];

    for (const index of indexes) {
      await queryRunner.query(index.sql);
    }

    // Step 4: Create compound indexes (idempotent)
    // Most common query pattern: filter by organization + sort by createdAt
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_organization_createdAt"
      ON "gov_contracts" ("organizationId", "createdAt")
    `);

    // Cache lookup: organization + query + source
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_gov_contracts_cache_lookup"
      ON "gov_contracts" ("organizationId", "source", "searchQuery")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 4: Drop compound indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_cache_lookup"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_organization_createdAt"
    `);

    // Rollback Step 3: Drop simple indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_numeroProcesso"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_cnpj"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_externalId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_source"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_searchQuery"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_gov_contracts_organizationId"
    `);

    // Rollback Step 2: Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "gov_contracts"
      DROP CONSTRAINT IF EXISTS "FK_gov_contracts_organization"
    `);

    // Rollback Step 1: Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "gov_contracts"
    `);
  }
}
