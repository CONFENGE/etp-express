import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create sicro_items table for SICRO price reference data.
 *
 * SICRO (Sistema de Custos Referenciais de Obras) is the Brazilian
 * national reference system for transportation infrastructure costs.
 *
 * Changes:
 * 1. Create sicro_items table with all columns
 * 2. Create indexes for common query patterns:
 * - organizationId (multi-tenancy isolation)
 * - codigo (item code lookup)
 * - tipo (INSUMO/COMPOSICAO filter)
 * - uf (state filter)
 * - anoReferencia, mesReferencia (temporal queries)
 * - modoTransporte (RODOVIARIO/AQUAVIARIO/FERROVIARIO filter)
 * - Full-text search on descricao (Portuguese)
 * 3. Create compound indexes for optimization
 * 4. Create foreign key to organizations table
 *
 * Related Issues:
 * - #694: SICRO data ingestion service
 * - #697: Gov-data migrations (this)
 */
export class CreateSicroItemsTable1734134500000 implements MigrationInterface {
 public async up(queryRunner: QueryRunner): Promise<void> {
 // Check if table already exists (idempotency)
 const tableExists = await queryRunner.hasTable('sicro_items');

 if (!tableExists) {
 // Step 1: Create sicro_items table
 await queryRunner.query(`
 CREATE TABLE "sicro_items" (
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
 "categoriaId" VARCHAR(100) NULL,
 "categoriaDescricao" VARCHAR(255) NULL,
 "modoTransporte" VARCHAR(20) NULL CHECK ("modoTransporte" IN ('RODOVIARIO', 'AQUAVIARIO', 'FERROVIARIO') OR "modoTransporte" IS NULL),
 "metadata" JSONB NULL,
 "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
 )
 `);
 }

 // Step 2: Create foreign key to organizations table (idempotent)
 const table = await queryRunner.getTable('sicro_items');
 const hasForeignKey = table?.foreignKeys.some(
 (fk) => fk.name === 'FK_sicro_items_organization',
 );

 if (!hasForeignKey) {
 await queryRunner.query(`
 ALTER TABLE "sicro_items"
 ADD CONSTRAINT "FK_sicro_items_organization"
 FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id")
 ON DELETE SET NULL
 `);
 }

 // Step 3: Create simple indexes (idempotent)
 const indexes = [
 {
 name: 'IDX_sicro_items_organizationId',
 sql: 'CREATE INDEX IF NOT EXISTS "IDX_sicro_items_organizationId" ON "sicro_items" ("organizationId")',
 },
 {
 name: 'IDX_sicro_items_codigo',
 sql: 'CREATE INDEX IF NOT EXISTS "IDX_sicro_items_codigo" ON "sicro_items" ("codigo")',
 },
 {
 name: 'IDX_sicro_items_tipo',
 sql: 'CREATE INDEX IF NOT EXISTS "IDX_sicro_items_tipo" ON "sicro_items" ("tipo")',
 },
 {
 name: 'IDX_sicro_items_uf',
 sql: 'CREATE INDEX IF NOT EXISTS "IDX_sicro_items_uf" ON "sicro_items" ("uf")',
 },
 {
 name: 'IDX_sicro_items_modo_transporte',
 sql: 'CREATE INDEX IF NOT EXISTS "IDX_sicro_items_modo_transporte" ON "sicro_items" ("modoTransporte")',
 },
 ];

 for (const index of indexes) {
 await queryRunner.query(index.sql);
 }

 // Step 4: Create compound indexes (idempotent)
 await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sicro_items_organization_createdAt"
 ON "sicro_items" ("organizationId", "createdAt")
 `);

 await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sicro_items_ano_mes"
 ON "sicro_items" ("anoReferencia", "mesReferencia")
 `);

 // Step 5: Create full-text search index (Portuguese) on descricao
 await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_sicro_items_descricao_gin"
 ON "sicro_items"
 USING GIN(to_tsvector('portuguese', "descricao"))
 `);
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Rollback Step 5: Drop full-text search index
 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_descricao_gin"
 `);

 // Rollback Step 4: Drop compound indexes
 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_ano_mes"
 `);

 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_organization_createdAt"
 `);

 // Rollback Step 3: Drop simple indexes
 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_modo_transporte"
 `);

 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_uf"
 `);

 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_tipo"
 `);

 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_codigo"
 `);

 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_sicro_items_organizationId"
 `);

 // Rollback Step 2: Drop foreign key constraint
 await queryRunner.query(`
 ALTER TABLE "sicro_items"
 DROP CONSTRAINT IF EXISTS "FK_sicro_items_organization"
 `);

 // Rollback Step 1: Drop table
 await queryRunner.query(`
 DROP TABLE IF EXISTS "sicro_items"
 `);
 }
}
