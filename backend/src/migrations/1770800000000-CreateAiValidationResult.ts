import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create ai_validation_results table
 * Issue #1291 - [IA] Validação automática similar ao ALICE/TCU
 */
export class CreateAiValidationResult1770800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_validation_results',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'editalId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'irregularityType',
            type: 'enum',
            enum: [
              'SUPERFATURAMENTO',
              'DIRECIONAMENTO',
              'VINCULOS_SOCIETARIOS',
              'FRACIONAMENTO',
              'PADROES_PRECO',
              'ESPECIFICACAO_RESTRITIVA',
              'PRAZO_INADEQUADO',
              'AUSENCIA_JUSTIFICATIVA',
              'DISPENSA_IRREGULAR',
              'VALOR_INCOMPATIVEL',
            ],
          },
          {
            name: 'severityLevel',
            type: 'enum',
            enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'PENDING',
              'ACKNOWLEDGED',
              'RESOLVED',
              'FALSE_POSITIVE',
              'ACCEPTED_RISK',
            ],
            default: "'PENDING'",
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'evidence',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'recommendation',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidenceScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'affectedField',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'affectedValue',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'legalReference',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'acknowledgedBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'acknowledgedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'acknowledgeNote',
            type: 'text',
            isNullable: true,
          },
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
            name: 'FK_ai_validation_etp',
            columnNames: ['etpId'],
            referencedTableName: 'etp',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_ai_validation_edital',
            columnNames: ['editalId'],
            referencedTableName: 'edital',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_etp_created',
        columnNames: ['etpId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_edital_created',
        columnNames: ['editalId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_type_severity',
        columnNames: ['irregularityType', 'severityLevel'],
      }),
    );

    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_status_severity',
        columnNames: ['status', 'severityLevel'],
      }),
    );

    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_etpId',
        columnNames: ['etpId'],
      }),
    );

    await queryRunner.createIndex(
      'ai_validation_results',
      new TableIndex({
        name: 'IDX_ai_validation_editalId',
        columnNames: ['editalId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_validation_results', true);
  }
}
