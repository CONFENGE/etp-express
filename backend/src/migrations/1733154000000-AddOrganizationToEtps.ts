import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organizationId column to etps table (Multi-Tenancy B2G - MT-05).
 *
 * Changes:
 * 1. Add organizationId UUID column (NOT NULL) with foreign key to organizations
 * 2. Remove metadata.orgao field (JSONB update)
 * 3. Create compound index (organizationId, createdAt) for performance
 *
 * Column-based isolation: Ensures ETPs are scoped to a single organization.
 *
 * Security: ON DELETE RESTRICT prevents cascade deletion of ETPs when organization is deleted.
 * This is by design to prevent accidental data loss.
 *
 * Related Issues: MT-05 (#358), MT-02 (#355), MT-01 (#354)
 */
export class AddOrganizationToEtps1733154000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column and constraints already exist (idempotency)
    const table = await queryRunner.getTable('etps');
    const hasOrganizationIdColumn = table?.columns.some(
      (col) => col.name === 'organizationId',
    );

    // Step 1: Add organizationId column (UUID, NOT NULL) - only if not exists
    if (!hasOrganizationIdColumn) {
      await queryRunner.query(`
 ALTER TABLE "etps"
 ADD COLUMN "organizationId" UUID NOT NULL
 `);
    }

    // Step 2: Create foreign key to organizations table (ON DELETE RESTRICT) - idempotent
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_etps_organization',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
 ALTER TABLE "etps"
 ADD CONSTRAINT "FK_etps_organization"
 FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id")
 ON DELETE RESTRICT
 `);
    }

    // Step 3: Create compound index (organizationId, createdAt) - idempotent
    // Supports common query patterns:
    // - SELECT * FROM etps WHERE organizationId = ? ORDER BY createdAt DESC
    // - Paginated ETP listing scoped by organization
    const hasIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_etps_organization_createdAt',
    );

    if (!hasIndex) {
      await queryRunner.query(`
 CREATE INDEX "IDX_etps_organization_createdAt"
 ON "etps" ("organizationId", "createdAt")
 `);
    }

    // Step 4: Remove metadata.orgao field using JSONB operations (always safe - idempotent)
    // This is a data transformation - removes 'orgao' key from JSONB metadata column
    await queryRunner.query(`
 UPDATE "etps"
 SET "metadata" = "metadata" - 'orgao'
 WHERE "metadata" IS NOT NULL
 AND "metadata" ? 'orgao'
 `);

    // Note: No data migration needed because:
    // 1. Development environment: Can safely drop existing test data
    // 2. Production: Will require manual data migration script before this migration
    // 3. New ETPs will have organizationId injected automatically by EtpsService
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 3: Drop compound index
    await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_etps_organization_createdAt"
 `);

    // Rollback Step 2: Drop foreign key constraint
    await queryRunner.query(`
 ALTER TABLE "etps"
 DROP CONSTRAINT IF EXISTS "FK_etps_organization"
 `);

    // Rollback Step 1: Drop organizationId column
    await queryRunner.query(`
 ALTER TABLE "etps"
 DROP COLUMN IF EXISTS "organizationId"
 `);

    // Note: Cannot rollback metadata.orgao removal without data backup
    // Rollback is destructive - organizationId data will be lost
  }
}
