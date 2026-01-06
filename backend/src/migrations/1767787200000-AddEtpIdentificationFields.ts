import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add identification fields to etps table (Issue #1223).
 *
 * Part of Epic #1158 - Expand ETP form to 20-30 fields.
 *
 * New columns:
 * - orgaoEntidade: Organization/entity name (VARCHAR 200)
 * - uasg: UASG code - 6 digit number (VARCHAR 6)
 * - unidadeDemandante: Demanding unit name (VARCHAR 200)
 * - responsavelTecnico: Technical responsible person (JSONB)
 * - dataElaboracao: ETP creation date (DATE)
 *
 * All fields are nullable to maintain backward compatibility.
 */
export class AddEtpIdentificationFields1767787200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist (idempotency)
    const table = await queryRunner.getTable('etps');
    const existingColumns = table?.columns.map((col) => col.name) || [];

    // Add orgaoEntidade column
    if (!existingColumns.includes('orgaoEntidade')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "orgaoEntidade" VARCHAR(200)
      `);
    }

    // Add uasg column
    if (!existingColumns.includes('uasg')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "uasg" VARCHAR(6)
      `);
    }

    // Add unidadeDemandante column
    if (!existingColumns.includes('unidadeDemandante')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "unidadeDemandante" VARCHAR(200)
      `);
    }

    // Add responsavelTecnico column (JSONB)
    if (!existingColumns.includes('responsavelTecnico')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "responsavelTecnico" JSONB
      `);
    }

    // Add dataElaboracao column
    if (!existingColumns.includes('dataElaboracao')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "dataElaboracao" DATE
      `);
    }

    // Add check constraint for UASG format (6 digits only)
    const hasUasgConstraint = table?.checks?.some(
      (check) => check.name === 'CHK_etps_uasg_format',
    );

    if (!hasUasgConstraint) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD CONSTRAINT "CHK_etps_uasg_format"
        CHECK ("uasg" IS NULL OR "uasg" ~ '^[0-9]{6}$')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP CONSTRAINT IF EXISTS "CHK_etps_uasg_format"
    `);

    // Drop columns in reverse order
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "dataElaboracao"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "responsavelTecnico"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "unidadeDemandante"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "uasg"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "orgaoEntidade"
    `);
  }
}
