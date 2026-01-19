import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create normalized_contract_items table for normalization pipeline.
 *
 * This table stores normalized contract items after processing by the
 * NormalizationPipelineService. It links original ContractPrice records
 * to their normalized versions with category assignments.
 *
 * Enables Market Intelligence features (M13):
 * - Item normalization and categorization (#1270)
 * - Regional price benchmarks (#1271)
 * - Overprice detection (#1272)
 *
 * Changes:
 * 1. Create classification_method_enum type
 * 2. Create normalized_contract_items table
 * 3. Create indexes for common query patterns
 * 4. Create foreign keys to contract_prices and item_categories
 *
 * Related Issues:
 * - #1605: NormalizationPipeline batch processing
 * - #1270: Price normalization and categorization (parent)
 * - #1602: ItemCategory entity
 * - #1603: ItemNormalizationService
 */
export class CreateNormalizedContractItemsTable1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotency)
    const tableExists = await queryRunner.hasTable('normalized_contract_items');

    if (!tableExists) {
      // Step 1: Create enum
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "classification_method_enum" AS ENUM (
            'source',
            'llm',
            'similarity',
            'manual'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Step 2: Create normalized_contract_items table
      await queryRunner.query(`
        CREATE TABLE "normalized_contract_items" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "originalItemId" UUID NOT NULL,
          "categoryId" UUID NULL,
          "normalizedDescription" TEXT NOT NULL,
          "normalizedUnit" VARCHAR(20) NOT NULL,
          "normalizedPrice" DECIMAL(15, 4) NOT NULL,
          "confidence" DECIMAL(3, 2) NOT NULL,
          "classificationMethod" "classification_method_enum" NOT NULL DEFAULT 'llm',
          "requiresReview" BOOLEAN NOT NULL DEFAULT false,
          "manuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
          "reviewedBy" UUID NULL,
          "reviewedAt" TIMESTAMP NULL,
          "reviewNotes" TEXT NULL,
          "keywords" TEXT NULL,
          "estimatedType" VARCHAR(20) NULL,
          "processingTimeMs" INTEGER NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }

    // Step 3: Create indexes (idempotent)
    const indexes = [
      {
        name: 'IDX_normalized_contract_items_originalItemId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_originalItemId" ON "normalized_contract_items" ("originalItemId")',
      },
      {
        name: 'IDX_normalized_contract_items_category',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_category" ON "normalized_contract_items" ("categoryId")',
      },
      {
        name: 'IDX_normalized_contract_items_confidence',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_confidence" ON "normalized_contract_items" ("confidence")',
      },
      {
        name: 'IDX_normalized_contract_items_requiresReview',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_requiresReview" ON "normalized_contract_items" ("requiresReview")',
      },
      {
        name: 'IDX_normalized_contract_items_createdAt',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_createdAt" ON "normalized_contract_items" ("createdAt")',
      },
      {
        name: 'IDX_normalized_contract_items_manuallyReviewed',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_manuallyReviewed" ON "normalized_contract_items" ("manuallyReviewed")',
      },
    ];

    for (const index of indexes) {
      await queryRunner.query(index.sql);
    }

    // Step 4: Create foreign key to contract_prices
    const table = await queryRunner.getTable('normalized_contract_items');
    const hasOriginalItemFk = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_normalized_contract_items_originalItem',
    );

    if (!hasOriginalItemFk) {
      await queryRunner.query(`
        ALTER TABLE "normalized_contract_items"
        ADD CONSTRAINT "FK_normalized_contract_items_originalItem"
        FOREIGN KEY ("originalItemId")
        REFERENCES "contract_prices"("id")
        ON DELETE CASCADE
      `);
    }

    // Step 5: Create foreign key to item_categories
    const hasCategoryFk = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_normalized_contract_items_category',
    );

    if (!hasCategoryFk) {
      await queryRunner.query(`
        ALTER TABLE "normalized_contract_items"
        ADD CONSTRAINT "FK_normalized_contract_items_category"
        FOREIGN KEY ("categoryId")
        REFERENCES "item_categories"("id")
        ON DELETE SET NULL
      `);
    }

    // Step 6: Create compound index for review queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_review_status"
      ON "normalized_contract_items" ("requiresReview", "manuallyReviewed")
    `);

    // Step 7: Create compound index for category + confidence analytics
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_normalized_contract_items_category_confidence"
      ON "normalized_contract_items" ("categoryId", "confidence")
    `);

    // Step 8: Create unique constraint to prevent duplicate processing
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_normalized_contract_items_unique_original"
      ON "normalized_contract_items" ("originalItemId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 8: Drop unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_normalized_contract_items_unique_original"
    `);

    // Rollback Step 7: Drop category + confidence index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_normalized_contract_items_category_confidence"
    `);

    // Rollback Step 6: Drop review status index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_normalized_contract_items_review_status"
    `);

    // Rollback Step 5: Drop category foreign key
    await queryRunner.query(`
      ALTER TABLE "normalized_contract_items"
      DROP CONSTRAINT IF EXISTS "FK_normalized_contract_items_category"
    `);

    // Rollback Step 4: Drop originalItem foreign key
    await queryRunner.query(`
      ALTER TABLE "normalized_contract_items"
      DROP CONSTRAINT IF EXISTS "FK_normalized_contract_items_originalItem"
    `);

    // Rollback Step 3: Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_manuallyReviewed"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_requiresReview"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_confidence"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_contract_items_originalItemId"`,
    );

    // Rollback Step 2: Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "normalized_contract_items"`);

    // Rollback Step 1: Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "classification_method_enum"`);
  }
}
