import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecretAccessLogs1763400000000 implements MigrationInterface {
  name = 'CreateSecretAccessLogs1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for status
    await queryRunner.query(`
      CREATE TYPE "public"."secret_access_logs_status_enum" AS ENUM('success', 'failed', 'unauthorized')
    `);

    // Create the table
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

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "idx_secret_access_logs_name_accessed" ON "secret_access_logs" ("secretName", "accessedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_secret_access_logs_status" ON "secret_access_logs" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."idx_secret_access_logs_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_secret_access_logs_name_accessed"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "secret_access_logs"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "public"."secret_access_logs_status_enum"`);
  }
}
