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
    // Check if 'type' column exists - it may not exist if schema was created
    // before the entity was updated to use 'type' instead of 'sectionName'
    const typeColumnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'etp_sections' AND column_name = 'type'
      ) as exists
    `);

    if (!typeColumnExists[0]?.exists) {
      // Create enum type if it doesn't exist
      // TypeORM uses naming convention: {table_name}_{column_name}_enum
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE etp_sections_type_enum AS ENUM (
            'introducao', 'justificativa', 'descricao_solucao', 'requisitos',
            'estimativa_valor', 'analise_riscos', 'criterios_selecao',
            'criterios_medicao', 'adequacao_orcamentaria', 'declaracao_viabilidade', 'custom'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `);

      // Add the 'type' column
      await queryRunner.query(`
        ALTER TABLE etp_sections
        ADD COLUMN IF NOT EXISTS "type" etp_sections_type_enum
      `);

      // Migrate data from sectionName to type if sectionName exists
      const sectionNameExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'etp_sections' AND column_name = 'sectionName'
        ) as exists
      `);

      if (sectionNameExists[0]?.exists) {
        // Map sectionName values to type enum values
        await queryRunner.query(`
          UPDATE etp_sections SET type =
            CASE
              WHEN LOWER("sectionName") LIKE '%introduc%' THEN 'introducao'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%justificativ%' THEN 'justificativa'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%descri%' OR LOWER("sectionName") LIKE '%soluc%' THEN 'descricao_solucao'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%requisit%' THEN 'requisitos'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%estima%' OR LOWER("sectionName") LIKE '%valor%' THEN 'estimativa_valor'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%risco%' THEN 'analise_riscos'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%selec%' THEN 'criterios_selecao'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%medic%' THEN 'criterios_medicao'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%orcament%' THEN 'adequacao_orcamentaria'::etp_sections_type_enum
              WHEN LOWER("sectionName") LIKE '%viabil%' OR LOWER("sectionName") LIKE '%declarac%' THEN 'declaracao_viabilidade'::etp_sections_type_enum
              ELSE 'custom'::etp_sections_type_enum
            END
          WHERE type IS NULL
        `);
      }

      // Set default for any remaining nulls
      await queryRunner.query(`
        UPDATE etp_sections SET type = 'custom'::etp_sections_type_enum WHERE type IS NULL
      `);

      // Make the column NOT NULL now that all rows have values
      await queryRunner.query(`
        ALTER TABLE etp_sections ALTER COLUMN "type" SET NOT NULL
      `);
    }

    // Check if constraint already exists
    const constraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'UQ_section_etp_type'
      ) as exists
    `);

    if (!constraintExists[0]?.exists) {
      // Remove duplicate sections - keep only the first created one for each (etp_id, type) pair
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint
    await queryRunner.query(`
      ALTER TABLE etp_sections
      DROP CONSTRAINT IF EXISTS "UQ_section_etp_type"
    `);
  }
}
