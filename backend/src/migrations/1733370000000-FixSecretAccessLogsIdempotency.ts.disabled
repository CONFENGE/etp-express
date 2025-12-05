import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix CreateSecretAccessLogs Migration Idempotency
 *
 * Issue: #406
 * Problem: CreateSecretAccessLogs migration crashes when table exists with snake_case columns
 *          but migration expects camelCase, causing "column secretName does not exist" error
 *
 * Solution: Fully idempotent migration that:
 *  1. Fresh deploys: Creates table with snake_case (NestJS convention)
 *  2. Existing deploys: Normalizes naming to snake_case if needed
 *  3. Always ensures indexes exist with correct column names
 *
 * Timestamp: 1733370000000 (BEFORE CreateSecretAccessLogs 1763400000000)
 * This migration runs BEFORE the problematic migration to ensure naming is correct
 */
export class FixSecretAccessLogsIdempotency1733370000000 implements MigrationInterface {
  name = 'FixSecretAccessLogsIdempotency1733370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Ensure enum exists (idempotent)
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type
      WHERE typname = 'secret_access_logs_status_enum'
    `);

    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."secret_access_logs_status_enum" AS ENUM('success', 'failed', 'unauthorized')
      `);
    }

    // Step 2: Check if table exists
    const tableExists = await queryRunner.hasTable('secret_access_logs');

    if (!tableExists) {
      // FRESH DEPLOYMENT: Create table with snake_case (NestJS convention)
      await queryRunner.query(`
        CREATE TABLE "secret_access_logs" (
          "id" SERIAL NOT NULL,
          "secret_name" character varying NOT NULL,
          "accessed_by" character varying NOT NULL,
          "ip_address" character varying,
          "accessed_at" TIMESTAMP NOT NULL DEFAULT now(),
          "status" "public"."secret_access_logs_status_enum" NOT NULL DEFAULT 'success',
          "error_message" character varying,
          CONSTRAINT "PK_secret_access_logs" PRIMARY KEY ("id")
        )
      `);
    } else {
      // EXISTING DEPLOYMENT: Normalize naming to snake_case if needed
      const columns = await queryRunner.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'secret_access_logs'
        AND column_name IN ('secretName', 'secret_name', 'accessedBy', 'accessed_by', 'ipAddress', 'ip_address', 'accessedAt', 'accessed_at', 'errorMessage', 'error_message')
      `);

      const columnNames = columns.map((c: any) => c.column_name);

      // Detect naming convention in use
      const hasCamelCase = columnNames.includes('secretName');
      const hasSnakeCase = columnNames.includes('secret_name');

      if (hasCamelCase && !hasSnakeCase) {
        // Rename camelCase → snake_case (IDEMPOTENT: only if camelCase exists)
        console.log(
          '[Migration] Normalizing secret_access_logs columns to snake_case',
        );

        // Check each column individually before renaming
        if (columnNames.includes('secretName')) {
          await queryRunner.query(
            `ALTER TABLE "secret_access_logs" RENAME COLUMN "secretName" TO "secret_name"`,
          );
        }

        if (columnNames.includes('accessedBy')) {
          await queryRunner.query(
            `ALTER TABLE "secret_access_logs" RENAME COLUMN "accessedBy" TO "accessed_by"`,
          );
        }

        if (columnNames.includes('ipAddress')) {
          await queryRunner.query(
            `ALTER TABLE "secret_access_logs" RENAME COLUMN "ipAddress" TO "ip_address"`,
          );
        }

        if (columnNames.includes('accessedAt')) {
          await queryRunner.query(
            `ALTER TABLE "secret_access_logs" RENAME COLUMN "accessedAt" TO "accessed_at"`,
          );
        }

        if (columnNames.includes('errorMessage')) {
          await queryRunner.query(
            `ALTER TABLE "secret_access_logs" RENAME COLUMN "errorMessage" TO "error_message"`,
          );
        }

        console.log('[Migration] Column normalization completed successfully');
      } else if (hasSnakeCase) {
        console.log(
          '[Migration] Columns already in snake_case, skipping normalization',
        );
      }
    }

    // Step 3: Ensure indexes exist with correct naming (IDEMPOTENT)
    const index1Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_name_accessed'
    `);

    if (index1Exists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "idx_secret_access_logs_name_accessed" ON "secret_access_logs" ("secret_name", "accessed_at")
      `);
      console.log(
        '[Migration] Created index: idx_secret_access_logs_name_accessed',
      );
    }

    const index2Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_status'
    `);

    if (index2Exists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "idx_secret_access_logs_status" ON "secret_access_logs" ("status")
      `);
      console.log('[Migration] Created index: idx_secret_access_logs_status');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (idempotent)
    const index2Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_status'
    `);

    if (index2Exists.length > 0) {
      await queryRunner.query(
        `DROP INDEX "public"."idx_secret_access_logs_status"`,
      );
    }

    const index1Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_name_accessed'
    `);

    if (index1Exists.length > 0) {
      await queryRunner.query(
        `DROP INDEX "public"."idx_secret_access_logs_name_accessed"`,
      );
    }

    // DO NOT drop table (preserve data)
    // DO NOT drop enum (may be used by other tables)

    console.log(
      '[Migration] Rollback completed (indexes dropped, table preserved)',
    );
  }
}
