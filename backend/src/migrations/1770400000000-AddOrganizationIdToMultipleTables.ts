import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organizationId to multi-tenancy entities
 *
 * Security Issue: TD-002 - Multi-tenancy isolation gaps
 * GitHub Issue: #1716
 *
 * Changes:
 * 1. Add organizationId to ExportMetadata (backfill from etp.organizationId)
 * 2. Add organizationId + updatedAt to Ateste (backfill from medicao->contrato.organizationId)
 * 3. Add organizationId to ContratoSyncLog (backfill from contrato.organizationId)
 * 4. Add organizationId to DocumentoFiscalizacao (backfill via polymorphic relation)
 * 5. Make ContractPrice.organizationId NOT NULL (already has nullable column)
 *
 * Rollback: Safe - all backfills infer from parent entities
 */
export class AddOrganizationIdToMultipleTables1770400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. ExportMetadata: Add organizationId
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      ADD COLUMN "organizationId" UUID;
    `);

    // Backfill from ETP
    await queryRunner.query(`
      UPDATE "export_metadata" em
      SET "organizationId" = etp."organizationId"
      FROM "etps" etp
      WHERE em."etpId" = etp.id;
    `);

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      ALTER COLUMN "organizationId" SET NOT NULL;
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      ADD CONSTRAINT "FK_export_metadata_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX "IDX_export_metadata_organizationId"
      ON "export_metadata"("organizationId");
    `);

    // ==================================================
    // 2. Ateste: Add organizationId + updatedAt
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "atestes"
      ADD COLUMN "organizationId" UUID,
      ADD COLUMN "updatedAt" TIMESTAMP DEFAULT now() NOT NULL;
    `);

    // Backfill from Medicao -> Contrato
    await queryRunner.query(`
      UPDATE "atestes" a
      SET "organizationId" = c."organizationId"
      FROM "medicoes" m
      JOIN "contratos" c ON m."contratoId" = c.id
      WHERE a."medicaoId" = m.id;
    `);

    // Make organizationId NOT NULL
    await queryRunner.query(`
      ALTER TABLE "atestes"
      ALTER COLUMN "organizationId" SET NOT NULL;
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "atestes"
      ADD CONSTRAINT "FK_ateste_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX "IDX_ateste_organizationId"
      ON "atestes"("organizationId");
    `);

    // ==================================================
    // 3. ContratoSyncLog: Add organizationId
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      ADD COLUMN "organizationId" UUID;
    `);

    // Backfill from Contrato
    await queryRunner.query(`
      UPDATE "contrato_sync_logs" csl
      SET "organizationId" = c."organizationId"
      FROM "contratos" c
      WHERE csl."contratoId" = c.id;
    `);

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      ALTER COLUMN "organizationId" SET NOT NULL;
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      ADD CONSTRAINT "FK_contrato_sync_log_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX "IDX_contrato_sync_log_organizationId"
      ON "contrato_sync_logs"("organizationId");
    `);

    // ==================================================
    // 4. DocumentoFiscalizacao: Add organizationId
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      ADD COLUMN "organizationId" UUID;
    `);

    // Backfill from Medicao (tipoEntidade = 'medicao')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao" df
      SET "organizationId" = c."organizationId"
      FROM "medicoes" m
      JOIN "contratos" c ON m."contratoId" = c.id
      WHERE df."tipoEntidade" = 'medicao' AND df."entidadeId" = m.id;
    `);

    // Backfill from Ocorrencia (tipoEntidade = 'ocorrencia')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao" df
      SET "organizationId" = c."organizationId"
      FROM "ocorrencias" o
      JOIN "contratos" c ON o."contratoId" = c.id
      WHERE df."tipoEntidade" = 'ocorrencia' AND df."entidadeId" = o.id;
    `);

    // Backfill from Ateste (tipoEntidade = 'ateste')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao" df
      SET "organizationId" = a."organizationId"
      FROM "atestes" a
      WHERE df."tipoEntidade" = 'ateste' AND df."entidadeId" = a.id;
    `);

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      ALTER COLUMN "organizationId" SET NOT NULL;
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      ADD CONSTRAINT "FK_documento_fiscalizacao_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX "IDX_documento_fiscalizacao_organizationId"
      ON "documentos_fiscalizacao"("organizationId");
    `);

    // ==================================================
    // 5. ContractPrice: Make organizationId NOT NULL
    // ==================================================
    // Note: Column already exists as nullable from previous migration
    // We just need to make it NOT NULL

    // Check for any NULL values first (should not exist in production)
    const nullCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM "contract_prices" WHERE "organizationId" IS NULL;
    `);

    if (parseInt(nullCount[0].count) > 0) {
      throw new Error(
        `Cannot make ContractPrice.organizationId NOT NULL: ${nullCount[0].count} records have NULL values. Manual intervention required.`,
      );
    }

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "contract_prices"
      ALTER COLUMN "organizationId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // Rollback in reverse order
    // ==================================================

    // 5. ContractPrice: Make organizationId nullable again
    await queryRunner.query(`
      ALTER TABLE "contract_prices"
      ALTER COLUMN "organizationId" DROP NOT NULL;
    `);

    // 4. DocumentoFiscalizacao: Remove organizationId
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_documento_fiscalizacao_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      DROP CONSTRAINT IF EXISTS "FK_documento_fiscalizacao_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      DROP COLUMN "organizationId";
    `);

    // 3. ContratoSyncLog: Remove organizationId
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contrato_sync_log_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      DROP CONSTRAINT IF EXISTS "FK_contrato_sync_log_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "contrato_sync_logs"
      DROP COLUMN "organizationId";
    `);

    // 2. Ateste: Remove organizationId + updatedAt
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ateste_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "atestes"
      DROP CONSTRAINT IF EXISTS "FK_ateste_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "atestes"
      DROP COLUMN "organizationId",
      DROP COLUMN "updatedAt";
    `);

    // 1. ExportMetadata: Remove organizationId
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_export_metadata_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      DROP CONSTRAINT IF EXISTS "FK_export_metadata_organizationId";
    `);
    await queryRunner.query(`
      ALTER TABLE "export_metadata"
      DROP COLUMN "organizationId";
    `);
  }
}
