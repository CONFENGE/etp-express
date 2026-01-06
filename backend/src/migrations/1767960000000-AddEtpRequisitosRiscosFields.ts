import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Requisitos e Riscos fields to etps table (Issue #1225).
 *
 * Part of Epic #1158 - Expand ETP form to 20-30 fields.
 *
 * New columns:
 * - requisitosTecnicos: Technical requirements (TEXT, max 5000)
 * - requisitosQualificacao: Supplier qualification requirements (TEXT, max 3000)
 * - criteriosSustentabilidade: Sustainability criteria (TEXT, max 2000)
 * - garantiaExigida: Required warranty (VARCHAR 500)
 * - prazoExecucao: Execution deadline in days (INTEGER, min 1)
 * - nivelRisco: Risk level ENUM (BAIXO, MEDIO, ALTO)
 * - descricaoRiscos: Risk description (TEXT, max 3000)
 *
 * All fields are nullable to maintain backward compatibility.
 */
export class AddEtpRequisitosRiscosFields1767960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist (idempotency)
    const table = await queryRunner.getTable('etps');
    const existingColumns = table?.columns.map((col) => col.name) || [];

    // Create ENUM type for nivelRisco if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "nivel_risco_enum" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add requisitosTecnicos column (TEXT)
    if (!existingColumns.includes('requisitosTecnicos')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "requisitosTecnicos" TEXT
      `);
    }

    // Add requisitosQualificacao column (TEXT)
    if (!existingColumns.includes('requisitosQualificacao')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "requisitosQualificacao" TEXT
      `);
    }

    // Add criteriosSustentabilidade column (TEXT)
    if (!existingColumns.includes('criteriosSustentabilidade')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "criteriosSustentabilidade" TEXT
      `);
    }

    // Add garantiaExigida column (VARCHAR 500)
    if (!existingColumns.includes('garantiaExigida')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "garantiaExigida" VARCHAR(500)
      `);
    }

    // Add prazoExecucao column (INTEGER)
    if (!existingColumns.includes('prazoExecucao')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "prazoExecucao" INTEGER
      `);
    }

    // Add nivelRisco column (ENUM)
    if (!existingColumns.includes('nivelRisco')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "nivelRisco" "nivel_risco_enum"
      `);
    }

    // Add descricaoRiscos column (TEXT)
    if (!existingColumns.includes('descricaoRiscos')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "descricaoRiscos" TEXT
      `);
    }

    // Add check constraint for prazoExecucao (must be >= 1 if set)
    const hasPrazoConstraint = table?.checks?.some(
      (check) => check.name === 'CHK_etps_prazo_execucao_min',
    );

    if (!hasPrazoConstraint) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD CONSTRAINT "CHK_etps_prazo_execucao_min"
        CHECK ("prazoExecucao" IS NULL OR "prazoExecucao" >= 1)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP CONSTRAINT IF EXISTS "CHK_etps_prazo_execucao_min"
    `);

    // Drop columns in reverse order
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "descricaoRiscos"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "nivelRisco"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "prazoExecucao"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "garantiaExigida"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "criteriosSustentabilidade"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "requisitosQualificacao"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "requisitosTecnicos"
    `);

    // Note: We don't drop the ENUM type as it might be used by other columns
    // and dropping it would cause issues if migration is run again
  }
}
