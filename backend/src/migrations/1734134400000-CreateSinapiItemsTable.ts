import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create sinapi_items table for SINAPI price reference data.
 *
 * SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil)
 * is the Brazilian national reference system for construction costs.
 *
 * Changes:
 * 1. Create sinapi_items table with all columns
 * 2. Create indexes for common query patterns:
 * - organizationId (multi-tenancy isolation)
 * - codigo (item code lookup)
 * - tipo (INSUMO/COMPOSICAO filter)
 * - uf (state filter)
 * - anoReferencia, mesReferencia (temporal queries)
 * - Full-text search on descricao (Portuguese)
 * 3. Create compound indexes for optimization
 * 4. Create foreign key to organizations table
 *
 * Related Issues:
 * - #693: SINAPI data ingestion service
 * - #697: Gov-data migrations (this)
 */
export class CreateSinapiItemsTable1734134400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotency)
    const tableExists = await queryRunner.hasTable('sinapi_items');

    if (!tableExists) {
      // Step 1: Create sinapi_items table
      await queryRunner.query(`
 CREATE TABLE "sinapi_items" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 "organizationId" UUID NULL,
 "codigo" VARCHAR(50) NOT NULL,
 "descricao" TEXT NOT NULL,
 "unidade" VARCHAR(20) NOT NULL,
 "precoOnerado" DECIMAL(15,2) DEFAULT 0 NOT NULL,
 "precoDesonerado" DECIMAL(15,2) DEFAULT 0 NOT NULL,
 "tipo" VARCHAR(20) NOT NULL CHECK ("tipo" IN ('INSUMO', 'COMPOSICAO')),
 "uf" CHAR(2) NOT NULL,
 "mesReferencia" INTEGER NOT NULL,
 "anoReferencia" INTEGER NOT NULL,
 "classeId" VARCHAR(50) NULL,
 "classeDescricao" VARCHAR(255) NULL,
 "metadata" JSONB NULL,
 "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
 )
 `);
    }

    // Step 2: Create foreign key to organizations table (idempotent)
    const table = await queryRunner.getTable('sinapi_items');
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_sinapi_items_organization',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
 ALTER TABLE "sinapi_items"
 ADD CONSTRAINT "FK_sinapi_items_organization"
 FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id")
 ON DELETE SET NULL
 `);
    }

    // Step 3: Create simple indexes (idempotent)
    const indexes = [
      {
        name: 'IDX_sinapi_items_organizationId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_organizationId" ON "sinapi_items" ("organizationId")',
      },
      {
        name: 'IDX_sinapi_items_codigo',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_codigo" ON "sinapi_items" ("codigo")',
      },
      {
        name: 'IDX_sinapi_items_tipo',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_tipo" ON "sinapi_items" ("tipo")',
      },
      {
        name: 'IDX_sinapi_items_uf',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_uf" ON "sinapi_items" ("uf")',
      },
    ];

    for (const index of indexes) {
      await queryRunner.query(index.sql);
    }

    // Step 4: Create compound indexes (idempotent)
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_organization_createdAt"
 ON "sinapi_items" ("organizationId", "createdAt")
 `);

    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_ano_mes"
 ON "sinapi_items" ("anoReferencia", "mesReferencia")
 `);

    // Step 5: Create full-text search index (Portuguese) on descricao
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sinapi_items_descricao_gin"
 ON "sinapi_items"
 USING GIN(to_tsvector('portuguese', "descricao"))
 `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 5: Drop full-text search index
    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_descricao_gin"
 `);

    // Rollback Step 4: Drop compound indexes
    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_ano_mes"
 `);

    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_organization_createdAt"
 `);

    // Rollback Step 3: Drop simple indexes
    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_uf"
 `);

    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_tipo"
 `);

    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_codigo"
 `);

    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sinapi_items_organizationId"
 `);

    // Rollback Step 2: Drop foreign key constraint
    await queryRunner.query(`
 ALTER TABLE "sinapi_items"
 DROP CONSTRAINT IF EXISTS "FK_sinapi_items_organization"
 `);

    // Rollback Step 1: Drop table
    await queryRunner.query(`
 DROP TABLE IF EXISTS "sinapi_items"
 `);
  }
}
