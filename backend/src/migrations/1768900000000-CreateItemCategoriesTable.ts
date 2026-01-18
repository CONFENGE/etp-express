import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create item_categories table for CATMAT/CATSER taxonomy.
 *
 * This table stores the item categorization taxonomy based on Brazilian
 * government catalogs (CATMAT for materials, CATSER for services).
 *
 * Enables Market Intelligence features (M13):
 * - Item normalization and categorization (#1270)
 * - Regional price benchmarks (#1271)
 * - AI-powered item classification (#1603)
 *
 * Changes:
 * 1. Create item_category_type_enum type
 * 2. Create item_categories table with all columns
 * 3. Create indexes for common query patterns
 * 4. Create self-referencing foreign key for hierarchy
 *
 * Related Issues:
 * - #1602: Create ItemCategory entity with CATMAT/CATSER taxonomy
 * - #1270: Price normalization and categorization (parent)
 * - #1269: Contract Price Collector
 */
export class CreateItemCategoriesTable1768900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotency)
    const tableExists = await queryRunner.hasTable('item_categories');

    if (!tableExists) {
      // Step 1: Create enum
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "item_category_type_enum" AS ENUM (
            'CATMAT',
            'CATSER'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Step 2: Create item_categories table
      await queryRunner.query(`
        CREATE TABLE "item_categories" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "code" VARCHAR(50) NOT NULL UNIQUE,
          "name" VARCHAR(255) NOT NULL,
          "type" "item_category_type_enum" NOT NULL,
          "parentCode" VARCHAR(50) NULL,
          "description" TEXT NULL,
          "level" INTEGER NOT NULL DEFAULT 0,
          "keywords" TEXT NULL,
          "commonUnits" TEXT NULL,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "itemCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }

    // Step 3: Create indexes (idempotent)
    const indexes = [
      {
        name: 'IDX_item_categories_code',
        sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_item_categories_code" ON "item_categories" ("code")',
      },
      {
        name: 'IDX_item_categories_type',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_item_categories_type" ON "item_categories" ("type")',
      },
      {
        name: 'IDX_item_categories_parentCode',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_item_categories_parentCode" ON "item_categories" ("parentCode")',
      },
      {
        name: 'IDX_item_categories_active',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_item_categories_active" ON "item_categories" ("active")',
      },
      {
        name: 'IDX_item_categories_level',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_item_categories_level" ON "item_categories" ("level")',
      },
    ];

    for (const index of indexes) {
      await queryRunner.query(index.sql);
    }

    // Step 4: Create self-referencing foreign key for hierarchy
    const table = await queryRunner.getTable('item_categories');
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_item_categories_parent',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
        ALTER TABLE "item_categories"
        ADD CONSTRAINT "FK_item_categories_parent"
        FOREIGN KEY ("parentCode")
        REFERENCES "item_categories"("code")
        ON DELETE SET NULL
      `);
    }

    // Step 5: Create compound index for type + active queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_item_categories_type_active"
      ON "item_categories" ("type", "active")
    `);

    // Step 6: Create full-text search index on name and keywords
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_item_categories_name_gin"
      ON "item_categories" USING GIN (to_tsvector('portuguese', "name"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 6: Drop full-text search index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_item_categories_name_gin"
    `);

    // Rollback Step 5: Drop compound index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_item_categories_type_active"
    `);

    // Rollback Step 4: Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "item_categories"
      DROP CONSTRAINT IF EXISTS "FK_item_categories_parent"
    `);

    // Rollback Step 3: Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_item_categories_level"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_item_categories_active"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_item_categories_parentCode"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_item_categories_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_item_categories_code"`);

    // Rollback Step 2: Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "item_categories"`);

    // Rollback Step 1: Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "item_category_type_enum"`);
  }
}
