import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add 22 Missing Performance Indexes
 *
 * Issue: #1718 - Add missing database indexes for query optimization
 *
 * This migration adds indexes to:
 * 1. Foreign key columns (frequently joined)
 * 2. OrganizationId columns (multi-tenant queries)
 * 3. Status columns (frequently filtered)
 * 4. Composite indexes for common query patterns
 *
 * Impact:
 * - Significant performance improvement for list/filter queries
 * - Reduced query time for JOIN operations
 * - Better performance for multi-tenant isolation queries
 *
 * Rollback: All indexes can be safely dropped
 */
export class AddMissingPerformanceIndexes1738359600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // ETPs Table Indexes
    // ============================================

    // Multi-tenant queries (most critical)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_organizationId"
      ON "etps" ("organizationId");
    `);

    // Template-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_templateId"
      ON "etps" ("templateId");
    `);

    // Creator lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_created_by"
      ON "etps" ("created_by");
    `);

    // Status filtering (common in list views)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_status"
      ON "etps" ("status");
    `);

    // Composite index for filtered tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_etps_org_status"
      ON "etps" ("organizationId", "status");
    `);

    // ============================================
    // Contratos Table Indexes
    // ============================================

    // Edital lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_editalId"
      ON "contratos" ("editalId");
    `);

    // Multi-tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_organizationId"
      ON "contratos" ("organizationId");
    `);

    // Gestor lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_gestorResponsavelId"
      ON "contratos" ("gestorResponsavelId");
    `);

    // Fiscal lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_fiscalResponsavelId"
      ON "contratos" ("fiscalResponsavelId");
    `);

    // Creator lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_createdById"
      ON "contratos" ("createdById");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_status"
      ON "contratos" ("status");
    `);

    // Composite index for filtered tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contratos_org_status"
      ON "contratos" ("organizationId", "status");
    `);

    // ============================================
    // Medicoes Table Indexes
    // ============================================

    // Contract lookups (foreign key)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medicoes_contratoId"
      ON "medicoes" ("contratoId");
    `);

    // Fiscal lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medicoes_fiscalResponsavelId"
      ON "medicoes" ("fiscalResponsavelId");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medicoes_status"
      ON "medicoes" ("status");
    `);

    // Composite index for contract-filtered queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_medicoes_contrato_status"
      ON "medicoes" ("contratoId", "status");
    `);

    // ============================================
    // Termos Referencia Table Indexes
    // ============================================

    // ETP lookups (foreign key)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_termos_referencia_etpId"
      ON "termos_referencia" ("etpId");
    `);

    // Multi-tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_termos_referencia_organizationId"
      ON "termos_referencia" ("organizationId");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_termos_referencia_status"
      ON "termos_referencia" ("status");
    `);

    // ============================================
    // Editais Table Indexes
    // ============================================

    // Termo Referencia lookups (foreign key)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_editais_termoReferenciaId"
      ON "editais" ("termoReferenciaId");
    `);

    // Multi-tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_editais_organizationId"
      ON "editais" ("organizationId");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_editais_status"
      ON "editais" ("status");
    `);

    // ============================================
    // Ocorrencias Table Indexes
    // ============================================

    // Contract lookups (foreign key)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ocorrencias_contratoId"
      ON "ocorrencias" ("contratoId");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ocorrencias_status"
      ON "ocorrencias" ("status");
    `);

    // ============================================
    // Pesquisas Precos Table Indexes
    // ============================================

    // Multi-tenant queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pesquisas_precos_organizationId"
      ON "pesquisas_precos" ("organizationId");
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pesquisas_precos_status"
      ON "pesquisas_precos" ("status");
    `);

    console.log('✅ Added 22 missing performance indexes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pesquisas_precos_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pesquisas_precos_organizationId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ocorrencias_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ocorrencias_contratoId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_editais_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_editais_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_editais_termoReferenciaId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_termos_referencia_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_termos_referencia_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_termos_referencia_etpId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_medicoes_contrato_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medicoes_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_medicoes_fiscalResponsavelId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medicoes_contratoId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contratos_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contratos_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contratos_createdById"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contratos_fiscalResponsavelId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contratos_gestorResponsavelId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contratos_organizationId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contratos_editalId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_templateId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_organizationId"`);

    console.log('✅ Dropped 22 performance indexes');
  }
}
