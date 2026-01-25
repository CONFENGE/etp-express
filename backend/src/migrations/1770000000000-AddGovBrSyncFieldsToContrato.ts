import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add Gov.br sync fields to Contrato entity
 *
 * Issue: #1675 - Implementar sincronização Push de contratos
 * Parent Issue: #1289 - Integração com Contratos Gov.br
 *
 * Adds fields to track synchronization status with Contratos.gov.br API:
 * - govBrId: External ID from Gov.br system
 * - govBrSyncedAt: Last successful sync timestamp
 * - govBrSyncStatus: Current sync status (pending/synced/error)
 * - govBrSyncErrorMessage: Error details when sync fails
 */
export class AddGovBrSyncFieldsToContrato1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'contratos',
      new TableColumn({
        name: 'govBrId',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'ID do contrato no sistema Contratos.gov.br',
      }),
    );

    await queryRunner.addColumn(
      'contratos',
      new TableColumn({
        name: 'govBrSyncedAt',
        type: 'timestamp',
        isNullable: true,
        comment: 'Timestamp da última sincronização com Gov.br',
      }),
    );

    await queryRunner.addColumn(
      'contratos',
      new TableColumn({
        name: 'govBrSyncStatus',
        type: 'enum',
        enum: ['pending', 'synced', 'error'],
        default: "'pending'",
        comment:
          'Status de sincronização: pending (aguardando), synced (sincronizado), error (erro)',
      }),
    );

    await queryRunner.addColumn(
      'contratos',
      new TableColumn({
        name: 'govBrSyncErrorMessage',
        type: 'text',
        isNullable: true,
        comment: 'Mensagem de erro da última tentativa de sincronização',
      }),
    );

    // Create index on govBrId for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_contrato_govBrId" ON "contratos" ("govBrId")`,
    );

    // Create index on govBrSyncStatus for filtering contracts by sync status
    await queryRunner.query(
      `CREATE INDEX "IDX_contrato_govBrSyncStatus" ON "contratos" ("govBrSyncStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_contrato_govBrSyncStatus"`);
    await queryRunner.query(`DROP INDEX "IDX_contrato_govBrId"`);

    // Drop columns
    await queryRunner.dropColumn('contratos', 'govBrSyncErrorMessage');
    await queryRunner.dropColumn('contratos', 'govBrSyncStatus');
    await queryRunner.dropColumn('contratos', 'govBrSyncedAt');
    await queryRunner.dropColumn('contratos', 'govBrId');
  }
}
