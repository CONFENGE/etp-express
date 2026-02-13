import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: TD-010.3 - DB-S04: CNPJ CHECK constraint
 *
 * Technical Debt: DB-S04 (P4 Infrastructure)
 * Story: TD-010.3 (Database Convention Fixes)
 *
 * Changes:
 * 1. Add CHECK constraint for CNPJ format on contratos.contratadoCnpj
 *    Valid formats:
 *    - 14 digits: 12345678901234
 *    - Formatted: 12.345.678/9012-34
 *
 * Rollback: Drops the CHECK constraint
 */
export class TD0103CnpjCheckConstraint1771100000000 implements MigrationInterface {
  name = 'TD0103CnpjCheckConstraint1771100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. Add CHECK constraint for CNPJ format
    // ==================================================

    // CNPJ validation regex:
    // - Must be exactly 14 digits (no formatting), OR
    // - Must be formatted as XX.XXX.XXX/XXXX-XX
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD CONSTRAINT "CHK_contratos_cnpj_format"
      CHECK (
        "contratadoCnpj" ~ '^[0-9]{14}$' OR
        "contratadoCnpj" ~ '^[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}/[0-9]{4}-[0-9]{2}$'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // Rollback: Drop CHECK constraint
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP CONSTRAINT IF EXISTS "CHK_contratos_cnpj_format"
    `);
  }
}
