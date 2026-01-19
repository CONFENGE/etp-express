import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create price_benchmarks table
 *
 * This table stores aggregated regional price statistics for market intelligence.
 *
 * Features:
 * - Regional segmentation by state (27 UFs + BR national)
 * - Organization size segmentation (small/medium/large)
 * - Statistical measures: mean, median, percentiles, stddev
 * - Unique constraint on (categoryId, uf, orgaoPorte)
 *
 * Part of M13: Market Intelligence
 * Issue: #1271 - [Analytics-c] Motor de benchmark regional
 */
export class CreatePriceBenchmarksTable1769100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create OrgaoPorte enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "orgao_porte_enum" AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE', 'TODOS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create price_benchmarks table
    await queryRunner.createTable(
      new Table({
        name: 'price_benchmarks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'uf',
            type: 'char',
            length: '2',
            isNullable: false,
            comment: 'Brazilian state (2-letter code) or BR for national',
          },
          {
            name: 'orgaoPorte',
            type: 'orgao_porte_enum',
            default: "'TODOS'",
            comment: 'Organization size: PEQUENO, MEDIO, GRANDE, TODOS',
          },
          // Statistical measures
          {
            name: 'avgPrice',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: 'Average (mean) price',
          },
          {
            name: 'medianPrice',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: 'Median price (50th percentile)',
          },
          {
            name: 'minPrice',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: 'Minimum price in sample',
          },
          {
            name: 'maxPrice',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: 'Maximum price in sample',
          },
          {
            name: 'p25',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: '25th percentile (Q1)',
          },
          {
            name: 'p75',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: '75th percentile (Q3)',
          },
          {
            name: 'stdDev',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
            comment: 'Standard deviation',
          },
          {
            name: 'sampleCount',
            type: 'int',
            isNullable: false,
            comment: 'Number of price samples used in calculation',
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: 'Normalized unit of measurement',
          },
          // Period information
          {
            name: 'periodStart',
            type: 'date',
            isNullable: false,
            comment: 'Start of analysis period',
          },
          {
            name: 'periodEnd',
            type: 'date',
            isNullable: false,
            comment: 'End of analysis period',
          },
          {
            name: 'calculatedAt',
            type: 'timestamp',
            isNullable: false,
            comment: 'When benchmark was last calculated',
          },
          // Timestamps
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_price_benchmarks_category',
            columnNames: ['categoryId'],
            referencedTableName: 'item_categories',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true, // ifNotExists
    );

    // Create unique constraint on (categoryId, uf, orgaoPorte)
    await queryRunner.createIndex(
      'price_benchmarks',
      new TableIndex({
        name: 'UQ_price_benchmarks_category_uf_porte',
        columnNames: ['categoryId', 'uf', 'orgaoPorte'],
        isUnique: true,
      }),
    );

    // Create index on categoryId for FK queries
    await queryRunner.createIndex(
      'price_benchmarks',
      new TableIndex({
        name: 'IDX_price_benchmarks_categoryId',
        columnNames: ['categoryId'],
      }),
    );

    // Create index on uf for regional queries
    await queryRunner.createIndex(
      'price_benchmarks',
      new TableIndex({
        name: 'IDX_price_benchmarks_uf',
        columnNames: ['uf'],
      }),
    );

    // Create index on calculatedAt for freshness queries
    await queryRunner.createIndex(
      'price_benchmarks',
      new TableIndex({
        name: 'IDX_price_benchmarks_calculatedAt',
        columnNames: ['calculatedAt'],
      }),
    );

    // Create trigger for updatedAt
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_price_benchmarks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS price_benchmarks_updated_at_trigger ON price_benchmarks;

      CREATE TRIGGER price_benchmarks_updated_at_trigger
      BEFORE UPDATE ON price_benchmarks
      FOR EACH ROW
      EXECUTE FUNCTION update_price_benchmarks_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS price_benchmarks_updated_at_trigger ON price_benchmarks;
      DROP FUNCTION IF EXISTS update_price_benchmarks_updated_at();
    `);

    // Drop table (indexes and foreign keys are dropped automatically)
    await queryRunner.dropTable('price_benchmarks', true);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "orgao_porte_enum";`);
  }
}
