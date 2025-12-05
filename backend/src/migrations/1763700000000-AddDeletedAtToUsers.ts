import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1763700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if deletedAt column already exists
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'deletedAt';
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "deletedAt" TIMESTAMP NULL;
      `);
    }

    // Check if index already exists before creating
    const indexExists = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexname = 'IDX_users_deletedAt';
    `);

    if (indexExists.length === 0) {
      // Create index for soft deleted users (improves query performance)
      await queryRunner.query(`
        CREATE INDEX "IDX_users_deletedAt"
        ON "users" ("deletedAt")
        WHERE "deletedAt" IS NOT NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if index exists before dropping
    const indexExists = await queryRunner.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexname = 'IDX_users_deletedAt';
    `);

    if (indexExists.length > 0) {
      await queryRunner.query(`
        DROP INDEX "IDX_users_deletedAt";
      `);
    }

    // Check if column exists before dropping
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'deletedAt';
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN "deletedAt";
      `);
    }
  }
}
