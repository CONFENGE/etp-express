import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1763700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to users table for soft delete support
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP NULL
    `);

    // Add index on deletedAt for efficient queries filtering out soft-deleted users
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_deletedAt"
      ON "users" ("deletedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_deletedAt"
    `);

    // Drop deletedAt column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "deletedAt"
    `);
  }
}
