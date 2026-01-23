import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create ocorrencias table for Contract Incident Management module.
 *
 * @description
 * Creates table for storing Ocorrencia (Contract Incidents):
 * - ocorrencias: Incidents, failures, and delays in contract execution
 *
 * Features:
 * - Link to Contrato (contract where incident occurred)
 * - Incident classification by type (atraso, falha, inadimplencia, outro)
 * - Severity levels (baixa, media, alta, critica)
 * - Detailed description with minimum 20 characters validation
 * - Corrective action tracking (mandatory for CRITICAL severity)
 * - Resolution deadline tracking
 * - Status workflow (aberta → em_analise → resolvida/cancelada)
 * - User assignment for incident reporting
 * - Audit trail for compliance
 *
 * @see Issue #1642 - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 * @see Issue #1286 - [Contratos-c] Módulo de fiscalização
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 * @see Lei 14.133/2021 Art. 156 - Administrative Sanctions
 */
export class CreateOcorrenciasTable1769700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for ocorrencia tipo
    await queryRunner.query(`
      CREATE TYPE "ocorrencia_tipo_enum" AS ENUM (
        'atraso',
        'falha',
        'inadimplencia',
        'outro'
      )
    `);

    // Create enum for ocorrencia gravidade
    await queryRunner.query(`
      CREATE TYPE "ocorrencia_gravidade_enum" AS ENUM (
        'baixa',
        'media',
        'alta',
        'critica'
      )
    `);

    // Create enum for ocorrencia status
    await queryRunner.query(`
      CREATE TYPE "ocorrencia_status_enum" AS ENUM (
        'aberta',
        'em_analise',
        'resolvida',
        'cancelada'
      )
    `);

    // Create ocorrencias table
    await queryRunner.createTable(
      new Table({
        name: 'ocorrencias',
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
          // Classification
          {
            name: 'tipo',
            type: 'ocorrencia_tipo_enum',
            isNullable: false,
          },
          {
            name: 'gravidade',
            type: 'ocorrencia_gravidade_enum',
            isNullable: false,
          },
          {
            name: 'dataOcorrencia',
            type: 'date',
            isNullable: false,
          },
          // Description and corrective action
          {
            name: 'descricao',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'acaoCorretiva',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prazoResolucao',
            type: 'date',
            isNullable: true,
          },
          // Status
          {
            name: 'status',
            type: 'ocorrencia_status_enum',
            default: "'aberta'",
            isNullable: false,
          },
          // Responsibility
          {
            name: 'registradoPorId',
            type: 'uuid',
            isNullable: false,
          },
          // Audit
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
    await queryRunner.createIndices('ocorrencias', [
      new TableIndex({
        name: 'IDX_ocorrencias_contrato_id',
        columnNames: ['contratoId'],
      }),
      new TableIndex({
        name: 'IDX_ocorrencias_tipo',
        columnNames: ['tipo'],
      }),
      new TableIndex({
        name: 'IDX_ocorrencias_gravidade',
        columnNames: ['gravidade'],
      }),
      new TableIndex({
        name: 'IDX_ocorrencias_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'IDX_ocorrencias_registrado_por',
        columnNames: ['registradoPorId'],
      }),
      new TableIndex({
        name: 'IDX_ocorrencias_data',
        columnNames: ['dataOcorrencia'],
      }),
      // Composite index for filtering critical open incidents
      new TableIndex({
        name: 'IDX_ocorrencias_gravidade_status',
        columnNames: ['gravidade', 'status'],
      }),
    ]);

    // Create foreign keys
    await queryRunner.createForeignKeys('ocorrencias', [
      new TableForeignKey({
        name: 'FK_ocorrencias_contrato',
        columnNames: ['contratoId'],
        referencedTableName: 'contratos',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_ocorrencias_registrado_por',
        columnNames: ['registradoPorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'ocorrencias',
      'FK_ocorrencias_registrado_por',
    );
    await queryRunner.dropForeignKey('ocorrencias', 'FK_ocorrencias_contrato');

    // Drop table
    await queryRunner.dropTable('ocorrencias');

    // Drop enums
    await queryRunner.query(`DROP TYPE "ocorrencia_status_enum"`);
    await queryRunner.query(`DROP TYPE "ocorrencia_gravidade_enum"`);
    await queryRunner.query(`DROP TYPE "ocorrencia_tipo_enum"`);
  }
}
