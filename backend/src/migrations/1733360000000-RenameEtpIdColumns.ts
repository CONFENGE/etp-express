import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix Column Naming Issue (#404)
 *
 * CRITICAL HOTFIX: Resolves backend crash loop caused by column naming mismatch.
 *
 * Problem:
 * - InitialSchema (1000000000000) created columns in camelCase: "etpId"
 * - AddPerformanceIndexes (1763341020330) expects snake_case: "etp_id"
 * - Entity definitions use snake_case: @JoinColumn({ name: 'etp_id' })
 *
 * Solution:
 * - Rename "etpId" → "etp_id" in etp_sections and etp_versions tables
 * - Preserve FK constraints and data integrity
 * - Execute BEFORE AddPerformanceIndexes (timestamp: 1733360000000 < 1763341020330)
 *
 * Impact:
 * - Zero data loss (RENAME COLUMN preserves data)
 * - FK constraints recreated
 * - Enables AddPerformanceIndexes to execute successfully
 *
 * Tables affected:
 * - etp_sections: etpId → etp_id
 * - etp_versions: etpId → etp_id
 */
export class RenameEtpIdColumns1733360000000 implements MigrationInterface {
 name = 'RenameEtpIdColumns1733360000000';

 public async up(queryRunner: QueryRunner): Promise<void> {
 // === FIX etp_sections TABLE ===

 // Check if column exists in camelCase (for idempotency)
 const sectionsTable = await queryRunner.getTable('etp_sections');
 const hasEtpId = sectionsTable?.columns.some((col) => col.name === 'etpId');

 if (hasEtpId) {
 // Drop existing FK constraint (if exists)
 await queryRunner.query(
 `ALTER TABLE "etp_sections" DROP CONSTRAINT IF EXISTS "FK_etp_sections_etpId"`,
 );

 // Rename column: etpId → etp_id
 await queryRunner.query(
 `ALTER TABLE "etp_sections" RENAME COLUMN "etpId" TO "etp_id"`,
 );

 // Recreate FK constraint with correct column name
 await queryRunner.query(`
 ALTER TABLE "etp_sections"
 ADD CONSTRAINT "FK_etp_sections_etp_id"
 FOREIGN KEY ("etp_id") REFERENCES "etps"("id") ON DELETE CASCADE
 `);
 }

 // === FIX etp_versions TABLE ===

 // Check if column exists in camelCase (for idempotency)
 const versionsTable = await queryRunner.getTable('etp_versions');
 const hasVersionsEtpId = versionsTable?.columns.some(
 (col) => col.name === 'etpId',
 );

 if (hasVersionsEtpId) {
 // Drop existing FK constraint (if exists)
 await queryRunner.query(
 `ALTER TABLE "etp_versions" DROP CONSTRAINT IF EXISTS "FK_etp_versions_etpId"`,
 );

 // Rename column: etpId → etp_id
 await queryRunner.query(
 `ALTER TABLE "etp_versions" RENAME COLUMN "etpId" TO "etp_id"`,
 );

 // Recreate FK constraint with correct column name
 await queryRunner.query(`
 ALTER TABLE "etp_versions"
 ADD CONSTRAINT "FK_etp_versions_etp_id"
 FOREIGN KEY ("etp_id") REFERENCES "etps"("id") ON DELETE CASCADE
 `);
 }
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // === ROLLBACK etp_sections TABLE ===

 // Check if column exists in snake_case
 const sectionsTable = await queryRunner.getTable('etp_sections');
 const hasEtpIdSnake = sectionsTable?.columns.some(
 (col) => col.name === 'etp_id',
 );

 if (hasEtpIdSnake) {
 // Drop FK constraint
 await queryRunner.query(
 `ALTER TABLE "etp_sections" DROP CONSTRAINT IF EXISTS "FK_etp_sections_etp_id"`,
 );

 // Rename column back: etp_id → etpId
 await queryRunner.query(
 `ALTER TABLE "etp_sections" RENAME COLUMN "etp_id" TO "etpId"`,
 );

 // Recreate FK constraint with camelCase column name
 await queryRunner.query(`
 ALTER TABLE "etp_sections"
 ADD CONSTRAINT "FK_etp_sections_etpId"
 FOREIGN KEY ("etpId") REFERENCES "etps"("id") ON DELETE CASCADE
 `);
 }

 // === ROLLBACK etp_versions TABLE ===

 // Check if column exists in snake_case
 const versionsTable = await queryRunner.getTable('etp_versions');
 const hasVersionsEtpIdSnake = versionsTable?.columns.some(
 (col) => col.name === 'etp_id',
 );

 if (hasVersionsEtpIdSnake) {
 // Drop FK constraint
 await queryRunner.query(
 `ALTER TABLE "etp_versions" DROP CONSTRAINT IF EXISTS "FK_etp_versions_etp_id"`,
 );

 // Rename column back: etp_id → etpId
 await queryRunner.query(
 `ALTER TABLE "etp_versions" RENAME COLUMN "etp_id" TO "etpId"`,
 );

 // Recreate FK constraint with camelCase column name
 await queryRunner.query(`
 ALTER TABLE "etp_versions"
 ADD CONSTRAINT "FK_etp_versions_etpId"
 FOREIGN KEY ("etpId") REFERENCES "etps"("id") ON DELETE CASCADE
 `);
 }
 }
}
