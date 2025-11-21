import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1763700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Create index for soft deleted users (improves query performance)
    await queryRunner.query(`
      CREATE INDEX "IDX_users_deletedAt"
      ON "users" ("deletedAt")
      WHERE "deletedAt" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_deletedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
