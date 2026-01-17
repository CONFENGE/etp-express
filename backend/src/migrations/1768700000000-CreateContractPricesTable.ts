import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create contract_prices table for storing homologated procurement prices.
 *
 * This table stores real/homologated prices from completed public procurements,
 * enabling Market Intelligence features (M13):
 * - Regional price benchmarks
 * - Overprice alerts vs historical data
 * - Price trend analysis
 *
 * Data Sources:
 * - PNCP (Portal Nacional de Contratações Públicas) - Lei 14.133/2021
 * - Compras.gov.br (SIASG) - Federal procurement system
 *
 * Changes:
 * 1. Create contract_price_modalidade_enum and contract_price_fonte_enum types
 * 2. Create contract_prices table with all columns
 * 3. Create indexes for common query patterns
 * 4. Create compound indexes for optimization
 * 5. Create foreign key to organizations table
 *
 * Related Issues:
 * - #1269: Contract Price Collector (M13: Market Intelligence)
 * - #1270: Price normalization and categorization
 * - #1271: Regional benchmark engine
 */
export class CreateContractPricesTable1768700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists (idempotency)
    const tableExists = await queryRunner.hasTable('contract_prices');

    if (!tableExists) {
      // Step 1: Create enums
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "contract_price_modalidade_enum" AS ENUM (
            'PREGAO_ELETRONICO',
            'PREGAO_PRESENCIAL',
            'CONCORRENCIA',
            'DISPENSA',
            'INEXIGIBILIDADE',
            'LEILAO',
            'DIALOGO_COMPETITIVO',
            'CONCURSO',
            'CREDENCIAMENTO',
            'OUTROS'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "contract_price_fonte_enum" AS ENUM (
            'PNCP',
            'COMPRASGOV'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Step 2: Create contract_prices table
      await queryRunner.query(`
        CREATE TABLE "contract_prices" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "organizationId" UUID NULL,
          "codigoItem" VARCHAR(100) NOT NULL,
          "descricao" TEXT NOT NULL,
          "unidade" VARCHAR(50) NOT NULL,
          "precoUnitario" DECIMAL(15,2) NOT NULL,
          "quantidade" DECIMAL(15,2) NOT NULL,
          "valorTotal" DECIMAL(15,2) NOT NULL,
          "dataHomologacao" DATE NOT NULL,
          "modalidade" "contract_price_modalidade_enum" NOT NULL DEFAULT 'OUTROS',
          "fonte" "contract_price_fonte_enum" NOT NULL DEFAULT 'PNCP',
          "externalId" VARCHAR(100) NOT NULL,
          "uasgCodigo" VARCHAR(20) NULL,
          "uasgNome" VARCHAR(500) NOT NULL,
          "uf" CHAR(2) NOT NULL,
          "municipio" VARCHAR(200) NULL,
          "cnpjFornecedor" VARCHAR(14) NULL,
          "razaoSocial" VARCHAR(500) NULL,
          "numeroProcesso" VARCHAR(100) NULL,
          "urlOrigem" TEXT NULL,
          "metadata" JSONB NULL,
          "fetchedAt" TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }

    // Step 3: Create foreign key to organizations table (idempotent)
    const table = await queryRunner.getTable('contract_prices');
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_contract_prices_organization',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
        ALTER TABLE "contract_prices"
        ADD CONSTRAINT "FK_contract_prices_organization"
        FOREIGN KEY ("organizationId")
        REFERENCES "organizations"("id")
        ON DELETE SET NULL
      `);
    }

    // Step 4: Create simple indexes (idempotent)
    const indexes = [
      {
        name: 'IDX_contract_prices_organizationId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_organizationId" ON "contract_prices" ("organizationId")',
      },
      {
        name: 'IDX_contract_prices_codigoItem',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_codigoItem" ON "contract_prices" ("codigoItem")',
      },
      {
        name: 'IDX_contract_prices_uf',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_uf" ON "contract_prices" ("uf")',
      },
      {
        name: 'IDX_contract_prices_modalidade',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_modalidade" ON "contract_prices" ("modalidade")',
      },
      {
        name: 'IDX_contract_prices_fonte',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_fonte" ON "contract_prices" ("fonte")',
      },
      {
        name: 'IDX_contract_prices_dataHomologacao',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_dataHomologacao" ON "contract_prices" ("dataHomologacao")',
      },
      {
        name: 'IDX_contract_prices_externalId',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_externalId" ON "contract_prices" ("externalId")',
      },
      {
        name: 'IDX_contract_prices_cnpjFornecedor',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_cnpjFornecedor" ON "contract_prices" ("cnpjFornecedor")',
      },
      {
        name: 'IDX_contract_prices_numeroProcesso',
        sql: 'CREATE INDEX IF NOT EXISTS "IDX_contract_prices_numeroProcesso" ON "contract_prices" ("numeroProcesso")',
      },
    ];

    for (const index of indexes) {
      await queryRunner.query(index.sql);
    }

    // Step 5: Create compound indexes (idempotent)
    // Most common query pattern: filter by organization + sort by createdAt
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contract_prices_organization_createdAt"
      ON "contract_prices" ("organizationId", "createdAt")
    `);

    // Regional price analysis: UF + dataHomologacao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contract_prices_uf_dataHomologacao"
      ON "contract_prices" ("uf", "dataHomologacao")
    `);

    // Item price lookup: codigoItem + dataHomologacao (for historical analysis)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contract_prices_item_date"
      ON "contract_prices" ("codigoItem", "dataHomologacao")
    `);

    // Deduplication check: externalId + fonte
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_contract_prices_unique_external"
      ON "contract_prices" ("externalId", "fonte")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback Step 5: Drop compound indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_unique_external"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_item_date"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_uf_dataHomologacao"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_organization_createdAt"
    `);

    // Rollback Step 4: Drop simple indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_numeroProcesso"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_cnpjFornecedor"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_externalId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_dataHomologacao"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_fonte"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_modalidade"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_uf"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_codigoItem"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contract_prices_organizationId"
    `);

    // Rollback Step 3: Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "contract_prices"
      DROP CONSTRAINT IF EXISTS "FK_contract_prices_organization"
    `);

    // Rollback Step 2: Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "contract_prices"
    `);

    // Rollback Step 1: Drop enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS "contract_price_fonte_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "contract_price_modalidade_enum"
    `);
  }
}
