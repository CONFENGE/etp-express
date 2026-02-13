import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: TD-010.3 - DB-08: Add updatedAt to 6 entities
 *
 * Technical Debt: DB-08 (P4 Infrastructure)
 * Story: TD-010.3 (Database Convention Fixes)
 *
 * Changes:
 * 1. Add updatedAt column to etp_versions
 * 2. Add updatedAt column to atestes
 * 3. Add updatedAt column to documentos_fiscalizacao
 * 4. Add updatedAt column to contrato_sync_logs
 * 5. Add updatedAt column to export_metadata
 * 6. Add updatedAt column to api_usage
 *
 * All columns use TypeORM's @UpdateDateColumn() which auto-updates on entity modification.
 *
 * Rollback: Drops updatedAt columns from all 6 tables
 */
export class TD0103AddUpdatedAt1771050000000 implements MigrationInterface {
  name = 'TD0103AddUpdatedAt1771050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. Add updatedAt to etp_versions
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "etp_versions"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // ==================================================
    // 2. Add updatedAt to atestes
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "atestes"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // ==================================================
    // 3. Add updatedAt to documentos_fiscalizacao
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // ==================================================
    // 4. Add updatedAt to contrato_sync_logs
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // ==================================================
    // 5. Add updatedAt to export_metadata
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // ==================================================
    // 6. Add updatedAt to api_usage
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "api_usage"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // Rollback: Drop updatedAt columns
    // ==================================================

    await queryRunner.query(`
      ALTER TABLE "api_usage"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "atestes"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "etp_versions"
      DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
