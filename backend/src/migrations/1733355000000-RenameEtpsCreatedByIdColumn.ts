import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename createdById column to created_by in etps table.
 *
 * This migration fixes a naming inconsistency where the InitialSchema
 * created the column as 'createdById' (camelCase) but the entity and
 * other migrations expect 'created_by' (snake_case).
 *
 * Related Issues: #403 - Fix migrations causing backend crash loops
 *
 * IMPORTANT: This migration must run BEFORE AddPerformanceIndexes1763341020330
 * which creates indexes on the 'created_by' column.
 */
export class RenameEtpsCreatedByIdColumn1733355000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists (idempotency)
    const table = await queryRunner.getTable('etps');
    const hasCreatedById = table?.columns.some(
      (col) => col.name === 'createdById',
    );
    const hasCreatedBy = table?.columns.some(
      (col) => col.name === 'created_by',
    );

    // Only rename if createdById exists and created_by doesn't
    if (hasCreatedById && !hasCreatedBy) {
      // Step 1: Drop foreign key constraint (if exists)
      const hasFkCreatedById = table?.foreignKeys.some(
        (fk) => fk.name === 'FK_etps_createdById',
      );
      if (hasFkCreatedById) {
        await queryRunner.query(`
 ALTER TABLE "etps"
 DROP CONSTRAINT IF EXISTS "FK_etps_createdById"
 `);
      }

      // Step 2: Drop index (if exists)
      const hasIdxCreatedById = table?.indices.some(
        (idx) => idx.name === 'IDX_etps_createdById',
      );
      if (hasIdxCreatedById) {
        await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_etps_createdById"
 `);
      }

      // Step 3: Rename column createdById → created_by
      await queryRunner.query(`
 ALTER TABLE "etps"
 RENAME COLUMN "createdById" TO "created_by"
 `);

      // Step 4: Recreate foreign key constraint with new column name
      await queryRunner.query(`
 ALTER TABLE "etps"
 ADD CONSTRAINT "FK_etps_created_by"
 FOREIGN KEY ("created_by")
 REFERENCES "users"("id")
 ON DELETE NO ACTION
 `);

      // Step 5: Recreate index with new column name
      await queryRunner.query(`
 CREATE INDEX "IDX_etps_created_by"
 ON "etps" ("created_by")
 `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Rename created_by back to createdById
    const table = await queryRunner.getTable('etps');
    const hasCreatedBy = table?.columns.some(
      (col) => col.name === 'created_by',
    );

    if (hasCreatedBy) {
      // Step 1: Drop FK constraint
      await queryRunner.query(`
 ALTER TABLE "etps"
 DROP CONSTRAINT IF EXISTS "FK_etps_created_by"
 `);

      // Step 2: Drop index
      await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_etps_created_by"
 `);

      // Step 3: Rename column back
      await queryRunner.query(`
 ALTER TABLE "etps"
 RENAME COLUMN "created_by" TO "createdById"
 `);

      // Step 4: Recreate FK with old name
      await queryRunner.query(`
 ALTER TABLE "etps"
 ADD CONSTRAINT "FK_etps_createdById"
 FOREIGN KEY ("createdById")
 REFERENCES "users"("id")
 ON DELETE NO ACTION
 `);

      // Step 5: Recreate index with old name
      await queryRunner.query(`
 CREATE INDEX "IDX_etps_createdById"
 ON "etps" ("createdById")
 `);
    }
  }
}
