import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateApiUsage
 *
 * Creates the api_usage table for tracking Market Intelligence API usage.
 * Includes indexes for efficient querying by user, date, and endpoint.
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1688 - Criar ApiUsage entity e tracking de métricas
 *
 * @author ETP Express Team
 * @since 2026-01-25
 */
export class CreateApiUsage1769387438290 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_usage table
    await queryRunner.createTable(
      new Table({
        name: 'api_usage',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'method',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'statusCode',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'responseTime',
            type: 'int',
            isNullable: false,
            comment: 'Response time in milliseconds',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'quota',
            type: 'int',
            default: 1,
            isNullable: false,
            comment: 'Quota consumed by this request',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'api_usage',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index on userId for efficient user-based queries
    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_userId',
        columnNames: ['userId'],
      }),
    );

    // Create composite index on userId and createdAt for time-series queries
    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    // Create index on createdAt for date-based queries
    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Create index on endpoint for endpoint-based analytics
    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_endpoint',
        columnNames: ['endpoint'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('api_usage', 'IDX_api_usage_endpoint');
    await queryRunner.dropIndex('api_usage', 'IDX_api_usage_createdAt');
    await queryRunner.dropIndex('api_usage', 'IDX_api_usage_userId_createdAt');
    await queryRunner.dropIndex('api_usage', 'IDX_api_usage_userId');

    // Drop foreign key
    const table = await queryRunner.getTable('api_usage');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('api_usage', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('api_usage');
  }
}
