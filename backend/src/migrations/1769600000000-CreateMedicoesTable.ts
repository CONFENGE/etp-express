import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create medicoes table for Contract Execution Measurement module.
 *
 * @description
 * Creates table for storing Medicao (Contract Measurement):
 * - medicoes: Measurements of contract execution progress
 *
 * Features:
 * - Link to Contrato (contract being measured)
 * - Sequential numbering per contract
 * - Measurement period tracking
 * - Value tracking for executed services/deliveries
 * - Approval workflow (pending → approved/rejected)
 * - Inspector assignment for attestation
 * - Audit trail for measurement changes
 *
 * @see Issue #1641 - [FISC-1286a] Create Medicao entity and CRUD endpoints
 * @see Issue #1286 - [Contratos-c] Módulo de fiscalização
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 */
export class CreateMedicoesTable1769600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for medicao status
    await queryRunner.query(`
      CREATE TYPE "medicao_status_enum" AS ENUM (
        'pendente',
        'aprovada',
        'rejeitada'
      )
    `);

    // Create medicoes table
    await queryRunner.createTable(
      new Table({
        name: 'medicoes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Relationship with Contrato
          {
            name: 'contratoId',
            type: 'uuid',
            isNullable: false,
          },
          // Sequential number per contract
          {
            name: 'numero',
            type: 'int',
            isNullable: false,
          },
          // Measurement period
          {
            name: 'periodoInicio',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'periodoFim',
            type: 'date',
            isNullable: false,
          },
          // Measured value
          {
            name: 'valorMedido',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          // Description and observations
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          // Status and approval
          {
            name: 'status',
            type: 'medicao_status_enum',
            default: "'pendente'",
            isNullable: false,
          },
          {
            name: 'fiscalResponsavelId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dataAteste',
            type: 'timestamp',
            isNullable: true,
          },
          // Audit
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndices('medicoes', [
      new TableIndex({
        name: 'IDX_medicoes_contrato_id',
        columnNames: ['contratoId'],
      }),
      new TableIndex({
        name: 'IDX_medicoes_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'IDX_medicoes_fiscal_responsavel',
        columnNames: ['fiscalResponsavelId'],
      }),
      new TableIndex({
        name: 'IDX_medicoes_periodo',
        columnNames: ['periodoInicio', 'periodoFim'],
      }),
      // Unique constraint: contract + sequence number
      new TableIndex({
        name: 'UQ_medicoes_contrato_numero',
        columnNames: ['contratoId', 'numero'],
        isUnique: true,
      }),
    ]);

    // Create foreign keys
    await queryRunner.createForeignKeys('medicoes', [
      new TableForeignKey({
        name: 'FK_medicoes_contrato',
        columnNames: ['contratoId'],
        referencedTableName: 'contratos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_medicoes_fiscal_responsavel',
        columnNames: ['fiscalResponsavelId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_medicoes_created_by',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('medicoes', 'FK_medicoes_created_by');
    await queryRunner.dropForeignKey(
      'medicoes',
      'FK_medicoes_fiscal_responsavel',
    );
    await queryRunner.dropForeignKey('medicoes', 'FK_medicoes_contrato');

    // Drop table
    await queryRunner.dropTable('medicoes');

    // Drop enum
    await queryRunner.query(`DROP TYPE "medicao_status_enum"`);
  }
}
