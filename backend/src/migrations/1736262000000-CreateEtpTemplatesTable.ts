import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create etp_templates table.
 *
 * @description
 * Creates table for pre-configured ETP templates by contract type:
 * - OBRAS (Civil Engineering)
 * - TI (IT/Software)
 * - SERVICOS (Continuous Services)
 * - MATERIAIS (Materials/Goods)
 *
 * Each template defines:
 * - Required and optional fields for the type
 * - Default sections to include
 * - AI prompts specific to each section
 * - Legal references and preferred price sources
 *
 * @see Issue #1235 - [TMPL-1161a] Create EtpTemplate entity and module structure
 * @see Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
export class CreateEtpTemplatesTable1736262000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for template types
    await queryRunner.query(`
      CREATE TYPE "etp_template_type_enum" AS ENUM ('OBRAS', 'TI', 'SERVICOS', 'MATERIAIS')
    `);

    // Create etp_templates table
    await queryRunner.createTable(
      new Table({
        name: 'etp_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'etp_template_type_enum',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'requiredFields',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'optionalFields',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'defaultSections',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'prompts',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'legalReferences',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'priceSourcesPreferred',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index on type for filtering by contract type
    await queryRunner.createIndex(
      'etp_templates',
      new TableIndex({
        name: 'IDX_etp_templates_type',
        columnNames: ['type'],
      }),
    );

    // Create index on isActive for filtering active templates
    await queryRunner.createIndex(
      'etp_templates',
      new TableIndex({
        name: 'IDX_etp_templates_isActive',
        columnNames: ['isActive'],
      }),
    );

    // Create composite index for common query pattern
    await queryRunner.createIndex(
      'etp_templates',
      new TableIndex({
        name: 'IDX_etp_templates_type_isActive',
        columnNames: ['type', 'isActive'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'etp_templates',
      'IDX_etp_templates_type_isActive',
    );
    await queryRunner.dropIndex('etp_templates', 'IDX_etp_templates_isActive');
    await queryRunner.dropIndex('etp_templates', 'IDX_etp_templates_type');

    // Drop table
    await queryRunner.dropTable('etp_templates');

    // Drop enum type
    await queryRunner.query('DROP TYPE "etp_template_type_enum"');
  }
}
