import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add template-related fields to ETPs table.
 * Issue #1240 - [TMPL-1161f] Implement dynamic fields based on template selection
 *
 * Adds:
 * - templateId: UUID reference to etp_templates table
 * - templateType: enum for quick filtering (OBRAS, TI, SERVICOS, MATERIAIS)
 * - dynamicFields: JSONB for template-specific fields
 */
export class AddTemplateFieldsToEtp1736280000000 implements MigrationInterface {
  name = 'AddTemplateFieldsToEtp1736280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for templateType if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."etps_templatetype_enum" AS ENUM('OBRAS', 'TI', 'SERVICOS', 'MATERIAIS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add templateId column
    await queryRunner.query(`
      ALTER TABLE "etps"
      ADD COLUMN IF NOT EXISTS "templateId" uuid
    `);

    // Add templateType column
    await queryRunner.query(`
      ALTER TABLE "etps"
      ADD COLUMN IF NOT EXISTS "templateType" "public"."etps_templatetype_enum"
    `);

    // Add dynamicFields column
    await queryRunner.query(`
      ALTER TABLE "etps"
      ADD COLUMN IF NOT EXISTS "dynamicFields" jsonb
    `);

    // Add foreign key constraint for templateId
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "etps"
        ADD CONSTRAINT "FK_etps_templateId"
        FOREIGN KEY ("templateId")
        REFERENCES "etp_templates"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create index on templateType for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_templateType" ON "etps" ("templateType")
    `);

    // Create index on templateId for joins
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_templateId" ON "etps" ("templateId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_etps_templateId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_etps_templateType"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "etps" DROP CONSTRAINT IF EXISTS "FK_etps_templateId"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "etps" DROP COLUMN IF EXISTS "dynamicFields"
    `);
    await queryRunner.query(`
      ALTER TABLE "etps" DROP COLUMN IF EXISTS "templateType"
    `);
    await queryRunner.query(`
      ALTER TABLE "etps" DROP COLUMN IF EXISTS "templateId"
    `);

    // Note: We keep the enum type to avoid issues with other potential uses
  }
}
