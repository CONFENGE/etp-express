import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecretAccessLogs1763400000000 implements MigrationInterface {
  name = 'CreateSecretAccessLogs1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ IDEMPOTENT: Check if enum exists before creating
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type
      WHERE typname = 'secret_access_logs_status_enum'
    `);

    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."secret_access_logs_status_enum" AS ENUM('success', 'failed', 'unauthorized')
      `);
    }

    // ✅ IDEMPOTENT: Check if table exists before creating
    const tableExists = await queryRunner.hasTable('secret_access_logs');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "secret_access_logs" (
          "id" SERIAL NOT NULL,
          "secretName" character varying NOT NULL,
          "accessedBy" character varying NOT NULL,
          "ipAddress" character varying,
          "accessedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "status" "public"."secret_access_logs_status_enum" NOT NULL DEFAULT 'success',
          "errorMessage" character varying,
          CONSTRAINT "PK_secret_access_logs" PRIMARY KEY ("id")
        )
      `);
    }

    // ✅ IDEMPOTENT: Check if index exists before creating
    const index1Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_name_accessed'
    `);

    if (index1Exists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "idx_secret_access_logs_name_accessed" ON "secret_access_logs" ("secretName", "accessedAt")
      `);
    }

    // ✅ IDEMPOTENT: Check if index exists before creating
    const index2Exists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'secret_access_logs'
      AND indexname = 'idx_secret_access_logs_status'
    `);

    if (index2Exists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "idx_secret_access_logs_status" ON "secret_access_logs" ("status")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ✅ IDEMPOTENT: Check before dropping indexes
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

    // ✅ IDEMPOTENT: Check before dropping table
    const tableExists = await queryRunner.hasTable('secret_access_logs');

    if (tableExists) {
      await queryRunner.query(`DROP TABLE "secret_access_logs"`);
    }

    // ✅ IDEMPOTENT: Check before dropping enum
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type
      WHERE typname = 'secret_access_logs_status_enum'
    `);

    if (enumExists.length > 0) {
      await queryRunner.query(
        `DROP TYPE "public"."secret_access_logs_status_enum"`,
      );
    }
  }
}
