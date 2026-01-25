import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add apiKey and apiPlan columns to users table for Public API authentication
 *
 * Columns:
 * - apiKey: unique varchar for API authentication (X-API-Key header)
 * - apiPlan: enum ('free', 'pro', 'enterprise') for rate limiting
 *
 * Part of M13: Market Intelligence - Public API for third-party access (#1686).
 *
 * IDEMPOTENT: Uses check-before-create pattern to prevent crash loops on redeploys.
 */
export class AddApiKeyAndApiPlanToUsers1770200000000 implements MigrationInterface {
  name = 'AddApiKeyAndApiPlanToUsers1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if apiKey column already exists
    const apiKeyExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'apiKey';
    `);

    if (apiKeyExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD "apiKey" VARCHAR UNIQUE;
      `);
    }

    // Check if apiPlan column already exists
    const apiPlanExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'apiPlan';
    `);

    if (apiPlanExists.length === 0) {
      // Create enum type if it doesn't exist
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "user_apiplan_enum" AS ENUM ('free', 'pro', 'enterprise');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Add column with default 'free'
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD "apiPlan" "user_apiplan_enum" NOT NULL DEFAULT 'free';
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if apiKey column exists before dropping
    const apiKeyExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'apiKey';
    `);

    if (apiKeyExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN "apiKey";
      `);
    }

    // Check if apiPlan column exists before dropping
    const apiPlanExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name = 'apiPlan';
    `);

    if (apiPlanExists.length > 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN "apiPlan";
      `);

      // Drop enum type (will fail if other columns still use it)
      await queryRunner.query(`
        DROP TYPE IF EXISTS "user_apiplan_enum";
      `);
    }
  }
}
