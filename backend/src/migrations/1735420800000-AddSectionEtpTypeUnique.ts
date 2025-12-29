import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Unique Constraint for ETP Section Type (#1058)
 *
 * Prevents duplicate sections of the same type within an ETP.
 * This migration adds a unique constraint on (etp_id, type) to enforce
 * at the database level that only one section of each type can exist per ETP.
 *
 * Race condition handling:
 * - Before this constraint, concurrent requests could create duplicate sections
 * - The service layer now catches PostgreSQL error 23505 (unique_violation)
 *   and returns the existing section instead of failing
 *
 * Index benefits:
 * - Faster lookups when checking for existing sections
 * - Enforced data integrity at database level
 *
 * @see sections.service.ts - Handles unique violation gracefully
 */
export class AddSectionEtpTypeUnique1735420800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if there are any duplicate sections and remove them
    // Keep only the first created one for each (etp_id, type) pair
    await queryRunner.query(`
      DELETE FROM etp_sections
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY etp_id, type
            ORDER BY "createdAt" ASC
          ) as row_num
          FROM etp_sections
        ) duplicates
        WHERE row_num > 1
      )
    `);

    // Add unique constraint
    await queryRunner.query(`
      ALTER TABLE etp_sections
      ADD CONSTRAINT "UQ_section_etp_type" UNIQUE ("etp_id", "type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint
    await queryRunner.query(`
      ALTER TABLE etp_sections
      DROP CONSTRAINT IF EXISTS "UQ_section_etp_type"
    `);
  }
}
