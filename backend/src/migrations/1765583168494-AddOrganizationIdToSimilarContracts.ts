import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organizationId column to similar_contracts table (Multi-Tenancy).
 *
 * Changes:
 * 1. Add organizationId UUID column (NULLABLE for backward compatibility)
 * 2. Create foreign key to organizations table (ON DELETE SET NULL)
 * 3. Create index on organizationId for filtered queries
 * 4. Create compound index (organizationId, createdAt) for common query patterns
 *
 * Column-based isolation: Enables filtering search results by organization.
 * This is a prerequisite for implementing tenant isolation in SearchService.
 *
 * Nullable: Existing records without organizationId are preserved.
 * New records created after this migration should always include organizationId.
 *
 * Related Issues: #650 (this), #649 (SearchService isolation)
 */
export class AddOrganizationIdToSimilarContracts1765583168494 implements MigrationInterface {
 public async up(queryRunner: QueryRunner): Promise<void> {
 // Check if column already exists (idempotency)
 const table = await queryRunner.getTable('similar_contracts');
 const hasOrganizationIdColumn = table?.columns.some(
 (col) => col.name === 'organizationId',
 );

 // Step 1: Add organizationId column (UUID, NULLABLE) - only if not exists
 if (!hasOrganizationIdColumn) {
 await queryRunner.query(`
 ALTER TABLE "similar_contracts"
 ADD COLUMN "organizationId" UUID NULL
 `);
 }

 // Step 2: Create foreign key to organizations table (ON DELETE SET NULL) - idempotent
 const hasForeignKey = table?.foreignKeys.some(
 (fk) => fk.name === 'FK_similar_contracts_organization',
 );

 if (!hasForeignKey) {
 await queryRunner.query(`
 ALTER TABLE "similar_contracts"
 ADD CONSTRAINT "FK_similar_contracts_organization"
 FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id")
 ON DELETE SET NULL
 `);
 }

 // Step 3: Create simple index on organizationId - idempotent
 const hasSimpleIndex = table?.indices.some(
 (idx) => idx.name === 'IDX_similar_contracts_organizationId',
 );

 if (!hasSimpleIndex) {
 await queryRunner.query(`
 CREATE INDEX "IDX_similar_contracts_organizationId"
 ON "similar_contracts" ("organizationId")
 `);
 }

 // Step 4: Create compound index (organizationId, createdAt) - idempotent
 // Supports common query patterns:
 // - SELECT * FROM similar_contracts WHERE organizationId = ? ORDER BY createdAt DESC
 // - Paginated contract listing scoped by organization
 const hasCompoundIndex = table?.indices.some(
 (idx) => idx.name === 'IDX_similar_contracts_organization_createdAt',
 );

 if (!hasCompoundIndex) {
 await queryRunner.query(`
 CREATE INDEX "IDX_similar_contracts_organization_createdAt"
 ON "similar_contracts" ("organizationId", "createdAt")
 `);
 }
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Rollback Step 4: Drop compound index
 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_similar_contracts_organization_createdAt"
 `);

 // Rollback Step 3: Drop simple index
 await queryRunner.query(`
 DROP INDEX IF EXISTS "IDX_similar_contracts_organizationId"
 `);

 // Rollback Step 2: Drop foreign key constraint
 await queryRunner.query(`
 ALTER TABLE "similar_contracts"
 DROP CONSTRAINT IF EXISTS "FK_similar_contracts_organization"
 `);

 // Rollback Step 1: Drop organizationId column
 await queryRunner.query(`
 ALTER TABLE "similar_contracts"
 DROP COLUMN IF EXISTS "organizationId"
 `);
 }
}
