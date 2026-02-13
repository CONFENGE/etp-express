import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: TD-010.3 - DB-03: Convert ApiUsage PK to UUID
 *
 * Technical Debt: DB-03 (P4 Infrastructure)
 * Story: TD-010.3 (Database Convention Fixes)
 *
 * Changes:
 * 1. Convert api_usage.id from SERIAL (integer) to UUID
 * 2. Update all data to use UUIDs
 *
 * Rollback: Restores integer PK (with data loss - UUIDs cannot be converted back to sequential integers)
 */
export class TD0103ApiUsageUuidPK1771000000000 implements MigrationInterface {
  name = 'TD0103ApiUsageUuidPK1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. Convert api_usage.id to UUID type
    // ==================================================

    // Step 1: Add temporary UUID column
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ADD COLUMN "id_uuid" uuid DEFAULT gen_random_uuid()
    `);

    // Step 2: Populate UUID values for existing rows
    await queryRunner.query(`
      UPDATE "api_usage"
      SET "id_uuid" = gen_random_uuid()
    `);

    // Step 3: Drop old id column
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      DROP COLUMN "id"
    `);

    // Step 4: Rename id_uuid to id
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      RENAME COLUMN "id_uuid" TO "id"
    `);

    // Step 5: Set id as NOT NULL and PRIMARY KEY
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ALTER COLUMN "id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ADD CONSTRAINT "PK_api_usage_id" PRIMARY KEY ("id")
    `);

    // Step 6: Set default to gen_random_uuid() for new inserts
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ALTER COLUMN "id" SET DEFAULT gen_random_uuid()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // Rollback: Convert back to SERIAL (with data loss)
    // ==================================================

    // WARNING: This rollback will lose UUID values and create new sequential IDs

    // Step 1: Drop PK constraint
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      DROP CONSTRAINT "PK_api_usage_id"
    `);

    // Step 2: Add temporary serial column
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ADD COLUMN "id_serial" SERIAL
    `);

    // Step 3: Drop UUID column
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      DROP COLUMN "id"
    `);

    // Step 4: Rename id_serial to id
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      RENAME COLUMN "id_serial" TO "id"
    `);

    // Step 5: Set as PRIMARY KEY
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ADD CONSTRAINT "PK_api_usage_id" PRIMARY KEY ("id")
    `);
  }
}
