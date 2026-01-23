import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create atestes table for Measurement Attestation module.
 *
 * @description
 * Creates table for storing Ateste (Measurement Attestation):
 * - atestes: Formal approval/rejection of contract measurements by inspector
 *
 * Features:
 * - OneToOne relationship with Medicao (each measurement has max one attestation)
 * - Inspector assignment (fiscal responsible)
 * - Attestation result (approved / approved with reservations / rejected)
 * - Mandatory justification for rejections/reservations
 * - Optional adjusted value (when approved with reservations)
 * - Attestation date tracking
 * - Workflow: Measurement created → Inspector attests → Payment released
 *
 * Business Rules:
 * - Only the responsible inspector can attest
 * - Justification mandatory for REJEITADO or APROVADO_COM_RESSALVAS
 * - valorAtestado cannot exceed valorMedido from Medicao
 * - Each Medicao can have at most one Ateste (unique constraint)
 * - Already attested Medicao cannot be re-attested
 *
 * @see Issue #1643 - [FISC-1286c] Create Ateste entity and approval workflow
 * @see Issue #1286 - [Contratos-c] Módulo de fiscalização
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 * @see Lei 14.133/2021 Art. 140 - Execution Attestation
 */
export class CreateAtestesTable1769800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for ateste resultado
    await queryRunner.query(`
      CREATE TYPE "ateste_resultado_enum" AS ENUM (
        'aprovado',
        'aprovado_com_ressalvas',
        'rejeitado'
      )
    `);

    // Create atestes table
    await queryRunner.createTable(
      new Table({
        name: 'atestes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Relationship with Medicao (1:1)
          {
            name: 'medicaoId',
            type: 'uuid',
            isNullable: false,
            isUnique: true, // OneToOne constraint
          },
          // Responsible Inspector
          {
            name: 'fiscalId',
            type: 'uuid',
            isNullable: false,
          },
          // Attestation Result
          {
            name: 'resultado',
            type: 'ateste_resultado_enum',
            isNullable: false,
          },
          {
            name: 'justificativa',
            type: 'text',
            isNullable: true,
            comment:
              'Mandatory for REJEITADO or APROVADO_COM_RESSALVAS results',
          },
          // Adjusted Value (when approved with reservations)
          {
            name: 'valorAtestado',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            comment: 'Applicable when resultado = APROVADO_COM_RESSALVAS',
          },
          // Dates and Observations
          {
            name: 'dataAteste',
            type: 'timestamp',
            isNullable: false,
            comment: 'Formal attestation date',
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          // Audit
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndices('atestes', [
      new TableIndex({
        name: 'IDX_atestes_medicao_id',
        columnNames: ['medicaoId'],
        isUnique: true, // Enforce 1:1 relationship
      }),
      new TableIndex({
        name: 'IDX_atestes_fiscal_id',
        columnNames: ['fiscalId'],
      }),
      new TableIndex({
        name: 'IDX_atestes_resultado',
        columnNames: ['resultado'],
      }),
      new TableIndex({
        name: 'IDX_atestes_data_ateste',
        columnNames: ['dataAteste'],
      }),
    ]);

    // Create foreign keys
    await queryRunner.createForeignKeys('atestes', [
      new TableForeignKey({
        name: 'FK_atestes_medicao',
        columnNames: ['medicaoId'],
        referencedTableName: 'medicoes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_atestes_fiscal',
        columnNames: ['fiscalId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('atestes', 'FK_atestes_fiscal');
    await queryRunner.dropForeignKey('atestes', 'FK_atestes_medicao');

    // Drop table
    await queryRunner.dropTable('atestes');

    // Drop enum
    await queryRunner.query(`DROP TYPE "ateste_resultado_enum"`);
  }
}
