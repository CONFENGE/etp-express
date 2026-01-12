import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add etpLimitCount column to users table for demo user ETP limits
 *
 * This column tracks the maximum number of ETPs a demo user can create.
 * - Nullable: true (only applies to DEMO users)
 * - Default: 3 (demo users get 3 ETPs)
 *
 * Part of Demo User Management System feature (#1439-#1446).
 *
 * IDEMPOTENT: Uses check-before-create pattern to prevent crash loops on redeploys.
 */
export class AddEtpLimitCountToUsers1768500000000 implements MigrationInterface {
  name = 'AddEtpLimitCountToUsers1768500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if etpLimitCount column already exists
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'etpLimitCount';
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD "etpLimitCount" INTEGER DEFAULT 3;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before dropping (idempotent down)
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'etpLimitCount';
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN "etpLimitCount";
      `);
    }
  }
}
