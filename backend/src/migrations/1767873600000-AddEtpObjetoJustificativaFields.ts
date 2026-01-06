import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Objeto e Justificativa fields to etps table (Issue #1224).
 *
 * Part of Epic #1158 - Expand ETP form to 20-30 fields.
 *
 * New columns:
 * - descricaoDetalhada: Detailed object description (TEXT, max 5000)
 * - quantidadeEstimada: Estimated quantity (DECIMAL 15,2)
 * - unidadeMedida: Unit of measure (VARCHAR 50)
 * - justificativaContratacao: Contracting justification (TEXT, min 50, max 5000)
 * - necessidadeAtendida: Need to be addressed (TEXT, max 3000)
 * - beneficiosEsperados: Expected benefits (TEXT, max 3000)
 *
 * All fields are nullable to maintain backward compatibility.
 */
export class AddEtpObjetoJustificativaFields1767873600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist (idempotency)
    const table = await queryRunner.getTable('etps');
    const existingColumns = table?.columns.map((col) => col.name) || [];

    // Add descricaoDetalhada column (TEXT)
    if (!existingColumns.includes('descricaoDetalhada')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "descricaoDetalhada" TEXT
      `);
    }

    // Add quantidadeEstimada column (DECIMAL 15,2)
    if (!existingColumns.includes('quantidadeEstimada')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "quantidadeEstimada" DECIMAL(15,2)
      `);
    }

    // Add unidadeMedida column (VARCHAR 50)
    if (!existingColumns.includes('unidadeMedida')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "unidadeMedida" VARCHAR(50)
      `);
    }

    // Add justificativaContratacao column (TEXT)
    if (!existingColumns.includes('justificativaContratacao')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "justificativaContratacao" TEXT
      `);
    }

    // Add necessidadeAtendida column (TEXT)
    if (!existingColumns.includes('necessidadeAtendida')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "necessidadeAtendida" TEXT
      `);
    }

    // Add beneficiosEsperados column (TEXT)
    if (!existingColumns.includes('beneficiosEsperados')) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD COLUMN "beneficiosEsperados" TEXT
      `);
    }

    // Add check constraint for quantidadeEstimada (must be >= 1 if set)
    const hasQtdConstraint = table?.checks?.some(
      (check) => check.name === 'CHK_etps_quantidade_estimada_min',
    );

    if (!hasQtdConstraint) {
      await queryRunner.query(`
        ALTER TABLE "etps"
        ADD CONSTRAINT "CHK_etps_quantidade_estimada_min"
        CHECK ("quantidadeEstimada" IS NULL OR "quantidadeEstimada" >= 1)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP CONSTRAINT IF EXISTS "CHK_etps_quantidade_estimada_min"
    `);

    // Drop columns in reverse order
    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "beneficiosEsperados"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "necessidadeAtendida"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "justificativaContratacao"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "unidadeMedida"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "quantidadeEstimada"
    `);

    await queryRunner.query(`
      ALTER TABLE "etps"
      DROP COLUMN IF EXISTS "descricaoDetalhada"
    `);
  }
}
