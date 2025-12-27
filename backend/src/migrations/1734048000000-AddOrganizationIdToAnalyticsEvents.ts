import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organizationId column to analytics_events table (Security Hardening - #648).
 *
 * Purpose:
 * - Enable multi-tenancy isolation for analytics data
 * - Prevent cross-organization data leakage
 * - Allow filtering analytics by organization
 *
 * Changes:
 * 1. Add organizationId UUID column (nullable for backward compatibility)
 * 2. Add foreign key constraint to organizations table
 * 3. Create index for performance on organizationId queries
 */
export class AddOrganizationIdToAnalyticsEvents1734048000000 implements MigrationInterface {
  name = 'AddOrganizationIdToAnalyticsEvents1734048000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists (idempotent)
    const table = await queryRunner.getTable('analytics_events');
    const hasColumn = table?.columns.some(
      (col) => col.name === 'organizationId',
    );

    if (!hasColumn) {
      // Step 1: Add organizationId column (UUID, nullable for backward compatibility)
      await queryRunner.query(`
 ALTER TABLE "analytics_events"
 ADD COLUMN "organizationId" UUID
 `);

      // Step 2: Add foreign key constraint to organization table
      await queryRunner.query(`
 ALTER TABLE "analytics_events"
 ADD CONSTRAINT "FK_analytics_events_organizationId"
 FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id")
 ON DELETE SET NULL
 `);

      // Step 3: Create index for performance
      await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_analytics_events_organizationId"
 ON "analytics_events" ("organizationId")
 `);

      // Step 4: Create compound index for common query patterns
      // - Events by organization ordered by date
      await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_analytics_events_org_timestamp"
 ON "analytics_events" ("organizationId", "timestamp")
 `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Drop indexes first
    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_analytics_events_org_timestamp"
 `);

    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_analytics_events_organizationId"
 `);

    // Drop foreign key constraint
    await queryRunner.query(`
 ALTER TABLE "analytics_events"
 DROP CONSTRAINT IF EXISTS "FK_analytics_events_organizationId"
 `);

    // Drop column
    await queryRunner.query(`
 ALTER TABLE "analytics_events"
 DROP COLUMN IF EXISTS "organizationId"
 `);
  }
}
