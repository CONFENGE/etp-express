import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: TD-009.1 - Database Schema Cleanup
 *
 * Technical Debt: DB-05, DB-06, DB-07
 * Story: TD-009.1 (P3 Code Quality)
 *
 * Changes:
 * 1. DB-05: Remove duplicate `versao` column from termos_referencia
 *    (data preserved via copy to `current_version`)
 * 2. DB-06: Ensure etps.created_by is explicitly typed as UUID
 *    (TypeORM decorator change - column type may already be correct in DB)
 * 3. DB-07: ContratoSyncLog - TypeScript-only change, no schema modification needed
 *
 * Rollback: Safe - restores versao column with data from current_version
 */
export class TD00911SchemaCleanup1770900000000 implements MigrationInterface {
  name = 'TD00911SchemaCleanup1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. DB-05: Remove duplicate versao column
    // ==================================================

    // First, ensure current_version has all data from versao
    await queryRunner.query(`
      UPDATE "termos_referencia"
      SET "currentVersion" = "versao"
      WHERE "versao" IS NOT NULL
        AND ("currentVersion" IS NULL OR "currentVersion" = 0)
    `);

    // Drop the duplicate column
    await queryRunner.query(`
      ALTER TABLE "termos_referencia"
      DROP COLUMN IF EXISTS "versao"
    `);

    // ==================================================
    // 2. DB-06: Ensure etps.created_by is UUID type
    // ==================================================

    // Check if column exists and alter type if needed
    // Using a safe cast - if column is already uuid, this is a no-op
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'etps'
            AND column_name = 'created_by'
            AND data_type != 'uuid'
        ) THEN
          ALTER TABLE "etps"
          ALTER COLUMN "created_by" TYPE uuid USING "created_by"::uuid;
        END IF;
      END $$
    `);

    // ==================================================
    // 3. DB-07: ContratoSyncLog - No schema changes needed
    //    (TypeScript interface changes only)
    // ==================================================
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. DB-05: Restore versao column
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "termos_referencia"
      ADD COLUMN "versao" integer DEFAULT 1
    `);

    // Copy data back
    await queryRunner.query(`
      UPDATE "termos_referencia"
      SET "versao" = "currentVersion"
      WHERE "currentVersion" IS NOT NULL
    `);

    // ==================================================
    // 2. DB-06: No revert needed - UUID type is correct
    // ==================================================

    // ==================================================
    // 3. DB-07: No schema changes to revert
    // ==================================================
  }
}
