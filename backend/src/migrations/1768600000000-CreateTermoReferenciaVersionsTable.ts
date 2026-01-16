import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

/**
 * Migration to create termo_referencia_versions table and add currentVersion field.
 *
 * @description
 * Creates table for storing TR version snapshots and adds currentVersion column to termos_referencia:
 * - termo_referencia_versions: Historical snapshots of TR documents
 *
 * Features:
 * - Version snapshots linked to parent TR (1:N relationship)
 * - Complete snapshot of all TR fields in JSONB
 * - Change log for audit trail
 * - Cascade delete when TR is deleted
 *
 * @see Issue #1253 - [TR-f] Versionamento e historico de TR
 * @see Issue #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export class CreateTermoReferenciaVersionsTable1768600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add currentVersion column to termos_referencia table
    await queryRunner.addColumn(
      'termos_referencia',
      new TableColumn({
        name: 'currentVersion',
        type: 'int',
        default: 1,
        isNullable: false,
      }),
    );

    // Create termo_referencia_versions table
    await queryRunner.createTable(
      new Table({
        name: 'termo_referencia_versions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Version number
          {
            name: 'versionNumber',
            type: 'int',
            isNullable: false,
          },
          // Snapshot of TR at this version
          {
            name: 'snapshot',
            type: 'jsonb',
            isNullable: false,
          },
          // Change description
          {
            name: 'changeLog',
            type: 'text',
            isNullable: true,
          },
          // User who created this version (denormalized for audit)
          {
            name: 'createdByName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Relationship with TR
          {
            name: 'termo_referencia_id',
            type: 'uuid',
            isNullable: false,
          },
          // Timestamp
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key for TR relationship
    await queryRunner.createForeignKey(
      'termo_referencia_versions',
      new TableForeignKey({
        name: 'FK_tr_versions_termo_referencia',
        columnNames: ['termo_referencia_id'],
        referencedTableName: 'termos_referencia',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for TR + version queries
    await queryRunner.createIndex(
      'termo_referencia_versions',
      new TableIndex({
        name: 'IDX_tr_versions_tr_id',
        columnNames: ['termo_referencia_id'],
      }),
    );

    // Create composite index for efficient version lookup
    await queryRunner.createIndex(
      'termo_referencia_versions',
      new TableIndex({
        name: 'IDX_tr_versions_tr_id_version',
        columnNames: ['termo_referencia_id', 'versionNumber'],
        isUnique: true,
      }),
    );

    // Create index for version number ordering
    await queryRunner.createIndex(
      'termo_referencia_versions',
      new TableIndex({
        name: 'IDX_tr_versions_version_number',
        columnNames: ['versionNumber'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'termo_referencia_versions',
      'IDX_tr_versions_version_number',
    );
    await queryRunner.dropIndex(
      'termo_referencia_versions',
      'IDX_tr_versions_tr_id_version',
    );
    await queryRunner.dropIndex(
      'termo_referencia_versions',
      'IDX_tr_versions_tr_id',
    );

    // Drop foreign key
    await queryRunner.dropForeignKey(
      'termo_referencia_versions',
      'FK_tr_versions_termo_referencia',
    );

    // Drop table
    await queryRunner.dropTable('termo_referencia_versions');

    // Remove currentVersion column from termos_referencia
    await queryRunner.dropColumn('termos_referencia', 'currentVersion');
  }
}
