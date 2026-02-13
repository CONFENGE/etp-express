import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: TD-009.2 - Multi-tenancy Completion & GIN Indexes
 *
 * Technical Debt: DB-NEW-07, DB-NEW-08, DB-P02
 * Story: TD-009.2 (P3 Code Quality)
 * Depends on: TD00911SchemaCleanup1770900000000
 *
 * Changes:
 * 1. DB-NEW-07: Add organizationId to medicoes and ocorrencias
 *    (with backfill from parent contrato)
 * 2. DB-NEW-08: Inverse relations - TypeScript-only, no schema change
 * 3. DB-P02: GIN indexes on JSONB fields (etps.metadata,
 *    etps.dynamic_fields, contract_prices.metadata)
 *
 * Rollback: Safe - drops columns and indexes
 */
export class TD00912MultiTenancyIndexes1770950000000 implements MigrationInterface {
  name = 'TD00912MultiTenancyIndexes1770950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. DB-NEW-07: Add organizationId to medicoes
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "medicoes"
      ADD COLUMN "organizationId" UUID
    `);

    // Backfill from parent contrato
    await queryRunner.query(`
      UPDATE "medicoes" m
      SET "organizationId" = c."organizationId"
      FROM "contratos" c
      WHERE m."contratoId" = c.id
        AND m."organizationId" IS NULL
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "medicoes"
      ADD CONSTRAINT "FK_medicoes_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    // Add index for tenant queries
    await queryRunner.query(`
      CREATE INDEX "idx_medicao_organization_id"
      ON "medicoes"("organizationId")
    `);

    // ==================================================
    // 2. DB-NEW-07: Add organizationId to ocorrencias
    // ==================================================
    await queryRunner.query(`
      ALTER TABLE "ocorrencias"
      ADD COLUMN "organizationId" UUID
    `);

    // Backfill from parent contrato
    await queryRunner.query(`
      UPDATE "ocorrencias" o
      SET "organizationId" = c."organizationId"
      FROM "contratos" c
      WHERE o."contratoId" = c.id
        AND o."organizationId" IS NULL
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "ocorrencias"
      ADD CONSTRAINT "FK_ocorrencias_organizationId"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    // Add index for tenant queries
    await queryRunner.query(`
      CREATE INDEX "idx_ocorrencia_organization_id"
      ON "ocorrencias"("organizationId")
    `);

    // ==================================================
    // 3. DB-NEW-08: Inverse relations - no schema change
    //    (TypeORM metadata only)
    // ==================================================

    // ==================================================
    // 4. DB-P02: GIN indexes on JSONB fields
    // ==================================================

    // GIN index on etps.metadata
    await queryRunner.query(`
      CREATE INDEX "IDX_etps_metadata_gin"
      ON "etps" USING GIN ("metadata")
    `);

    // GIN index on etps.dynamicFields
    await queryRunner.query(`
      CREATE INDEX "IDX_etps_dynamic_fields_gin"
      ON "etps" USING GIN ("dynamicFields")
    `);

    // GIN index on contract_prices.metadata
    await queryRunner.query(`
      CREATE INDEX "IDX_contract_prices_metadata_gin"
      ON "contract_prices" USING GIN ("metadata")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 4. DB-P02: Drop GIN indexes
    // ==================================================
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contract_prices_metadata_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_etps_dynamic_fields_gin"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_etps_metadata_gin"`);

    // ==================================================
    // 2. DB-NEW-07: Drop organizationId from ocorrencias
    // ==================================================
    await queryRunner.query(
      `ALTER TABLE "ocorrencias" DROP CONSTRAINT IF EXISTS "FK_ocorrencias_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_ocorrencia_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ocorrencias" DROP COLUMN IF EXISTS "organizationId"`,
    );

    // ==================================================
    // 1. DB-NEW-07: Drop organizationId from medicoes
    // ==================================================
    await queryRunner.query(
      `ALTER TABLE "medicoes" DROP CONSTRAINT IF EXISTS "FK_medicoes_organizationId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_medicao_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicoes" DROP COLUMN IF EXISTS "organizationId"`,
    );
  }
}
