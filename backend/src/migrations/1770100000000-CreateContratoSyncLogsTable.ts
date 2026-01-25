import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: Create contrato_sync_logs table
 *
 * Issue: #1677 - Implementar tratamento de conflitos de sincronização
 * Parent Issue: #1289 - Integração com Contratos Gov.br
 *
 * Creates table to log all sync operations and conflict resolutions
 * between local contracts and Contratos.gov.br API.
 */
export class CreateContratoSyncLogsTable1770100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contrato_sync_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'contratoId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['push', 'pull', 'conflict_resolved'],
            isNullable: false,
            comment:
              'Ação de sincronização: push (envio), pull (recebimento), conflict_resolved (conflito resolvido)',
          },
          {
            name: 'conflicts',
            type: 'jsonb',
            isNullable: true,
            comment:
              'Array de conflitos detectados (quando action = conflict_resolved)',
          },
          {
            name: 'resolution',
            type: 'jsonb',
            isNullable: true,
            comment: 'Dados finais aplicados após resolução de conflito',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true, // Enable table creation
    );

    // Add foreign key to contratos table
    await queryRunner.createForeignKey(
      'contrato_sync_logs',
      new TableForeignKey({
        columnNames: ['contratoId'],
        referencedTableName: 'contratos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Delete logs when contract is deleted
        onUpdate: 'CASCADE',
      }),
    );

    // Create index on contratoId for faster lookups
    await queryRunner.query(
      `CREATE INDEX "IDX_contrato_sync_log_contratoId" ON "contrato_sync_logs" ("contratoId")`,
    );

    // Create index on action for filtering by operation type
    await queryRunner.query(
      `CREATE INDEX "IDX_contrato_sync_log_action" ON "contrato_sync_logs" ("action")`,
    );

    // Create index on createdAt for temporal queries
    await queryRunner.query(
      `CREATE INDEX "IDX_contrato_sync_log_createdAt" ON "contrato_sync_logs" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_contrato_sync_log_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_contrato_sync_log_action"`);
    await queryRunner.query(`DROP INDEX "IDX_contrato_sync_log_contratoId"`);

    // Drop foreign key
    const table = await queryRunner.getTable('contrato_sync_logs');
    const foreignKey = table!.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('contratoId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('contrato_sync_logs', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('contrato_sync_logs');
  }
}
