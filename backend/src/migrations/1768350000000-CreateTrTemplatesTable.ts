import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create tr_templates table for TR templates.
 *
 * @description
 * Creates table for storing Termo de Referencia templates:
 * - tr_templates: Pre-configured templates by contract type (Obras, TI, Servicos, Materiais)
 *
 * Features:
 * - Template categorization by contract type
 * - Specific fields configuration per type (JSONB)
 * - AI prompts for section enrichment (JSONB)
 * - Legal references (JSONB)
 * - Default text for common TR sections
 *
 * @see Issue #1250 - [TR-c] Criar templates de TR por categoria
 * @see Issue #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export class CreateTrTemplatesTable1768350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for TR template type (IF NOT EXISTS for idempotency)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tr_template_type_enum" AS ENUM ('OBRAS', 'TI', 'SERVICOS', 'MATERIAIS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tr_templates table
    await queryRunner.createTable(
      new Table({
        name: 'tr_templates',
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
            type: 'tr_template_type_enum',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'specificFields',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'defaultSections',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'prompts',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'legalReferences',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'defaultFundamentacaoLegal',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultModeloExecucao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultModeloGestao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultCriteriosSelecao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultObrigacoesContratante',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultObrigacoesContratada',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultSancoesPenalidades',
            type: 'text',
            isNullable: true,
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

    // Create index for template type filtering
    await queryRunner.createIndex(
      'tr_templates',
      new TableIndex({
        name: 'IDX_tr_templates_type',
        columnNames: ['type'],
      }),
    );

    // Create index for active templates
    await queryRunner.createIndex(
      'tr_templates',
      new TableIndex({
        name: 'IDX_tr_templates_is_active',
        columnNames: ['isActive'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('tr_templates', 'IDX_tr_templates_is_active');
    await queryRunner.dropIndex('tr_templates', 'IDX_tr_templates_type');

    // Drop table
    await queryRunner.dropTable('tr_templates');

    // Drop enum type
    await queryRunner.query('DROP TYPE "tr_template_type_enum"');
  }
}
